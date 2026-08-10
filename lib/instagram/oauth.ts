import { graphFetch, graphFetchAt } from "./client";
import { getMetaAppId, getMetaAppSecret } from "./config";

interface OAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

// The Instagram API's own long-lived-token refresh lives on a different
// host (graph.instagram.com, not graph.facebook.com) and only applies to
// tokens minted through Instagram Login directly — a Page access token
// from the Facebook Login for Business flow below simply doesn't support
// this endpoint and will 400, which callers should treat as "nothing to
// refresh" rather than a fatal error.
const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com";

export async function refreshLongLivedInstagramToken(token: string): Promise<OAuthTokenResponse> {
  return graphFetchAt<OAuthTokenResponse>(INSTAGRAM_GRAPH_BASE, "/refresh_access_token", {
    grant_type: "ig_refresh_token",
    access_token: token,
  });
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const data = await graphFetch<OAuthTokenResponse>("/oauth/access_token", {
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    redirect_uri: redirectUri,
    code,
  });
  return data.access_token;
}

// Long-lived user tokens last ~60 days. Page access tokens minted from one
// via listPagesWithIgAccounts() below don't carry that expiry in practice,
// which is why sync doesn't need a refresh loop for the token actually
// used to call the Instagram Graph API.
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<OAuthTokenResponse> {
  return graphFetch<OAuthTokenResponse>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    fb_exchange_token: shortLivedToken,
  });
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
}

export async function listPagesWithIgAccounts(userAccessToken: string): Promise<FacebookPage[]> {
  const data = await graphFetch<{ data: FacebookPage[] }>("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userAccessToken,
  });
  return data.data;
}

export interface TokenDebugInfo {
  appId?: string;
  type?: string;
  isValid?: boolean;
  scopes?: string[];
  expiresAt?: number;
}

// Reveals exactly what the OAuth dialog actually granted (token type, app,
// scopes) — the fastest way to tell "wrong permissions" apart from "wrong
// API call" when /me/accounts doesn't return what's expected. Never
// includes the token value itself, only metadata about it.
export async function debugToken(inputToken: string): Promise<TokenDebugInfo> {
  const data = await graphFetch<{
    data: {
      app_id?: string;
      type?: string;
      is_valid?: boolean;
      scopes?: string[];
      expires_at?: number;
    };
  }>("/debug_token", {
    input_token: inputToken,
    access_token: `${getMetaAppId()}|${getMetaAppSecret()}`,
  });
  return {
    appId: data.data.app_id,
    type: data.data.type,
    isValid: data.data.is_valid,
    scopes: data.data.scopes,
    expiresAt: data.data.expires_at,
  };
}

import { graphFetch } from "./client";
import { getMetaAppId, getMetaAppSecret } from "./config";

interface OAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
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

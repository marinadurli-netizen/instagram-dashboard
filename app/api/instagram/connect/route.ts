import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FACEBOOK_OAUTH_DIALOG_URL, getMetaAppId, getMetaConfigId } from "@/lib/instagram/config";

// Not the app's real auth gate (that's a later phase) — just enough to stop
// a random visitor from kicking off our OAuth flow and overwriting the
// single profile row with their own Instagram account.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${request.nextUrl.origin}/api/instagram/callback`;

  const authUrl = new URL(FACEBOOK_OAUTH_DIALOG_URL);
  authUrl.searchParams.set("client_id", getMetaAppId());
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  // Permissions are bundled into this Configuration (App Dashboard >
  // Facebook Login for Business > Configurations) rather than a `scope`
  // param on the dialog URL.
  authUrl.searchParams.set("config_id", getMetaConfigId());
  authUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

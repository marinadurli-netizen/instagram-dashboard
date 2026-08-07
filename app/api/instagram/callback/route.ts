import { NextRequest, NextResponse } from "next/server";
import { upsert } from "@/lib/db/upsert";
import { exchangeCodeForToken, exchangeForLongLivedToken, listPagesWithIgAccounts } from "@/lib/instagram/oauth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return await handleCallback(request);
  } catch (err) {
    // An unhandled error here would otherwise surface as an opaque platform
    // 500 page. Never includes a token — GraphApiError/pg errors don't
    // carry bound values, only messages/codes.
    const error = err as Error;
    console.error("IG connect callback crashed:", error);
    return NextResponse.json({ error: `${error.name}: ${error.message}` }, { status: 500 });
  }
}

async function handleCallback(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("ig_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.json({ error: "Invalid or expired OAuth state" }, { status: 400 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/instagram/callback`;

  const shortLivedToken = await exchangeCodeForToken(code, redirectUri);
  const longLived = await exchangeForLongLivedToken(shortLivedToken);
  const pages = await listPagesWithIgAccounts(longLived.access_token);

  const connectable = pages.filter((p) => p.instagram_business_account);
  if (connectable.length === 0) {
    console.error(
      "IG connect failed: no page with instagram_business_account",
      pages.map((p) => ({ id: p.id, name: p.name })),
    );
    return NextResponse.json(
      {
        error:
          "No Facebook Page with a linked Instagram Business account was found. " +
          "Link your Instagram account to the Page in Instagram settings, then try again.",
      },
      { status: 400 },
    );
  }

  // Personal, single-account app: take the first connectable Page. If you
  // ever manage multiple Pages/IG accounts, this is the place to add a
  // selection step instead of picking [0].
  const page = connectable[0]!;
  const ig = page.instagram_business_account!;

  await upsert({
    table: "profile",
    conflictColumns: ["id"],
    values: {
      id: 1,
      handle: ig.username ?? "unknown",
      instagram_account_id: ig.id,
      instagram_access_token: page.access_token,
      instagram_token_expires_at: null,
      facebook_page_id: page.id,
    },
  });

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete("ig_oauth_state");
  return response;
}

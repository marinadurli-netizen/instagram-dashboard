import { NextRequest, NextResponse } from "next/server";
import { sync } from "@/lib/instagram/sync";

// Vercel Cron signs requests with `Authorization: Bearer ${CRON_SECRET}`
// when CRON_SECRET is set on the project. A `?secret=` query param is also
// accepted so this can be triggered manually from a browser (no way to set
// a custom header by just visiting a URL) — same stopgap pattern as
// /api/instagram/connect's ADMIN_SECRET.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  const secretParam = request.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  const authorized = !!expected && (auth === `Bearer ${expected}` || secretParam === expected);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await sync();
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Cron sync failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// `npm run sync` locally is the preferred path for a large full-history
// backfill (no function time limit there), but this route can also do it —
// give it room on plans that allow it. If a very large history times out
// here, fall back to running it locally.
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { sync } from "@/lib/instagram/sync";

// Vercel Cron signs requests with `Authorization: Bearer ${CRON_SECRET}`
// when CRON_SECRET is set on the project — verify it so this endpoint can't
// be triggered by anyone who finds the URL.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
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

// Full-history backfills should run via `npm run sync` locally; this route
// is for the daily incremental sync, but give it room on plans that allow it.
export const maxDuration = 60;

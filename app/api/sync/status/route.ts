import { NextResponse } from "next/server";
import { getProfile } from "@/lib/db/profile";

// Never statically optimized — every poll must hit the live row, not a
// build-time snapshot.
export const dynamic = "force-dynamic";

// Polled by the dashboard's "Sync now" button — deliberately just reads
// last_synced_at rather than tracking a separate "is a sync running" flag,
// since "did the timestamp move past what it was when I clicked" is the
// only thing the button actually needs to know.
export async function GET(): Promise<NextResponse> {
  const profile = await getProfile();
  return NextResponse.json({ lastSyncedAt: profile?.last_synced_at ?? null });
}

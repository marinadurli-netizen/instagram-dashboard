import { NextResponse } from "next/server";
import { after } from "next/server";
import { sync } from "@/lib/instagram/sync";

// A full sync can take minutes; the HTTP response has to come back in
// tens of seconds. after() schedules the actual sync to keep running once
// the response has been sent (Vercel wires this to waitUntil under the
// hood) instead of racing the request/response cycle — the browser learns
// the sync finished by polling /api/sync/status for last_synced_at to move,
// not by waiting on this response.
export async function POST(): Promise<NextResponse> {
  after(() => {
    sync()
      .then((summary) => console.log("Manual sync finished:", summary))
      .catch((err) => console.error("Manual sync failed:", err));
  });
  return NextResponse.json({ triggered: true });
}

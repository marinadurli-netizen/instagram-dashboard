"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const POLL_INTERVAL_MS = 3000;
// A full sync can legitimately take minutes; give up polling (not the sync
// itself — that keeps running server-side) after a while so the button
// doesn't spin forever if a poll request itself is flaky.
const POLL_TIMEOUT_MS = 5 * 60_000;

type Status = "idle" | "syncing" | "done" | "timeout" | "error";

export function SyncButton({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  async function startSync() {
    setStatus("syncing");
    startedAtRef.current = Date.now();
    const baseline = lastSyncedAt;

    try {
      await fetch("/api/sync/trigger", { method: "POST" });
    } catch {
      setStatus("error");
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      if (Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setStatus("timeout");
        return;
      }
      try {
        const res = await fetch("/api/sync/status", { cache: "no-store" });
        const data = (await res.json()) as { lastSyncedAt: string | null };
        if (data.lastSyncedAt && data.lastSyncedAt !== baseline) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus("done");
          router.refresh();
        }
      } catch {
        // Transient network hiccup — keep polling until the timeout above.
      }
    }, POLL_INTERVAL_MS);
  }

  const syncing = status === "syncing";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={startSync}
        disabled={syncing}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: "var(--border)", color: "var(--text)", opacity: syncing ? 0.6 : 1 }}
      >
        <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      {status === "timeout" && (
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Still running — check back soon.
        </span>
      )}
      {status === "error" && (
        <span className="text-xs" style={{ color: "var(--warn)" }}>
          Couldn&apos;t start sync.
        </span>
      )}
    </div>
  );
}

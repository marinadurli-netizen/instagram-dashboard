"use client";

import { useState, useTransition } from "react";
import { queueRemakeAction } from "../actions/remakes";

export function QueueRemakeButton({ postId, initiallyQueued }: { postId: number; initiallyQueued: boolean }) {
  const [queued, setQueued] = useState(initiallyQueued);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      await queueRemakeAction(postId);
      setQueued(true);
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending || queued}
      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
      style={{
        background: queued ? "var(--panel-2)" : "var(--accent)",
        color: queued ? "var(--muted)" : "#fff",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {queued ? "Queued for remake" : "Queue as remake"}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RunReviewButton({ postId }: { postId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Review failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-lg px-4 py-2 text-sm font-medium"
        style={{ background: "var(--idea)", color: "#fff", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Reviewing…" : "Run AI review"}
      </button>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

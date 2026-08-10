"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function RegenerateInsightsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Regenerate failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        style={{ background: "var(--idea)", color: "#fff", opacity: pending ? 0.6 : 1 }}
      >
        <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
        {pending ? "Regenerating…" : "Regenerate"}
      </button>
      {error && (
        <p className="text-xs" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

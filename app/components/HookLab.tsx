"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";

interface HookItem {
  archetype: string;
  hook: string;
  rationale: string;
}

const ARCHETYPE_LABELS: Record<string, string> = {
  identity_anchor: "Identity anchor",
  qualifying_question: "Qualifying question",
  command_with_urgency: "Command with urgency",
  shared_memory: "Shared memory",
  stakes_claim: "Stakes claim",
  direct_dare: "Direct dare",
  contrarian_take: "Contrarian take",
  curiosity_gap: "Curiosity gap",
};

export function HookLab() {
  const [topic, setTopic] = useState("");
  const [hooks, setHooks] = useState<HookItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function generate() {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/ai/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Generation failed");
        setHooks(null);
        return;
      }
      const data = await res.json();
      setHooks(data.hooks);
    });
  }

  function copy(index: number, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic — e.g. 'closing costs first-time buyers forget'"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") generate();
          }}
        />
        <button
          type="button"
          onClick={generate}
          disabled={pending || !topic.trim()}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "var(--idea)", color: "#fff", opacity: pending || !topic.trim() ? 0.6 : 1 }}
        >
          {pending ? "Writing…" : "Generate"}
        </button>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      )}

      {hooks && (
        <div className="grid gap-3 sm:grid-cols-2">
          {hooks.map((h, i) => (
            <div
              key={h.archetype}
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--panel)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--idea)" }}>
                  {ARCHETYPE_LABELS[h.archetype] ?? h.archetype}
                </span>
                <button
                  type="button"
                  onClick={() => copy(i, h.hook)}
                  aria-label="Copy hook"
                  style={{ color: copiedIndex === i ? "var(--accent)" : "var(--faint)" }}
                >
                  {copiedIndex === i ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--text)" }}>
                {h.hook}
              </p>
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                {h.rationale}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

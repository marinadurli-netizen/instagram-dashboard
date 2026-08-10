"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveScriptToQueueAction } from "../actions/scripts";

interface ScriptResult {
  hook: string;
  script: string;
  caption: string;
  notes: string;
}

const FIELD_STYLE = {
  borderColor: "var(--border)",
  background: "var(--panel-2)",
  color: "var(--text)",
} as const;

export function ScriptWriter({
  modelPostId,
  modelPostCaption,
}: {
  modelPostId?: number;
  modelPostCaption?: string | null;
}) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fetch("/api/ai/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, modelPostId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Generation failed");
        setResult(null);
        return;
      }
      setResult(await res.json());
    });
  }

  function saveToQueue() {
    if (!result) return;
    startTransition(async () => {
      await saveScriptToQueueAction({
        topic: topic.trim(),
        hook: result.hook,
        script: result.script,
        caption: result.caption,
        notes: result.notes,
      });
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {modelPostId !== undefined && (
        <div
          className="rounded-lg border p-3 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--muted)" }}
        >
          Modeling on{" "}
          <Link href={`/posts/${modelPostId}`} className="underline" style={{ color: "var(--idea)" }}>
            post #{modelPostId}
          </Link>
          {modelPostCaption ? `: "${modelPostCaption}"` : ""}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic — e.g. 'why buyers should get pre-approved first'"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          style={FIELD_STYLE}
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
          {pending && !result ? "Writing…" : "Generate"}
        </button>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
          <Section label="Hook" text={result.hook} />
          <Section label="Script" text={result.script} />
          <Section label="Caption" text={result.caption} />
          <Section label="Notes" text={result.notes} />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveToQueue}
              disabled={pending || saved}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: "var(--accent)", color: "#fff", opacity: pending || saved ? 0.6 : 1 }}
            >
              {saved ? "Saved to queue" : "Save to queue"}
            </button>
            {saved && (
              <Link href="/session" className="text-xs underline" style={{ color: "var(--muted)" }}>
                Open Session Mode
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--faint)" }}>
        {label}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: "var(--text)" }}>
        {text}
      </p>
    </div>
  );
}

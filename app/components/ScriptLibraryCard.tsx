"use client";

import { useState } from "react";
import { RotateCcw, Star } from "lucide-react";
import type { QueuedScript } from "@/lib/db/scripts";
import { requeueScriptAction, toggleScriptFavoriteAction } from "../actions/scripts";

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: "var(--faint)", bg: "var(--panel-2)", label: "Draft" },
  queued: { color: "var(--idea)", bg: "var(--idea-soft)", label: "In queue" },
  filmed: { color: "var(--accent)", bg: "var(--accent-soft)", label: "Filmed" },
};

// Purely a read view — opening a card to see the full text never touches
// its status. Only the star and "use another day" actions do that, and
// they stop the click from also toggling the card open/closed.
export function ScriptLibraryCard({ script }: { script: QueuedScript }) {
  const [open, setOpen] = useState(false);
  const statusStyle = STATUS_STYLES[script.status] ?? STATUS_STYLES.draft!;

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div
        className="flex cursor-pointer items-start justify-between gap-3"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((o) => !o);
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
              {script.topic || "(untitled)"}
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: statusStyle.color, background: statusStyle.bg }}
            >
              {statusStyle.label}
            </span>
          </div>
          {script.hook && !open && (
            <div className="mt-1 line-clamp-1 text-xs" style={{ color: "var(--muted)" }}>
              {script.hook}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <form
            action={toggleScriptFavoriteAction.bind(null, script.id)}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="submit"
              aria-label={script.is_favorite ? "Unfavorite" : "Favorite"}
              className="rounded-full p-1.5"
              style={{ color: script.is_favorite ? "var(--warn)" : "var(--faint)" }}
            >
              <Star size={16} fill={script.is_favorite ? "currentColor" : "none"} />
            </button>
          </form>
          {script.status !== "queued" && (
            <form action={requeueScriptAction.bind(null, script.id)} onClick={(e) => e.stopPropagation()}>
              <button
                type="submit"
                aria-label="Use another day"
                title="Use another day — back to the queue"
                className="rounded-full p-1.5"
                style={{ color: "var(--faint)" }}
              >
                <RotateCcw size={15} />
              </button>
            </form>
          )}
        </div>
      </div>

      {open ? (
        <div className="mt-4 flex flex-col gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <Section label="Hook" text={script.hook} />
          <Section label="Script" text={script.body} />
          <Section label="Caption" text={script.caption} />
          <Section label="Notes" text={script.notes} />
        </div>
      ) : (
        script.body && (
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs" style={{ color: "var(--muted)" }}>
            {script.body}
          </p>
        )
      )}
    </div>
  );
}

function Section({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
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

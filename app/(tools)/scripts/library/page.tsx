import Link from "next/link";
import { ArrowLeft, RotateCcw, Star } from "lucide-react";
import { getAllScripts, type QueuedScript } from "@/lib/db/scripts";
import { requeueScriptAction, toggleScriptFavoriteAction } from "../../../actions/scripts";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: "var(--faint)", bg: "var(--panel-2)", label: "Draft" },
  queued: { color: "var(--idea)", bg: "var(--idea-soft)", label: "In queue" },
  filmed: { color: "var(--accent)", bg: "var(--accent-soft)", label: "Filmed" },
};

export default async function ScriptLibraryPage() {
  try {
    return await renderLibrary();
  } catch (err) {
    const error = err as Error;
    console.error("Script Library render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderLibrary() {
  const scripts = await getAllScripts();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link href="/scripts" className="flex items-center gap-1 text-sm" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={14} />
          Back to Script Writer
        </Link>
        <h1 className="mt-3 text-xl font-semibold" style={{ color: "var(--text)" }}>
          Script Library
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Every script you&apos;ve ever generated — nothing is deleted when you mark it filmed.
          Star the ones worth keeping close, or send one back to the queue for another day.
        </p>
      </div>

      {scripts.length === 0 ? (
        <div
          className="rounded-xl border p-6 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
        >
          Nothing generated yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {scripts.map((script) => (
            <ScriptCard key={script.id} script={script} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScriptCard({ script }: { script: QueuedScript }) {
  const statusStyle = STATUS_STYLES[script.status] ?? STATUS_STYLES.draft!;

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="flex items-start justify-between gap-3">
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
          {script.hook && (
            <div className="mt-1 line-clamp-1 text-xs" style={{ color: "var(--muted)" }}>
              {script.hook}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <form action={toggleScriptFavoriteAction.bind(null, script.id)}>
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
            <form action={requeueScriptAction.bind(null, script.id)}>
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

      {script.body && (
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs" style={{ color: "var(--muted)" }}>
          {script.body}
        </p>
      )}
    </div>
  );
}

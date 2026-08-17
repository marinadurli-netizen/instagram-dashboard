import Link from "next/link";
import { X } from "lucide-react";
import type { QueuedScript } from "@/lib/db/scripts";
import { removeScriptFromQueueAction } from "../actions/scripts";

export function ScriptQueueList({ scripts }: { scripts: QueuedScript[] }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Queue{scripts.length > 0 ? ` (${scripts.length})` : ""}
        </h2>
        <div className="flex items-center gap-3">
          {scripts.length > 0 && (
            <Link href="/session" className="text-xs underline" style={{ color: "var(--idea)" }}>
              Open Session Mode
            </Link>
          )}
          <Link href="/scripts/library" className="text-xs underline" style={{ color: "var(--muted)" }}>
            See every script
          </Link>
        </div>
      </div>

      {scripts.length === 0 ? (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Nothing queued yet — generate a script above and save it to see it here.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
              style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                  {script.topic || "(untitled)"}
                </div>
                {script.hook && (
                  <div className="mt-0.5 line-clamp-1 text-xs" style={{ color: "var(--muted)" }}>
                    {script.hook}
                  </div>
                )}
              </div>
              <form action={removeScriptFromQueueAction.bind(null, script.id)}>
                <button
                  type="submit"
                  aria-label="Remove from queue"
                  className="shrink-0 rounded-full p-1.5"
                  style={{ color: "var(--faint)" }}
                >
                  <X size={14} />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

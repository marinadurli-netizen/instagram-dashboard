"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addReferencePostAction } from "../actions/inspiration";

const FIELD_STYLE = {
  borderColor: "var(--border)",
  background: "var(--panel-2)",
  color: "var(--text)",
} as const;

export function AddReferencePostForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [thumbUrl, setThumbUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await addReferencePostAction({ handle, url, caption, thumbUrl });
      if (result.error) {
        setError(result.error);
        return;
      }
      setHandle("");
      setUrl("");
      setCaption("");
      setThumbUrl("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-fit items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: "var(--border)", color: "var(--text)" }}
      >
        <Plus size={13} />
        Add reference post
      </button>
    );
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>
          Creator handle
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="anothercreator"
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={FIELD_STYLE}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>
          Post URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={FIELD_STYLE}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2" style={{ color: "var(--muted)" }}>
          Caption (optional)
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            className="resize-none rounded-lg border px-3 py-2 text-sm outline-none"
            style={FIELD_STYLE}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2" style={{ color: "var(--muted)" }}>
          Thumbnail image URL (optional)
          <input
            value={thumbUrl}
            onChange={(e) => setThumbUrl(e.target.value)}
            placeholder="https://…"
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={FIELD_STYLE}
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !handle.trim() || !url.trim()}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            background: "var(--accent)",
            color: "#fff",
            opacity: pending || !handle.trim() || !url.trim() ? 0.6 : 1,
          }}
        >
          {pending ? "Adding…" : "Add post"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs"
          style={{ color: "var(--faint)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

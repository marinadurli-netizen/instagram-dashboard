import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllScripts } from "@/lib/db/scripts";
import { ScriptLibraryCard } from "../../../components/ScriptLibraryCard";

export const dynamic = "force-dynamic";

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
          Click a card to read it in full. Star the ones worth keeping close, or send one back
          to the queue for another day.
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
            <ScriptLibraryCard key={script.id} script={script} />
          ))}
        </div>
      )}
    </div>
  );
}

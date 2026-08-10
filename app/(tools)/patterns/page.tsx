import { getProfile } from "@/lib/db/profile";
import { getInsightCards } from "@/lib/db/dashboard";
import { InsightCards } from "../../components/InsightCards";
import { RegenerateInsightsButton } from "../../components/RegenerateInsightsButton";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  try {
    return await renderPatterns();
  } catch (err) {
    const error = err as Error;
    console.error("Patterns render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderPatterns() {
  const profile = await getProfile();
  const handle = profile?.handle;
  if (!handle) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>No account connected yet.</p>
      </main>
    );
  }

  const insights = await getInsightCards(handle, 50);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            Pattern Reader
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Cross-library patterns found in your post history.
          </p>
        </div>
        <RegenerateInsightsButton />
      </div>

      {insights.length === 0 ? (
        <div
          className="rounded-xl border p-6 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
        >
          No patterns yet — click Regenerate to analyze your library.
        </div>
      ) : (
        <InsightCards insights={insights} />
      )}
    </div>
  );
}

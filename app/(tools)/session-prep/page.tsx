import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { getProfile } from "@/lib/db/profile";
import { getPostingCadence, getTopPosts } from "@/lib/db/sessionPrep";
import { getQueuedRemakeSourceIds } from "@/lib/db/remakes";
import { QueueRemakeButton } from "../../components/QueueRemakeButton";
import { formatCount } from "../../components/format";

export const dynamic = "force-dynamic";

export default async function SessionPrepPage() {
  try {
    return await renderSessionPrep();
  } catch (err) {
    const error = err as Error;
    console.error("Session Prep render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderSessionPrep() {
  const profile = await getProfile();
  const handle = profile?.handle;
  if (!handle) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>No account connected yet.</p>
      </main>
    );
  }

  const [cadence, topPosts, queuedSourceIds] = await Promise.all([
    getPostingCadence(handle),
    getTopPosts(handle),
    getQueuedRemakeSourceIds(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
          Session Prep
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Where you stand before you shoot.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Posts · last 30d" value={String(cadence.postsLast30)} />
        <StatTile label="Days missed · last 30d" value={String(cadence.daysMissedLast30)} />
        <ChangeTile changePct={cadence.changePct} />
      </div>

      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Remake candidates
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--faint)" }}>
          Your top posts — proven formats worth reshooting.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {topPosts.length === 0 ? (
            <div
              className="rounded-xl border p-6 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
            >
              No posts yet.
            </div>
          ) : (
            topPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 rounded-xl border p-3"
                style={{ borderColor: "var(--border)", background: "var(--panel)" }}
              >
                <div
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                  style={{ background: "var(--panel-2)" }}
                >
                  {post.thumb_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable CDN host
                    <img src={post.thumb_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <Link href={`/posts/${post.id}`} className="min-w-0 flex-1">
                  {post.caption && (
                    <div className="line-clamp-1 text-sm" style={{ color: "var(--text)" }}>
                      {post.caption}
                    </div>
                  )}
                  <div className="mt-0.5 text-xs" style={{ color: "var(--faint)" }}>
                    {formatCount(post.views)} views · {post.posted_at ?? "—"}
                  </div>
                </Link>
                <QueueRemakeButton postId={post.id} initiallyQueued={queuedSourceIds.has(post.id)} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="text-xl font-semibold" style={{ color: "var(--text)" }}>
        {value}
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </div>
    </div>
  );
}

function ChangeTile({ changePct }: { changePct: number | null }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      {changePct === null ? (
        <div className="flex items-center gap-1 text-xl font-semibold" style={{ color: "var(--faint)" }}>
          <Minus size={16} />
        </div>
      ) : (
        <div
          className="flex items-center gap-1 text-xl font-semibold"
          style={{ color: changePct >= 0 ? "var(--accent)" : "var(--warn)" }}
        >
          {changePct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {changePct >= 0 ? "+" : ""}
          {changePct.toFixed(0)}%
        </div>
      )}
      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
        vs prior 30d
      </div>
    </div>
  );
}

import Link from "next/link";
import { getProfile } from "@/lib/db/profile";
import { getAllPostsHistory } from "@/lib/db/dashboard";
import { formatCount } from "../../components/format";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  try {
    return await renderHistory();
  } catch (err) {
    const error = err as Error;
    console.error("History render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderHistory() {
  const profile = await getProfile();
  const handle = profile?.handle;
  if (!handle) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>No account connected yet.</p>
      </main>
    );
  }

  const posts = await getAllPostsHistory(handle);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
          History
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Every post, newest first.
        </p>
      </div>

      {posts.length === 0 ? (
        <div
          className="rounded-xl border p-6 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
        >
          No posts yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
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
              <div className="min-w-0 flex-1">
                {post.caption && (
                  <div className="line-clamp-1 text-sm" style={{ color: "var(--text)" }}>
                    {post.caption}
                  </div>
                )}
                <div className="mt-0.5 text-xs" style={{ color: "var(--faint)" }}>
                  {post.posted_at ?? "—"}
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-4 gap-3 text-right text-xs" style={{ color: "var(--faint)" }}>
                <MiniStat label="views" value={post.views} />
                <MiniStat label="likes" value={post.likes} />
                <MiniStat label="saves" value={post.saves} />
                <MiniStat label="reach" value={post.reach} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {formatCount(value)}
      </div>
      <div>{label}</div>
    </div>
  );
}

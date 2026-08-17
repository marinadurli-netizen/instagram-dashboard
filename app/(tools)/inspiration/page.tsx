import { X } from "lucide-react";
import { getProfile } from "@/lib/db/profile";
import { getReferencePosts, groupByHandle } from "@/lib/db/inspiration";
import { deleteReferencePostAction } from "../../actions/inspiration";
import { AddReferencePostForm } from "../../components/AddReferencePostForm";
import { formatCount } from "../../components/format";

export const dynamic = "force-dynamic";

export default async function InspirationPage() {
  try {
    return await renderInspiration();
  } catch (err) {
    const error = err as Error;
    console.error("Inspiration render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderInspiration() {
  const profile = await getProfile();
  const handle = profile?.handle;
  if (!handle) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>No account connected yet.</p>
      </main>
    );
  }

  const posts = await getReferencePosts(handle);
  const groups = groupByHandle(posts);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
          Inspiration
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Reference creators&apos; posts, grouped by handle. There&apos;s no API access to
          another account, so add a post by pasting its link.
        </p>
      </div>

      <AddReferencePostForm />

      {groups.size === 0 ? (
        <div
          className="rounded-xl border p-6 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
        >
          No reference posts yet — add one above.
        </div>
      ) : (
        Array.from(groups.entries()).map(([refHandle, refPosts]) => (
          <div key={refHandle}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              @{refHandle}
            </h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {refPosts.map((post) => (
                <div
                  key={post.id}
                  className="relative w-44 shrink-0 overflow-hidden rounded-xl border"
                  style={{ borderColor: "var(--border)", background: "var(--panel)" }}
                >
                  <a href={post.url ?? "#"} target="_blank" rel="noreferrer" className="block">
                    <div className="aspect-square w-full" style={{ background: "var(--panel-2)" }}>
                      {post.thumb_url && (
                        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable CDN host
                        <img src={post.thumb_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {formatCount(post.views)} views
                      </div>
                      {post.caption && (
                        <div className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--muted)" }}>
                          {post.caption}
                        </div>
                      )}
                      <div className="mt-2 text-xs" style={{ color: "var(--faint)" }}>
                        {post.posted_at ?? "—"}
                      </div>
                    </div>
                  </a>
                  <form action={deleteReferencePostAction.bind(null, post.id)} className="absolute right-2 top-2">
                    <button
                      type="submit"
                      aria-label="Remove reference post"
                      className="rounded-full p-1"
                      style={{ background: "rgba(0,0,0,0.55)" }}
                    >
                      <X size={12} color="#fff" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

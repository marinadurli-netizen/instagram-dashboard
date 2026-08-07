import { ExternalLink } from "lucide-react";
import type { RailPost } from "@/lib/db/dashboard";
import { formatCount } from "./format";

export function RecentPostsRail({ posts }: { posts: RailPost[] }) {
  if (posts.length === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
      >
        No posts yet.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {posts.map((post) => (
        <a
          key={post.id}
          href={post.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="w-44 shrink-0 overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        >
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
            <div className="mt-2 flex items-center justify-between text-xs" style={{ color: "var(--faint)" }}>
              <span>{post.posted_at ?? "—"}</span>
              <ExternalLink size={12} />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

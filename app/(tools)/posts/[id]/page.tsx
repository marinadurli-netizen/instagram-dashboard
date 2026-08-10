import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getProfile } from "@/lib/db/profile";
import { getPostDetail, getMedianRates } from "@/lib/db/posts";
import { PostRateRows } from "../../../components/PostRates";
import { RunReviewButton } from "../../../components/RunReviewButton";
import { formatCount } from "../../../components/format";

export const dynamic = "force-dynamic";

const VERDICT_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  win: { color: "var(--accent)", bg: "var(--accent-soft)", label: "Win" },
  flop: { color: "var(--warn)", bg: "var(--warn-soft)", label: "Flop" },
  ok: { color: "var(--idea)", bg: "var(--idea-soft)", label: "OK" },
};

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);

  try {
    return await renderPost(postId);
  } catch (err) {
    const error = err as Error;
    console.error("Post detail render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderPost(postId: number) {
  if (!Number.isInteger(postId)) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>Invalid post id.</p>
      </main>
    );
  }

  const profile = await getProfile();
  const handle = profile?.handle;
  if (!handle) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>No account connected yet.</p>
      </main>
    );
  }

  const [post, medians] = await Promise.all([getPostDetail(postId, handle), getMedianRates(handle)]);

  if (!post) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>Post not found.</p>
      </main>
    );
  }

  const verdictStyle = post.verdict ? VERDICT_STYLES[post.verdict] : undefined;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/dashboard" className="flex items-center gap-1 text-sm" style={{ color: "var(--muted)" }}>
        <ArrowLeft size={14} />
        Back
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div
          className="aspect-square w-full shrink-0 overflow-hidden rounded-xl border sm:w-64"
          style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
        >
          {post.thumb_url && (
            // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable CDN host
            <img src={post.thumb_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold" style={{ color: "var(--text)" }}>
              {formatCount(post.views)} views
            </span>
            {post.url && (
              <a href={post.url} target="_blank" rel="noreferrer" style={{ color: "var(--faint)" }}>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
          <div className="mt-1 text-sm" style={{ color: "var(--faint)" }}>
            {post.posted_at ?? "Unknown date"}
          </div>
          {post.caption && (
            <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--muted)" }}>
              {post.caption}
            </p>
          )}
          <Link
            href={{ pathname: "/scripts", query: { modelPostId: post.id } }}
            className="mt-4 inline-block rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Write a script modeled on this
          </Link>
        </div>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Analytics
        </h2>
        <div className="mt-2">
          <PostRateRows post={post} medians={medians} />
        </div>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            AI review
          </h2>
          {verdictStyle && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ color: verdictStyle.color, background: verdictStyle.bg }}
            >
              {verdictStyle.label}
            </span>
          )}
        </div>
        {post.review ? (
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            {post.review}
          </p>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--faint)" }}>
            No review yet.
          </p>
        )}
        <div className="mt-3">
          <RunReviewButton postId={post.id} />
        </div>
      </div>
    </div>
  );
}

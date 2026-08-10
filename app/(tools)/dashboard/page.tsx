import { getProfile } from "@/lib/db/profile";
import {
  getAllTimeStats,
  getHeatmap,
  getInsightCards,
  getRecentAverages,
  getRecentPostsRail,
} from "@/lib/db/dashboard";
import { getMedianRates } from "@/lib/db/posts";
import { AveragesRow } from "../../components/AveragesRow";
import { InsightCards } from "../../components/InsightCards";
import { PostingHeatmap } from "../../components/PostingHeatmap";
import { ProfileHeader } from "../../components/ProfileHeader";
import { RecentPostsRail } from "../../components/RecentPostsRail";
import { StatTiles } from "../../components/StatTiles";

// This page reads live, frequently-changing data (synced metrics, inline
// profile edits). Without this, Next would try to statically prerender it
// at build time and freeze the dashboard on whatever the DB looked like
// during that build — never reflecting a new sync or edit until the next
// deploy.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    return await renderDashboard();
  } catch (err) {
    // Next's production error boundary hides the real message behind an
    // opaque digest with no way to see what broke short of Vercel's own
    // logs. Render it directly instead — temporary, same reasoning as the
    // OAuth callback's error handling. Never includes a token/secret: DB
    // errors here are schema/connection issues, not credential dumps.
    const error = err as Error;
    console.error("Dashboard render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderDashboard() {
  const profile = await getProfile();
  const handle = profile?.handle;

  if (!handle) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>
          No account connected yet. Visit <code>/api/instagram/connect</code> to get started.
        </p>
      </main>
    );
  }

  // Every one of these is scoped to `handle` — reference posts imported
  // from other creators live in the same posts table under a different
  // handle and must never surface here.
  const [stats, averages, posts, insights, heatmap, medianRates] = await Promise.all([
    getAllTimeStats(handle),
    getRecentAverages(handle),
    getRecentPostsRail(handle),
    getInsightCards(handle),
    getHeatmap(handle),
    getMedianRates(handle),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <ProfileHeader
        displayName={profile.display_name}
        handle={profile.handle}
        bio={profile.bio}
        followers={profile.followers}
        totalLikes={stats.likes}
        totalPosts={stats.posts}
      />
      <RecentPostsRail posts={posts} medians={medianRates} />
      <InsightCards insights={insights} />
      <StatTiles stats={stats} />
      <AveragesRow averages={averages} />
      <PostingHeatmap data={heatmap} />
    </div>
  );
}

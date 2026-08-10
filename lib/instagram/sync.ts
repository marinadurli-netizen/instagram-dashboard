import { queryOne } from "@/lib/db/query";
import { upsert } from "@/lib/db/upsert";
import { derivedDateKeyFromId, localDateKey } from "@/lib/db/localDate";
import { getWatchTimeBackfillCandidates } from "@/lib/db/posts";
import { fetchAllMedia } from "./media";
import { batchFetchInsights } from "./insights";
import { fetchProfile } from "./profile";
import { refreshLongLivedInstagramToken } from "./oauth";

export interface SyncSummary {
  postsUpserted: number;
  metricsUpserted: number;
  backfillAttempted: number;
  backfillErrors: number;
  profileSynced: boolean;
  tokenRefreshed: boolean;
}

interface ProfileRow {
  instagram_account_id: string | null;
  instagram_access_token: string | null;
  instagram_token_refreshed_at: string | null;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
}

const PLATFORM = "instagram";

// A refreshed token can only ever be persisted to the database — an env
// var can't be rewritten at runtime — so refresh only makes sense once the
// database is the source of truth. "A few days old" per the sync spec;
// well inside the 24h-to-60-day window the ig_refresh_token grant allows.
const TOKEN_REFRESH_THRESHOLD_DAYS = 7;

// Keeps a single sync run's request budget bounded. Watch-time/views are
// per-post-only calls (see media.ts), so backfilling every video in one run
// would scale linearly with library size; capping it lets the backlog
// drain gradually across runs instead.
const WATCH_TIME_BACKFILL_CAP = 25;

function isTokenStale(refreshedAt: string | null): boolean {
  if (!refreshedAt) return true;
  const ageMs = Date.now() - new Date(refreshedAt).getTime();
  return ageMs > TOKEN_REFRESH_THRESHOLD_DAYS * 86_400_000;
}

// Single-account app: there is exactly one profile row (id = 1), so there's
// no "sync all accounts" concept — just sync the one connected account.
export async function sync(): Promise<SyncSummary> {
  const profile = await queryOne<ProfileRow>(
    `SELECT instagram_account_id, instagram_access_token, instagram_token_refreshed_at, handle, display_name, bio
     FROM profile WHERE id = 1`,
  );

  // The token can come from the OAuth-managed DB column or, per the sync
  // spec, an env var. The DB always wins when present — once a token has
  // been refreshed it's the only copy that stays current, so treating the
  // env var as anything but a one-time bootstrap value would mean a
  // refreshed token gets silently discarded on the very next run in favor
  // of the (now stale) env var again.
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
  const accountId = profile?.instagram_account_id ?? null;
  let accessToken = profile?.instagram_access_token ?? envToken;

  if (!accountId || !accessToken) {
    throw new Error(
      "No Instagram account connected — visit /api/instagram/connect, or set INSTAGRAM_ACCESS_TOKEN, first",
    );
  }

  let tokenRefreshed = false;
  if (isTokenStale(profile?.instagram_token_refreshed_at ?? null)) {
    try {
      const refreshed = await refreshLongLivedInstagramToken(accessToken);
      accessToken = refreshed.access_token;
      tokenRefreshed = true;
    } catch (err) {
      // Expected for a Page access token (Facebook Login for Business flow)
      // — those don't support this endpoint at all and don't need to, since
      // they don't carry the same hard expiry. Not fatal either way.
      console.warn("Instagram token refresh skipped:", (err as Error).message);
    }
  }

  let profileSynced = false;
  const profileValues: Record<string, unknown> = { id: 1, updated_at: new Date(), last_synced_at: new Date() };
  if (tokenRefreshed) {
    profileValues.instagram_access_token = accessToken;
    profileValues.instagram_token_refreshed_at = new Date();
  }

  let handle = profile?.handle ?? accountId;
  try {
    const igProfile = await fetchProfile(accountId, accessToken);
    profileValues.followers = igProfile.followers_count ?? null;
    profileValues.media_count = igProfile.media_count ?? null;
    // Seed-only: the dashboard's inline-editable name/handle/bio must never
    // get clobbered by a sync once the user has set their own value.
    if (!profile?.display_name && igProfile.name) profileValues.display_name = igProfile.name;
    if (!profile?.bio && igProfile.biography) profileValues.bio = igProfile.biography;
    if (!profile?.handle && igProfile.username) profileValues.handle = igProfile.username;
    if (igProfile.username) handle = profile?.handle ?? igProfile.username;
    profileSynced = true;
  } catch (err) {
    console.warn("Instagram profile fetch failed:", (err as Error).message);
  }

  await upsert({ table: "profile", conflictColumns: ["id"], values: profileValues });

  const media = await fetchAllMedia(accountId, accessToken);

  let postsUpserted = 0;
  let metricsUpserted = 0;
  for (const m of media) {
    // Real Graph API media always carries `timestamp`; this fallback exists
    // only so a future import path missing one doesn't collapse the whole
    // history onto "today" and destroy every trend derived from posted_at.
    const postedAt = m.timestamp ? localDateKey(new Date(m.timestamp)) : derivedDateKeyFromId(m.id);

    await upsert({
      table: "posts",
      conflictColumns: ["platform", "external_id"],
      values: {
        platform: PLATFORM,
        external_id: m.id,
        url: m.permalink ?? null,
        thumb_url: m.thumbnail_url ?? m.media_url ?? null,
        caption: m.caption ?? null,
        posted_at: postedAt,
        handle,
        media_type: m.media_type,
        media_product_type: m.media_product_type,
        ...m.metrics,
      },
    });
    postsUpserted++;
    if (Object.keys(m.metrics).length > 0) metricsUpserted++;
  }

  // Second pass: video-only metrics (views/plays, watch-time) that the
  // combined call above can't safely request for every post at once.
  // Never-fetched posts go first, then the most recently posted ones whose
  // numbers are still moving — the rest fills in on later runs.
  const backfillCandidates = await getWatchTimeBackfillCandidates(handle, PLATFORM, WATCH_TIME_BACKFILL_CAP);
  let backfillAttempted = 0;
  let backfillErrors = 0;

  if (backfillCandidates.length > 0) {
    const insightsMap = await batchFetchInsights(
      backfillCandidates.map((c) => ({
        id: c.external_id,
        media_type: c.media_type,
        media_product_type: c.media_product_type,
      })),
      accessToken,
    );

    for (const candidate of backfillCandidates) {
      backfillAttempted++;
      const metrics = insightsMap.get(candidate.external_id);
      if (!metrics) {
        backfillErrors++;
        // Still mark it attempted — a post that permanently fails (e.g. an
        // unsupported metric for its type) must not monopolize every
        // future run's capped backfill slot ahead of posts that haven't
        // been tried yet.
        await upsert({
          table: "posts",
          conflictColumns: ["platform", "external_id"],
          values: { platform: PLATFORM, external_id: candidate.external_id, watch_time_synced_at: new Date() },
        });
        continue;
      }
      await upsert({
        table: "posts",
        conflictColumns: ["platform", "external_id"],
        values: {
          platform: PLATFORM,
          external_id: candidate.external_id,
          watch_time_synced_at: new Date(),
          ...metrics,
        },
      });
    }
  }

  return { postsUpserted, metricsUpserted, backfillAttempted, backfillErrors, profileSynced, tokenRefreshed };
}

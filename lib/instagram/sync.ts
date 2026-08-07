import { query, queryOne } from "@/lib/db/query";
import { upsert } from "@/lib/db/upsert";
import { localDateKey } from "@/lib/db/localDate";
import { fetchAllMedia } from "./media";
import { batchFetchInsights } from "./insights";

export interface SyncSummary {
  postsUpserted: number;
  metricsUpserted: number;
  insightErrors: number;
}

interface ProfileRow {
  instagram_account_id: string;
  instagram_access_token: string;
  handle: string | null;
}

const PLATFORM = "instagram";

// Single-account app: there is exactly one profile row (id = 1), so there's
// no "sync all accounts" concept — just sync the one connected account.
export async function sync(): Promise<SyncSummary> {
  const profile = await queryOne<ProfileRow>(
    "SELECT instagram_account_id, instagram_access_token, handle FROM profile WHERE id = 1",
  );
  if (!profile?.instagram_account_id || !profile.instagram_access_token) {
    throw new Error("No Instagram account connected — visit /api/instagram/connect first");
  }
  const handle = profile.handle ?? profile.instagram_account_id;

  const media = await fetchAllMedia(profile.instagram_account_id, profile.instagram_access_token);

  let postsUpserted = 0;
  for (const m of media) {
    await upsert({
      table: "posts",
      conflictColumns: ["platform", "external_id"],
      values: {
        platform: PLATFORM,
        external_id: m.id,
        url: m.permalink ?? null,
        thumb_url: m.thumbnail_url ?? m.media_url ?? null,
        caption: m.caption ?? null,
        posted_at: localDateKey(new Date(m.timestamp)),
        handle,
      },
    });
    postsUpserted++;
  }

  const insightsMap = await batchFetchInsights(
    media.map((m) => ({ id: m.id, media_type: m.media_type, media_product_type: m.media_product_type })),
    profile.instagram_access_token,
  );

  let metricsUpserted = 0;
  let insightErrors = 0;
  for (const [externalId, metrics] of insightsMap) {
    if (metrics === null) {
      insightErrors++;
      continue;
    }
    await upsert({
      table: "posts",
      conflictColumns: ["platform", "external_id"],
      values: {
        platform: PLATFORM,
        external_id: externalId,
        ...metrics,
      },
    });
    metricsUpserted++;
  }

  await query("UPDATE profile SET updated_at = now() WHERE id = 1");

  return { postsUpserted, metricsUpserted, insightErrors };
}

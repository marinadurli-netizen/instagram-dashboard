import { query, queryOne } from "@/lib/db/query";
import { upsert } from "@/lib/db/upsert";
import { localDateKey } from "@/lib/db/localDate";
import { fetchAllMedia } from "./media";
import { batchFetchInsights } from "./insights";

export interface SyncSummary {
  accountId: string;
  postsUpserted: number;
  metricsUpserted: number;
  insightErrors: number;
}

interface IgAccountRow {
  id: string;
  access_token: string;
}

export async function syncAccount(accountId: string): Promise<SyncSummary> {
  const account = await queryOne<IgAccountRow>(
    "SELECT id, access_token FROM ig_accounts WHERE id = $1",
    [accountId],
  );
  if (!account) {
    throw new Error(`Unknown ig_accounts row: ${accountId}`);
  }

  const media = await fetchAllMedia(account.id, account.access_token);

  let postsUpserted = 0;
  for (const m of media) {
    await upsert({
      table: "posts",
      conflictColumns: ["id"],
      values: {
        id: m.id,
        account_id: account.id,
        media_type: m.media_type,
        media_product_type: m.media_product_type ?? null,
        caption: m.caption ?? null,
        permalink: m.permalink ?? null,
        media_url: m.media_url ?? null,
        thumbnail_url: m.thumbnail_url ?? null,
        posted_at: m.timestamp,
        posted_date: localDateKey(new Date(m.timestamp)),
      },
    });
    postsUpserted++;
  }

  const insightsMap = await batchFetchInsights(
    media.map((m) => ({ id: m.id, media_type: m.media_type, media_product_type: m.media_product_type })),
    account.access_token,
  );

  let metricsUpserted = 0;
  let insightErrors = 0;
  for (const [postId, metrics] of insightsMap) {
    if (metrics === null) {
      insightErrors++;
      continue;
    }
    await upsert({
      table: "post_metrics",
      conflictColumns: ["post_id"],
      values: {
        post_id: postId,
        ...metrics,
        captured_at: new Date().toISOString(),
      },
    });
    metricsUpserted++;
  }

  await query("UPDATE ig_accounts SET updated_at = now() WHERE id = $1", [account.id]);

  return { accountId: account.id, postsUpserted, metricsUpserted, insightErrors };
}

export async function syncAllAccounts(): Promise<SyncSummary[]> {
  const accounts = await query<{ id: string }>("SELECT id FROM ig_accounts");
  const summaries: SyncSummary[] = [];
  for (const account of accounts) {
    summaries.push(await syncAccount(account.id));
  }
  return summaries;
}

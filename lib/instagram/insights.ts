import { graphBatch } from "./client";
import { metricsForMedia, parseInsightsBody, type MetricsValues, type RawInsightMetric } from "./metrics";

const BATCH_SIZE = 50; // Graph API batch request cap

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface MediaForInsights {
  id: string;
  media_type: string;
  media_product_type: string | null;
}

// Per-post insights fetch, one Graph API batch item per media — used by the
// second-pass backfill for video/Reels-only metrics (views/plays and
// watch-time) that the combined media+insights list call can't safely
// request for every post at once (see media.ts for why).
export async function batchFetchInsights(
  mediaItems: MediaForInsights[],
  accessToken: string,
): Promise<Map<string, MetricsValues | null>> {
  const results = new Map<string, MetricsValues | null>();

  for (const group of chunk(mediaItems, BATCH_SIZE)) {
    const requests = group.map((m) => ({
      method: "GET",
      relative_url: `${m.id}/insights?metric=${metricsForMedia(m.media_type, m.media_product_type).join(",")}`,
    }));

    const responses = await graphBatch(accessToken, requests);

    responses.forEach((res, i) => {
      const mediaId = group[i]!.id;
      if (res.code !== 200) {
        console.warn(`Insights fetch failed for media ${mediaId}: HTTP ${res.code} ${res.body}`);
        results.set(mediaId, null);
        return;
      }
      const parsed = JSON.parse(res.body) as { data: RawInsightMetric[] };
      results.set(mediaId, parseInsightsBody(parsed.data));
    });
  }

  return results;
}

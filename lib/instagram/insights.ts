import { graphBatch } from "./client";
import { metricsForMedia } from "./metrics";

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

// Keys match posts' own metric columns directly, so callers can spread this
// straight into an upsert() values object.
export interface MetricsValues {
  reach?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  likes?: number;
  views?: number;
  avg_watch_s?: number;
  total_watch_s?: number;
}

interface RawInsightMetric {
  name: string;
  values?: Array<{ value: number }>;
  total_value?: { value: number };
}

function extractValue(metric: RawInsightMetric): number | undefined {
  if (metric.total_value) return metric.total_value.value;
  if (metric.values && metric.values.length > 0) return metric.values.at(-1)?.value;
  return undefined;
}

// ig_reels_avg_watch_time and ig_reels_video_view_total_time come back in
// milliseconds; posts stores seconds.
const msToSeconds = (ms: number) => ms / 1000;

function parseInsightsBody(data: RawInsightMetric[]): MetricsValues {
  const result: MetricsValues = {};
  for (const metric of data) {
    const value = extractValue(metric);
    if (value === undefined) continue;
    switch (metric.name) {
      case "reach":
        result.reach = value;
        break;
      case "saved":
        result.saves = value;
        break;
      case "shares":
        result.shares = value;
        break;
      case "comments":
        result.comments = value;
        break;
      case "likes":
        result.likes = value;
        break;
      case "plays":
        result.views = value;
        break;
      case "ig_reels_avg_watch_time":
        result.avg_watch_s = msToSeconds(value);
        break;
      case "ig_reels_video_view_total_time":
        result.total_watch_s = msToSeconds(value);
        break;
      // total_interactions has no column on posts (views/likes/comments/
      // shares/saves/reach cover it) — intentionally dropped.
    }
  }
  return result;
}

// Returns a Map keyed by media id. A value of `null` means insights could
// not be fetched for that post (too new, story expired, etc.) — callers
// should skip it rather than upsert nulls over real stored metrics.
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

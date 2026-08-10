import { graphFetch } from "./client";
import { FEED_METRICS, parseInsightsBody, type MetricsValues, type RawInsightMetric } from "./metrics";

// Insights are requested as a field expansion on the media call itself
// (`insights.metric(...)`) rather than a separate per-post call — one
// request per page instead of one per post. The metric list has to be the
// same for every row in the page, so it's capped to FEED_METRICS: the
// subset valid for every non-story media type. `plays` and the Reels
// watch-time metrics are video-only — requesting them here for a plain
// image post would fail that post's *entire* insights expansion (Graph API
// insights calls are all-or-nothing per request, confirmed by production
// use of the old per-post endpoint) — so those are left to the second-pass
// backfill in sync.ts, which knows each post's real media type.
const MEDIA_FIELDS =
  `id,caption,media_type,media_product_type,permalink,media_url,thumbnail_url,timestamp,` +
  `insights.metric(${FEED_METRICS.join(",")})`;

interface InsightsField {
  data?: RawInsightMetric[];
  error?: { message: string; code?: number };
}

export interface RawMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type: string | null;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  insights?: InsightsField;
}

export interface MediaWithMetrics {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type: string | null;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  metrics: MetricsValues;
}

interface MediaPage {
  data: RawMedia[];
  paging?: { cursors?: { after?: string }; next?: string };
}

function toMediaWithMetrics(m: RawMedia): MediaWithMetrics {
  const { insights, ...rest } = m;
  if (insights?.error) {
    console.warn(`Insights expansion failed for media ${m.id}: ${insights.error.message}`);
  }
  return { ...rest, metrics: insights?.data ? parseInsightsBody(insights.data) : {} };
}

// Paginates the entire /media edge (no since/until filter), so this always
// walks the whole history. At personal-account scale this is a handful of
// paginated calls, each one costing exactly one Graph API request no
// matter how many posts are on that page.
export async function fetchAllMedia(igUserId: string, accessToken: string): Promise<MediaWithMetrics[]> {
  const results: MediaWithMetrics[] = [];
  let after: string | undefined;

  do {
    const page = await graphFetch<MediaPage>(`/${igUserId}/media`, {
      fields: MEDIA_FIELDS,
      limit: "50",
      access_token: accessToken,
      after,
    });
    results.push(...page.data.map(toMediaWithMetrics));
    after = page.paging?.next ? page.paging.cursors?.after : undefined;
  } while (after);

  return results;
}

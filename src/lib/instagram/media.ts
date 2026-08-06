import { graphFetch } from "./client";

const MEDIA_FIELDS =
  "id,caption,media_type,media_product_type,permalink,media_url,thumbnail_url,timestamp";

export interface RawMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type: string | null;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
}

interface MediaPage {
  data: RawMedia[];
  paging?: { cursors?: { after?: string }; next?: string };
}

// Paginates the entire /media edge (no since/until filter), so this always
// walks the whole history. At personal-account scale this is a handful of
// paginated calls; the expensive part is the per-post insights fetch, which
// batchFetchInsights() handles separately.
export async function fetchAllMedia(igUserId: string, accessToken: string): Promise<RawMedia[]> {
  const results: RawMedia[] = [];
  let after: string | undefined;

  do {
    const page = await graphFetch<MediaPage>(`/${igUserId}/media`, {
      fields: MEDIA_FIELDS,
      limit: "50",
      access_token: accessToken,
      after,
    });
    results.push(...page.data);
    after = page.paging?.next ? page.paging.cursors?.after : undefined;
  } while (after);

  return results;
}

import { query } from "./query";

export interface InspirationPost {
  id: number;
  handle: string;
  thumb_url: string | null;
  caption: string | null;
  url: string | null;
  views: number;
  posted_at: string | null;
}

// Reference posts imported from other creators live in the same `posts`
// table, distinguished only by `handle` — everything here is deliberately
// the complement of every handle-scoped query elsewhere in the app.
export async function getReferencePosts(ownHandle: string): Promise<InspirationPost[]> {
  return query<InspirationPost>(
    `
    SELECT id, handle, thumb_url, caption, url, views, posted_at
    FROM posts
    WHERE handle != $1
    ORDER BY handle ASC, posted_at DESC
    `,
    [ownHandle],
  );
}

export function groupByHandle(posts: InspirationPost[]): Map<string, InspirationPost[]> {
  const groups = new Map<string, InspirationPost[]>();
  for (const post of posts) {
    const list = groups.get(post.handle) ?? [];
    list.push(post);
    groups.set(post.handle, list);
  }
  return groups;
}

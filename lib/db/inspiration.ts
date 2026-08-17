import { query } from "./query";
import { upsert } from "./upsert";
import { derivedDateKeyFromId } from "./localDate";

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

// Matches the shortcode out of any instagram.com/p/, /reel/ or /tv/ URL —
// the same id Instagram itself uses to identify the post, so it doubles as
// a stable external_id (re-adding the same URL updates the existing row
// via upsert rather than creating a duplicate).
const IG_POST_URL_PATTERN = /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i;

export function extractInstagramShortcode(url: string): string | null {
  return url.match(IG_POST_URL_PATTERN)?.[1] ?? null;
}

export interface AddReferencePostInput {
  handle: string;
  url: string;
  caption: string | null;
  thumbUrl: string | null;
}

// There's no API access to another creator's account, so this is manual
// entry, not a live import — the shortcode becomes the external_id, and
// since there's no real timestamp for a hand-entered post, the date is
// derived from that same id (never defaulted to "today") for the same
// reason every other import path in this app does that.
export async function addReferencePost(input: AddReferencePostInput): Promise<void> {
  const shortcode = extractInstagramShortcode(input.url);
  if (!shortcode) {
    throw new Error(
      "That doesn't look like an Instagram post URL — expected something like instagram.com/p/... or /reel/...",
    );
  }

  await upsert({
    table: "posts",
    conflictColumns: ["platform", "external_id"],
    values: {
      platform: "instagram",
      external_id: shortcode,
      handle: input.handle,
      url: input.url,
      caption: input.caption,
      thumb_url: input.thumbUrl,
      posted_at: derivedDateKeyFromId(shortcode),
    },
  });
}

// Scoped to "not my own handle" so this can never delete a synced post of
// the connected account itself, even if a stale/tampered id is passed in —
// the Inspiration page only ever lists reference posts to begin with, but
// the guard costs nothing and means this function's contract doesn't
// depend on the caller getting that right.
export async function deleteReferencePost(id: number, ownHandle: string): Promise<void> {
  await query("DELETE FROM posts WHERE id = $1 AND handle != $2", [id, ownHandle]);
}

import { query, queryOne } from "./query";

export interface Remake {
  id: number;
  source_post_id: number;
  new_post_id: number | null;
  notes: string | null;
  created_at: string;
}

export async function queueRemake(sourcePostId: number): Promise<Remake> {
  const row = await queryOne<Remake>(
    "INSERT INTO remakes (source_post_id) VALUES ($1) RETURNING id, source_post_id, new_post_id, notes, created_at",
    [sourcePostId],
  );
  if (!row) throw new Error("Failed to queue remake");
  return row;
}

// Every source post already queued as a remake, so Session Prep can gray
// out a "queue as remake" action it's already done instead of letting it
// pile up duplicate rows.
export async function getQueuedRemakeSourceIds(): Promise<Set<number>> {
  const rows = await query<{ source_post_id: number }>(
    "SELECT DISTINCT source_post_id FROM remakes WHERE new_post_id IS NULL",
  );
  return new Set(rows.map((r) => r.source_post_id));
}

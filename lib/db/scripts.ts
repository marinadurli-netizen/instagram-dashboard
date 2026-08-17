import { query, queryOne } from "./query";

export interface QueuedScript {
  id: number;
  topic: string | null;
  hook: string | null;
  body: string | null;
  caption: string | null;
  notes: string | null;
  status: string;
  post_id: number | null;
  created_at: string;
}

export interface SaveScriptInput {
  topic: string;
  hook: string;
  script: string;
  caption: string;
  notes: string;
}

// Queues a script straight from the AI script route's output. `title`
// mirrors `topic` — nothing else in the app reads `title` yet, but leaving
// it null forever would just be a second, always-empty label for the same
// thing.
export async function queueScript(input: SaveScriptInput): Promise<QueuedScript> {
  const row = await queryOne<QueuedScript>(
    `INSERT INTO scripts (title, topic, hook, body, caption, notes, status)
     VALUES ($1, $1, $2, $3, $4, $5, 'queued')
     RETURNING id, topic, hook, body, caption, notes, status, post_id, created_at`,
    [input.topic, input.hook, input.script, input.caption, input.notes],
  );
  if (!row) throw new Error("Failed to queue script");
  return row;
}

// FIFO — oldest queued script (the one waiting longest to be filmed) comes
// up first in Session Mode.
export async function getQueuedScripts(): Promise<QueuedScript[]> {
  return query<QueuedScript>(
    `SELECT id, topic, hook, body, caption, notes, status, post_id, created_at
     FROM scripts WHERE status = 'queued' ORDER BY created_at ASC`,
  );
}

export async function markScriptFilmed(id: number): Promise<void> {
  await query("UPDATE scripts SET status = 'filmed', updated_at = now() WHERE id = $1", [id]);
}

// Scoped to status = 'queued' so this can only ever remove a mistaken
// queue entry, never a script already marked filmed — that's history, not
// a mistake to undo.
export async function removeScriptFromQueue(id: number): Promise<void> {
  await query("DELETE FROM scripts WHERE id = $1 AND status = 'queued'", [id]);
}

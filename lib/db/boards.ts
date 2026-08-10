import { query, queryOne } from "./query";

export interface Board {
  id: number;
  name: string;
  created_at: string;
}

export interface BoardWithPosts extends Board {
  postIds: number[];
}

// One query for boards, one for every membership row — cheap at this
// scale, and much simpler than N+1'ing a membership list per board.
export async function getBoardsWithMembership(): Promise<BoardWithPosts[]> {
  const boards = await query<Board>("SELECT id, name, created_at FROM boards ORDER BY created_at ASC");
  const memberships = await query<{ board_id: number; post_id: number }>(
    "SELECT board_id, post_id FROM board_posts",
  );

  const byBoard = new Map<number, number[]>();
  for (const m of memberships) {
    const list = byBoard.get(m.board_id) ?? [];
    list.push(m.post_id);
    byBoard.set(m.board_id, list);
  }

  return boards.map((b) => ({ ...b, postIds: byBoard.get(b.id) ?? [] }));
}

export async function createBoard(name: string): Promise<Board> {
  const row = await queryOne<Board>(
    "INSERT INTO boards (name) VALUES ($1) RETURNING id, name, created_at",
    [name],
  );
  if (!row) throw new Error("Failed to create board");
  return row;
}

// Tap-to-toggle: no separate "add"/"remove" endpoints, just flip
// membership and report which way it went so the UI can update optimistically.
export async function togglePostInBoard(boardId: number, postId: number): Promise<boolean> {
  const existing = await queryOne<{ board_id: number }>(
    "SELECT board_id FROM board_posts WHERE board_id = $1 AND post_id = $2",
    [boardId, postId],
  );
  if (existing) {
    await query("DELETE FROM board_posts WHERE board_id = $1 AND post_id = $2", [boardId, postId]);
    return false;
  }
  await query("INSERT INTO board_posts (board_id, post_id) VALUES ($1, $2)", [boardId, postId]);
  return true;
}

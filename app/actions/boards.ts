"use server";

import { revalidatePath } from "next/cache";
import { createBoard, togglePostInBoard } from "@/lib/db/boards";

export async function createBoardAction(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await createBoard(trimmed);
  revalidatePath("/boards");
}

export async function togglePostInBoardAction(boardId: number, postId: number): Promise<void> {
  await togglePostInBoard(boardId, postId);
  revalidatePath("/boards");
}

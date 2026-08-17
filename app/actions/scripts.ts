"use server";

import { revalidatePath } from "next/cache";
import {
  queueScript,
  markScriptFilmed,
  removeScriptFromQueue,
  requeueScript,
  toggleScriptFavorite,
  type SaveScriptInput,
} from "@/lib/db/scripts";

function revalidateScriptPaths(): void {
  revalidatePath("/scripts");
  revalidatePath("/scripts/library");
  revalidatePath("/session");
  revalidatePath("/session-prep");
}

export async function saveScriptToQueueAction(input: SaveScriptInput): Promise<void> {
  await queueScript(input);
  revalidateScriptPaths();
}

export async function markScriptFilmedAction(id: number): Promise<void> {
  await markScriptFilmed(id);
  revalidateScriptPaths();
}

export async function removeScriptFromQueueAction(id: number): Promise<void> {
  await removeScriptFromQueue(id);
  revalidateScriptPaths();
}

export async function requeueScriptAction(id: number): Promise<void> {
  await requeueScript(id);
  revalidateScriptPaths();
}

export async function toggleScriptFavoriteAction(id: number): Promise<void> {
  await toggleScriptFavorite(id);
  revalidateScriptPaths();
}

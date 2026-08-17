"use server";

import { revalidatePath } from "next/cache";
import {
  queueScript,
  markScriptFilmed,
  removeScriptFromQueue,
  type SaveScriptInput,
} from "@/lib/db/scripts";

export async function saveScriptToQueueAction(input: SaveScriptInput): Promise<void> {
  await queueScript(input);
  revalidatePath("/scripts");
  revalidatePath("/session");
  revalidatePath("/session-prep");
}

export async function markScriptFilmedAction(id: number): Promise<void> {
  await markScriptFilmed(id);
  revalidatePath("/scripts");
  revalidatePath("/session");
}

export async function removeScriptFromQueueAction(id: number): Promise<void> {
  await removeScriptFromQueue(id);
  revalidatePath("/scripts");
  revalidatePath("/session");
}

"use server";

import { revalidatePath } from "next/cache";
import { queueScript, markScriptFilmed, type SaveScriptInput } from "@/lib/db/scripts";

export async function saveScriptToQueueAction(input: SaveScriptInput): Promise<void> {
  await queueScript(input);
  revalidatePath("/session");
  revalidatePath("/session-prep");
}

export async function markScriptFilmedAction(id: number): Promise<void> {
  await markScriptFilmed(id);
  revalidatePath("/session");
}

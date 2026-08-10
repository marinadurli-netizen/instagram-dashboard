"use server";

import { revalidatePath } from "next/cache";
import { queueRemake } from "@/lib/db/remakes";

export async function queueRemakeAction(postId: number): Promise<void> {
  await queueRemake(postId);
  revalidatePath("/session-prep");
}

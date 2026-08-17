"use server";

import { revalidatePath } from "next/cache";
import { addReferencePost, deleteReferencePost } from "@/lib/db/inspiration";
import { getProfile } from "@/lib/db/profile";

export interface AddReferencePostFields {
  handle: string;
  url: string;
  caption: string;
  thumbUrl: string;
}

export async function addReferencePostAction(
  fields: AddReferencePostFields,
): Promise<{ error?: string }> {
  const handle = fields.handle.trim().replace(/^@/, "");
  const url = fields.url.trim();
  if (!handle) return { error: "Handle is required" };
  if (!url) return { error: "Post URL is required" };

  try {
    await addReferencePost({
      handle,
      url,
      caption: fields.caption.trim() || null,
      thumbUrl: fields.thumbUrl.trim() || null,
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath("/inspiration");
  return {};
}

export async function deleteReferencePostAction(id: number): Promise<void> {
  const profile = await getProfile();
  if (!profile?.handle) return;
  await deleteReferencePost(id, profile.handle);
  revalidatePath("/inspiration");
}

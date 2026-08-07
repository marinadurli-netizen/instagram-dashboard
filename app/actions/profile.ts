"use server";

import { revalidatePath } from "next/cache";
import { updateProfile, type ProfileEditableFields } from "@/lib/db/profile";

export async function saveProfileField(fields: ProfileEditableFields): Promise<void> {
  await updateProfile(fields);
  revalidatePath("/dashboard");
}

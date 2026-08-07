import { queryOne } from "./query";
import { upsert } from "./upsert";

export interface Profile {
  id: number;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers: number | null;
  timezone: string;
}

export async function getProfile(): Promise<Profile | undefined> {
  return queryOne<Profile>(
    "SELECT id, display_name, handle, avatar_url, bio, followers, timezone FROM profile WHERE id = 1",
  );
}

export interface ProfileEditableFields {
  display_name?: string | null;
  handle?: string | null;
  bio?: string | null;
  followers?: number | null;
  avatar_url?: string | null;
}

// Inline-edit save path. A `null` here means "clear this field" is not
// distinguishable from "leave it alone" under upsert()'s COALESCE
// semantics — the profile header always sends the full current value for
// every field it renders, so that's never actually needed in practice.
export async function updateProfile(fields: ProfileEditableFields): Promise<Profile | undefined> {
  const row = await upsert({
    table: "profile",
    conflictColumns: ["id"],
    values: { id: 1, ...fields },
  });
  return row as Profile | undefined;
}

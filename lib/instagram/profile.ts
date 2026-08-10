import { graphFetch } from "./client";

const PROFILE_FIELDS = "username,name,biography,followers_count,media_count";

export interface RawIgProfile {
  id: string;
  username?: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  media_count?: number;
}

export async function fetchProfile(igUserId: string, accessToken: string): Promise<RawIgProfile> {
  return graphFetch<RawIgProfile>(`/${igUserId}`, {
    fields: PROFILE_FIELDS,
    access_token: accessToken,
  });
}

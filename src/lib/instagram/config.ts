export const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION ?? "v21.0";
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
export const FACEBOOK_OAUTH_DIALOG_URL = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getMetaAppId(): string {
  return requireEnv("META_APP_ID");
}

export function getMetaAppSecret(): string {
  return requireEnv("META_APP_SECRET");
}

// Apps created with the Facebook Login for Business flow bundle permissions
// into a Configuration (App Dashboard > Facebook Login for Business >
// Configurations) instead of listing `scope` on the OAuth dialog directly.
export function getMetaConfigId(): string {
  return requireEnv("META_CONFIG_ID");
}

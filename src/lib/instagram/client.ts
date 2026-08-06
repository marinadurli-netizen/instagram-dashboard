import { GRAPH_API_BASE } from "./config";

export interface GraphErrorBody {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class GraphApiError extends Error {
  status: number;
  code?: number;
  type?: string;

  constructor(message: string, status: number, body?: GraphErrorBody) {
    super(message);
    this.name = "GraphApiError";
    this.status = status;
    this.code = body?.code;
    this.type = body?.type;
  }
}

async function requestWithRetry(url: string, init?: RequestInit, attempt = 0): Promise<Response> {
  const res = await fetch(url, init);
  // Retry transient server-side failures only; 4xx are permanent for a given request.
  if (res.status >= 500 && attempt < 3) {
    const delayMs = 500 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return requestWithRetry(url, init, attempt + 1);
  }
  return res;
}

function warnIfNearRateLimit(res: Response): void {
  const usage = res.headers.get("x-business-use-case-usage") ?? res.headers.get("x-app-usage");
  if (usage && /"(call_count|total_cputime|total_time)":\s*(9[0-9]|100)\b/.test(usage)) {
    console.warn(`Instagram Graph API usage near rate limit: ${usage}`);
  }
}

// A non-JSON body (proxy/CDN error page, HTML error page, empty body) means
// something between us and Meta broke, not a Graph API error — surface that
// distinctly instead of letting JSON.parse's cryptic SyntaxError propagate.
async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new GraphApiError(
      `Non-JSON response from Graph API (HTTP ${res.status}): ${text.slice(0, 200)}`,
      res.status,
    );
  }
}

export async function graphFetch<T>(
  path: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const res = await requestWithRetry(url.toString());
  warnIfNearRateLimit(res);
  const body = await parseJsonResponse(res);

  if (!res.ok || body.error) {
    throw new GraphApiError(
      body.error?.message ?? `Graph API request failed (HTTP ${res.status})`,
      res.status,
      body.error,
    );
  }

  return body as T;
}

export interface BatchRequestItem {
  method: string;
  relative_url: string;
}

export interface BatchResponseItem {
  code: number;
  body: string;
}

export async function graphBatch(
  accessToken: string,
  requests: BatchRequestItem[],
): Promise<BatchResponseItem[]> {
  const res = await requestWithRetry(`${GRAPH_API_BASE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: accessToken,
      batch: JSON.stringify(requests),
    }),
  });
  warnIfNearRateLimit(res);
  const body = await parseJsonResponse(res);

  if (!res.ok || body.error) {
    throw new GraphApiError(
      body.error?.message ?? `Graph API batch request failed (HTTP ${res.status})`,
      res.status,
      body.error,
    );
  }

  return body as BatchResponseItem[];
}

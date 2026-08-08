import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/query";
import { getProfile } from "@/lib/db/profile";
import { getPostsForAnalysis } from "@/lib/db/posts";
import { completeJson } from "@/lib/ai/complete";
import { formatPostsTable } from "@/lib/ai/format";
import { SIGNAL_READING_GUIDE } from "@/lib/ai/signals";
import { isAdminAuthorized } from "@/lib/http/adminAuth";
import { HttpError } from "@/lib/http/errors";

const VALID_KINDS = new Set(["win", "warning", "idea"]);

interface Pattern {
  kind: "win" | "warning" | "idea";
  title: string;
  body: string;
  headline_metric: string;
}

function validatePatterns(value: unknown): Pattern[] {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(`Expected a JSON array of exactly 4 patterns, got: ${JSON.stringify(value).slice(0, 200)}`);
  }
  return value.map((item, i) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !VALID_KINDS.has((item as Record<string, unknown>).kind as string) ||
      typeof (item as Record<string, unknown>).title !== "string" ||
      typeof (item as Record<string, unknown>).body !== "string" ||
      typeof (item as Record<string, unknown>).headline_metric !== "string"
    ) {
      throw new Error(`Pattern ${i} is malformed: ${JSON.stringify(item).slice(0, 200)}`);
    }
    return item as Pattern;
  });
}

const SYSTEM_PROMPT = `You are a content-analytics assistant for an Instagram creator's own post library. You will be given a compact pipe-delimited table of that creator's posts with their metrics.

${SIGNAL_READING_GUIDE}

Find exactly four patterns across this creator's post library — real, specific, and each grounded in numbers from the data provided. Do not invent numbers that aren't derivable from the table.

Return ONLY a JSON array of exactly 4 objects, no prose before or after, no markdown fences. Each object must have exactly these keys:
- "kind": one of "win", "warning", "idea"
- "title": a short, specific label, under 8 words
- "body": 1-3 sentences citing real numbers from the data
- "headline_metric": a short quantified string, e.g. "+42% saves vs median" or "3.1x views/reach"`;

async function runInsights(): Promise<{ patterns: Pattern[] }> {
  const profile = await getProfile();
  const handle = profile?.handle;
  if (!handle) {
    throw new HttpError(400, "No account connected");
  }

  const posts = await getPostsForAnalysis(handle);
  if (posts.length === 0) {
    throw new HttpError(400, "No posts to analyze yet");
  }

  const patterns = await completeJson<unknown>({
    system: SYSTEM_PROMPT,
    prompt: `Here are ${posts.length} posts:\n\n${formatPostsTable(posts)}`,
    // 4 short objects is maybe 600-1000 tokens of actual JSON; budget the
    // thinking well above that and max_tokens well above the budget.
    thinkingBudget: 4000,
    maxTokens: 8000,
  }).then(validatePatterns);

  // "Replace the stored set each run" — these rows (post_id IS NULL) are
  // only ever written by this route, so clearing all of them is safe.
  await query("DELETE FROM insights WHERE post_id IS NULL");
  for (const pattern of patterns) {
    await query(
      "INSERT INTO insights (post_id, kind, title, content, headline_metric, model) VALUES (NULL, $1, $2, $3, $4, $5)",
      [
        pattern.kind,
        pattern.title,
        pattern.body,
        pattern.headline_metric,
        process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      ],
    );
  }

  return { patterns };
}

function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const error = err as Error;
  console.error("AI insights failed:", error);
  return NextResponse.json({ error: `${error.name}: ${error.message}` }, { status: 500 });
}

export async function POST(): Promise<NextResponse> {
  try {
    return NextResponse.json(await runInsights());
  } catch (err) {
    return handleError(err);
  }
}

// Manual-test fallback: /api/ai/insights?secret=<ADMIN_SECRET>
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminAuthorized(request.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    return NextResponse.json(await runInsights());
  } catch (err) {
    return handleError(err);
  }
}

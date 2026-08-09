import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/query";
import { getProfile } from "@/lib/db/profile";
import { getMedianRates, getPostForReview } from "@/lib/db/posts";
import { completeJson } from "@/lib/ai/complete";
import { formatPostForReview } from "@/lib/ai/format";
import { SIGNAL_READING_GUIDE } from "@/lib/ai/signals";
import { isAdminAuthorized } from "@/lib/http/adminAuth";
import { HttpError } from "@/lib/http/errors";

const VALID_VERDICTS = new Set(["win", "flop", "ok"]);

interface Verdict {
  verdict: "win" | "flop" | "ok";
  explanation: string;
}

function validateVerdict(value: unknown): Verdict {
  if (
    typeof value !== "object" ||
    value === null ||
    !VALID_VERDICTS.has((value as Record<string, unknown>).verdict as string) ||
    typeof (value as Record<string, unknown>).explanation !== "string"
  ) {
    throw new Error(`Malformed verdict response: ${JSON.stringify(value).slice(0, 200)}`);
  }
  return value as Verdict;
}

const SYSTEM_PROMPT = `You are reviewing a single Instagram post's performance against this creator's own historical median rates.

${SIGNAL_READING_GUIDE}

Give a verdict: "win" (clearly above this creator's own median performance), "flop" (clearly below), or "ok" (roughly in line). Be blunt — do not soften a flop to spare feelings, and do not call something a win just because it has a lot of raw views if its rates are actually below median.

Return ONLY a JSON object, no prose before or after, no markdown fences, with exactly these keys:
- "verdict": "win" | "flop" | "ok"
- "explanation": 2-4 sentences, blunt, citing the specific numbers you compared`;

async function runReview(postId: number): Promise<Verdict> {
  const profile = await getProfile();
  const handle = profile?.handle;
  if (!handle) {
    throw new HttpError(400, "No account connected");
  }

  // Scoped to handle at the fetch itself — a postId belonging to a
  // reference post imported from another creator simply won't resolve.
  const post = await getPostForReview(postId, handle);
  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  const medians = await getMedianRates(handle);

  const result = await completeJson<unknown>({
    system: SYSTEM_PROMPT,
    prompt: formatPostForReview(post, medians),
    // A verdict + a few sentences is maybe 150-300 tokens of JSON, but the
    // comparison against medians is worth thinking about — and thinking
    // shares this budget with the answer.
    effort: "medium",
    maxTokens: 8000,
  }).then(validateVerdict);

  await query("UPDATE posts SET review = $1, verdict = $2 WHERE id = $3 AND handle = $4", [
    result.explanation,
    result.verdict,
    postId,
    handle,
  ]);

  return result;
}

function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const error = err as Error;
  console.error("AI review failed:", error);
  return NextResponse.json({ error: `${error.name}: ${error.message}` }, { status: 500 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const postId = Number(body?.postId);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: "postId (integer) is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await runReview(postId));
  } catch (err) {
    return handleError(err);
  }
}

// Manual-test fallback: /api/ai/review?postId=...&secret=<ADMIN_SECRET>
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminAuthorized(request.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const postIdParam = request.nextUrl.searchParams.get("postId");
  // Number(null) is 0, not NaN — a missing param must not silently become
  // "review post #0" instead of a clear 400.
  const postId = postIdParam ? Number(postIdParam) : NaN;
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: "?postId= (integer) is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await runReview(postId));
  } catch (err) {
    return handleError(err);
  }
}

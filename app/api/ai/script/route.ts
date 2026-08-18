import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/db/profile";
import { getPostForModel } from "@/lib/db/posts";
import { completeJson } from "@/lib/ai/complete";
import { describeAiError } from "@/lib/ai/errors";
import { isAdminAuthorized } from "@/lib/http/adminAuth";
import { HttpError } from "@/lib/http/errors";

// Default Vercel function duration is too short for a "medium" effort
// thinking call plus the SDK's own retry-with-backoff on a transient
// upstream error (429/500/503/529) — this gives both room to finish.
export const maxDuration = 60;

interface ScriptResult {
  hook: string;
  script: string;
  caption: string;
  notes: string;
}

function validateScript(value: unknown): ScriptResult {
  const v = value as Record<string, unknown>;
  if (
    typeof value !== "object" ||
    value === null ||
    typeof v.hook !== "string" ||
    typeof v.script !== "string" ||
    typeof v.caption !== "string" ||
    typeof v.notes !== "string"
  ) {
    throw new Error(`Malformed script response: ${JSON.stringify(value).slice(0, 200)}`);
  }
  return value as ScriptResult;
}

const SYSTEM_PROMPT = `You are a scriptwriter for a short-form video content creator's Instagram Reels.

Given a topic — and optionally a past post of theirs to model the structure, tone, and pacing on — write a new script for that topic.

Return ONLY a JSON object, no prose before or after, no markdown fences, with exactly these keys:
- "hook": the opening line, written to be spoken in under 3 seconds
- "script": the full spoken script, written beat by beat
- "caption": a ready-to-post Instagram caption for this video
- "notes": short filming/delivery notes — pacing, on-screen text, b-roll suggestions`;

async function runScript(topic: string, modelPostId?: number): Promise<ScriptResult> {
  let modelPostContext = "";
  if (modelPostId !== undefined) {
    const profile = await getProfile();
    const handle = profile?.handle;
    if (!handle) {
      throw new HttpError(400, "No account connected");
    }
    // Scoped to handle — can only model on your own past posts, never a
    // reference post imported from another creator.
    const modelPost = await getPostForModel(modelPostId, handle);
    if (!modelPost) {
      throw new HttpError(404, "modelPostId not found");
    }
    modelPostContext = [
      "",
      "Model the new script's structure, tone, and pacing on this past post of mine:",
      `Caption: ${modelPost.caption ?? "(none)"}`,
      modelPost.script ? `Script: ${modelPost.script}` : "",
      `Performance: views=${modelPost.views} likes=${modelPost.likes} comments=${modelPost.comments} shares=${modelPost.shares} saves=${modelPost.saves} reach=${modelPost.reach}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return completeJson<unknown>({
    system: SYSTEM_PROMPT,
    prompt: `Topic: ${topic}${modelPostContext}`,
    // Hook + full script + caption + notes can run a few hundred words, and
    // thinking shares this budget with them.
    effort: "medium",
    maxTokens: 12000,
  }).then(validateScript);
}

function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("AI script failed:", err);
  const { status, message } = describeAiError(err);
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  if (!topic) {
    return NextResponse.json({ error: "topic (string) is required" }, { status: 400 });
  }
  const modelPostId = body?.modelPostId != null ? Number(body.modelPostId) : undefined;
  if (modelPostId !== undefined && !Number.isInteger(modelPostId)) {
    return NextResponse.json({ error: "modelPostId must be an integer" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runScript(topic, modelPostId));
  } catch (err) {
    return handleError(err);
  }
}

// Manual-test fallback: /api/ai/script?topic=...&modelPostId=...&secret=<ADMIN_SECRET>
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminAuthorized(request.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const topic = request.nextUrl.searchParams.get("topic")?.trim() ?? "";
  if (!topic) {
    return NextResponse.json({ error: "?topic= is required" }, { status: 400 });
  }
  const modelPostIdParam = request.nextUrl.searchParams.get("modelPostId");
  const modelPostId = modelPostIdParam ? Number(modelPostIdParam) : undefined;
  if (modelPostId !== undefined && !Number.isInteger(modelPostId)) {
    return NextResponse.json({ error: "modelPostId must be an integer" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runScript(topic, modelPostId));
  } catch (err) {
    return handleError(err);
  }
}

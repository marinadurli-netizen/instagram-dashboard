import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/db/profile";
import { getPostForModel } from "@/lib/db/posts";
import { completeJson } from "@/lib/ai/complete";

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json({ error: "topic (string) is required" }, { status: 400 });
    }
    const modelPostId = body?.modelPostId != null ? Number(body.modelPostId) : undefined;
    if (modelPostId !== undefined && !Number.isInteger(modelPostId)) {
      return NextResponse.json({ error: "modelPostId must be an integer" }, { status: 400 });
    }

    let modelPostContext = "";
    if (modelPostId !== undefined) {
      const profile = await getProfile();
      const handle = profile?.handle;
      if (!handle) {
        return NextResponse.json({ error: "No account connected" }, { status: 400 });
      }
      // Scoped to handle — can only model on your own past posts, never a
      // reference post imported from another creator.
      const modelPost = await getPostForModel(modelPostId, handle);
      if (!modelPost) {
        return NextResponse.json({ error: "modelPostId not found" }, { status: 404 });
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

    const result = await completeJson<unknown>({
      system: SYSTEM_PROMPT,
      prompt: `Topic: ${topic}${modelPostContext}`,
      // Hook + full script + caption + notes can run a few hundred words.
      thinkingBudget: 2500,
      maxTokens: 6000,
    }).then(validateScript);

    return NextResponse.json(result);
  } catch (err) {
    const error = err as Error;
    console.error("AI script failed:", error);
    return NextResponse.json({ error: `${error.name}: ${error.message}` }, { status: 500 });
  }
}

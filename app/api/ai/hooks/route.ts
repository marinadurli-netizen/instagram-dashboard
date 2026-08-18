import { NextRequest, NextResponse } from "next/server";
import { completeJson } from "@/lib/ai/complete";
import { describeAiError } from "@/lib/ai/errors";
import { isAdminAuthorized } from "@/lib/http/adminAuth";

// Default Vercel function duration is too short for a "medium" effort
// thinking call plus the SDK's own retry-with-backoff on a transient
// upstream error (429/500/503/529) — this gives both room to finish.
export const maxDuration = 60;

const ARCHETYPES = [
  "identity_anchor",
  "qualifying_question",
  "command_with_urgency",
  "shared_memory",
  "stakes_claim",
  "direct_dare",
  "contrarian_take",
  "curiosity_gap",
] as const;

interface HookItem {
  archetype: (typeof ARCHETYPES)[number];
  hook: string;
  rationale: string;
}

function validateHooks(value: unknown): HookItem[] {
  if (!Array.isArray(value) || value.length !== 8) {
    throw new Error(`Expected a JSON array of exactly 8 hooks, got: ${JSON.stringify(value).slice(0, 200)}`);
  }
  const seen = new Set<string>();
  const result = value.map((item, i) => {
    const archetype = (item as Record<string, unknown>)?.archetype;
    const hook = (item as Record<string, unknown>)?.hook;
    const rationale = (item as Record<string, unknown>)?.rationale;
    if (
      typeof archetype !== "string" ||
      !ARCHETYPES.includes(archetype as (typeof ARCHETYPES)[number]) ||
      typeof hook !== "string" ||
      typeof rationale !== "string"
    ) {
      throw new Error(`Hook ${i} is malformed: ${JSON.stringify(item).slice(0, 200)}`);
    }
    seen.add(archetype);
    return item as HookItem;
  });
  if (seen.size !== ARCHETYPES.length) {
    throw new Error(`Expected one hook per archetype, got: ${JSON.stringify(value).slice(0, 300)}`);
  }
  return result;
}

const SYSTEM_PROMPT = `You are a hook writer for short-form video. Given a topic, write exactly one opening line for each of these eight archetypes:

1. identity_anchor — speaks to who the viewer is (e.g. "If you're a first-time buyer...")
2. qualifying_question — a question that filters the right viewer in
3. command_with_urgency — an imperative demanding immediate attention
4. shared_memory — invokes a common experience the viewer will recognize
5. stakes_claim — states what's at risk or on the line
6. direct_dare — dares the viewer to do or admit something
7. contrarian_take — challenges a common belief
8. curiosity_gap — withholds information to create curiosity

Return ONLY a JSON array of exactly 8 objects, no prose before or after, no markdown fences. Each object must have exactly these keys:
- "archetype": exactly one of "identity_anchor", "qualifying_question", "command_with_urgency", "shared_memory", "stakes_claim", "direct_dare", "contrarian_take", "curiosity_gap" — each used exactly once
- "hook": the actual opening line, written to be spoken aloud
- "rationale": one sentence on why this hook works for this specific topic`;

async function runHooks(topic: string): Promise<{ hooks: HookItem[] }> {
  const hooks = await completeJson<unknown>({
    system: SYSTEM_PROMPT,
    prompt: `Topic: ${topic}`,
    // 8 one-liners plus a one-sentence rationale each, maybe 600-900 tokens
    // of JSON — but thinking shares this budget, so leave it plenty of room.
    effort: "medium",
    maxTokens: 8000,
  }).then(validateHooks);
  return { hooks };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json({ error: "topic (string) is required" }, { status: 400 });
    }
    return NextResponse.json(await runHooks(topic));
  } catch (err) {
    console.error("AI hooks failed:", err);
    const { status, message } = describeAiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

// Manual-test fallback: /api/ai/hooks?topic=...&secret=<ADMIN_SECRET>
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminAuthorized(request.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const topic = request.nextUrl.searchParams.get("topic")?.trim() ?? "";
  if (!topic) {
    return NextResponse.json({ error: "?topic= is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await runHooks(topic));
  } catch (err) {
    console.error("AI hooks failed:", err);
    const { status, message } = describeAiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { completeJson } from "@/lib/ai/complete";

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
}

function validateHooks(value: unknown): HookItem[] {
  if (!Array.isArray(value) || value.length !== 8) {
    throw new Error(`Expected a JSON array of exactly 8 hooks, got: ${JSON.stringify(value).slice(0, 200)}`);
  }
  const seen = new Set<string>();
  const result = value.map((item, i) => {
    const archetype = (item as Record<string, unknown>)?.archetype;
    const hook = (item as Record<string, unknown>)?.hook;
    if (
      typeof archetype !== "string" ||
      !ARCHETYPES.includes(archetype as (typeof ARCHETYPES)[number]) ||
      typeof hook !== "string"
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
- "hook": the actual opening line, written to be spoken aloud`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json({ error: "topic (string) is required" }, { status: 400 });
    }

    const hooks = await completeJson<unknown>({
      system: SYSTEM_PROMPT,
      prompt: `Topic: ${topic}`,
      // 8 short one-liners, maybe 300-500 tokens of JSON.
      thinkingBudget: 2000,
      maxTokens: 4500,
    }).then(validateHooks);

    return NextResponse.json({ hooks });
  } catch (err) {
    const error = err as Error;
    console.error("AI hooks failed:", error);
    return NextResponse.json({ error: `${error.name}: ${error.message}` }, { status: 500 });
  }
}

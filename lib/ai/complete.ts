import { AI_MODEL, getAnthropicClient } from "./client";
import { extractJson } from "./json";

/** Thinking depth / overall token spend. Higher costs more and takes longer. */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface CompleteJsonOptions {
  system: string;
  prompt: string;
  effort: Effort;
  /**
   * Must be well above the JSON you actually expect back. Thinking is on by
   * default on current models and `max_tokens` caps thinking *plus* the
   * response text together — a tight limit doesn't shrink the thinking, it
   * truncates the answer, and a truncated answer looks exactly like a parser
   * bug from the outside.
   */
  maxTokens: number;
}

export async function completeJson<T>({
  system,
  prompt,
  effort,
  maxTokens,
}: CompleteJsonOptions): Promise<T> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    // Adaptive thinking: the model decides how much to think per request.
    // (The older `{type: "enabled", budget_tokens: N}` form is rejected with
    // a 400 on current models — depth is controlled by `effort` instead.)
    thinking: { type: "adaptive" },
    output_config: { effort },
    system,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to answer this request.");
  }

  // Thinking blocks interleave with the final text block, so the answer is
  // the last text block, not the first content block overall.
  const textBlocks = response.content.filter((block) => block.type === "text");
  const lastText = textBlocks.at(-1);
  if (!lastText || lastText.type !== "text") {
    throw new Error(
      `No text content in model response (stop_reason: ${response.stop_reason}). If stop_reason is "max_tokens", raise maxTokens.`,
    );
  }

  return extractJson(lastText.text) as T;
}

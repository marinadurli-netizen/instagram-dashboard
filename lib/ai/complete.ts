import { AI_MODEL, getAnthropicClient } from "./client";
import { extractJson } from "./json";

export interface CompleteJsonOptions {
  system: string;
  prompt: string;
  /** Tokens reserved for the model's internal reasoning, not part of the visible output. */
  thinkingBudget: number;
  /**
   * Must be well above thinkingBudget + the JSON you actually expect back.
   * With extended thinking on, the model spends part of max_tokens on an
   * internal thinking block before it ever writes the JSON — a tight
   * limit here doesn't shrink the thinking, it truncates the answer, and
   * a truncated answer looks exactly like a parser bug from the outside.
   */
  maxTokens: number;
}

export async function completeJson<T>({
  system,
  prompt,
  thinkingBudget,
  maxTokens,
}: CompleteJsonOptions): Promise<T> {
  if (maxTokens <= thinkingBudget) {
    throw new Error(
      `maxTokens (${maxTokens}) must be greater than thinkingBudget (${thinkingBudget}) or there's no room left for the actual output`,
    );
  }

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    thinking: { type: "enabled", budget_tokens: thinkingBudget },
    system,
    messages: [{ role: "user", content: prompt }],
  });

  // With thinking enabled, content interleaves "thinking" blocks with the
  // final "text" block — the answer is the last text block, not the first
  // content block overall.
  const textBlocks = response.content.filter((block) => block.type === "text");
  const lastText = textBlocks.at(-1);
  if (!lastText || lastText.type !== "text") {
    throw new Error(
      `No text content in model response (stop_reason: ${response.stop_reason}). If stop_reason is "max_tokens", raise maxTokens.`,
    );
  }

  return extractJson(lastText.text) as T;
}

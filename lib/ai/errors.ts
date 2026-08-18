import Anthropic from "@anthropic-ai/sdk";

// Anthropic's SDK retries retryable statuses (429/500/502/503/529) a
// couple of times on its own before this ever throws — this only fires
// once that's exhausted, i.e. genuinely still overloaded/unavailable. The
// raw error otherwise reaching the client is the SDK's error-response
// body verbatim (e.g. `{"type":"error","error":{"type":"overloaded_error"...`),
// which is fine in server logs but not something to show as-is in the UI.
export function describeAiError(err: unknown): { status: number; message: string } {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 529) {
      return { status: 503, message: "Claude is temporarily overloaded — try again in a moment." };
    }
    if (err.status === 429) {
      return { status: 503, message: "Rate limited — try again in a moment." };
    }
    if (typeof err.status === "number" && err.status >= 500) {
      return { status: 503, message: "Claude is temporarily unavailable — try again in a moment." };
    }
  }
  const error = err as Error;
  return { status: 500, message: `${error.name}: ${error.message}` };
}

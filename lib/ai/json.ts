// Tries a plain JSON.parse first (the common case: the model returned
// exactly the JSON we asked for). Falls back to a bracket walk that
// tracks whether it's inside a string literal, so a `{` or `}` inside a
// caption quoted in the model's output can't corrupt the brace count —
// and so any stray prose the model wrapped around the JSON (a "Here's the
// analysis:" preamble, a trailing note, a ```json fence) gets stripped.
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to the bracket walk
  }
  return bracketWalkExtract(trimmed);
}

function bracketWalkExtract(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start === -1) {
    throw new Error("No JSON object or array found in model output");
  }
  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) {
      depth++;
    } else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }

  throw new Error("Unbalanced JSON in model output");
}

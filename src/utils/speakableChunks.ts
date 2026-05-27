/**
 * Split streaming LLM text into small chunks for low-latency TTS.
 * Prefer early speech over perfect sentence boundaries.
 */
export function extractSpeakableChunks(
  buffer: string,
  minChars = 6,
  maxBuffer = 22,
): { chunks: string[]; remaining: string } {
  const chunks: string[] = [];
  let remaining = buffer;

  const phrasePattern = /^([\s\S]*?[.!?])(?:\s+|$)/;

  while (remaining.length >= minChars) {
    const match = remaining.match(phrasePattern);
    if (match && match[1].trim().length >= minChars) {
      chunks.push(match[1].trim());
      remaining = remaining.slice(match[0].length);
      continue;
    }
    break;
  }

  // Clause / comma — speak sooner than waiting for a full sentence
  const clausePattern = /^([\s\S]*?[,;:])(?:\s+|$)/;
  if (remaining.length >= minChars + 2) {
    const clause = remaining.match(clausePattern);
    if (clause && clause[1].trim().length >= minChars) {
      chunks.push(clause[1].trim());
      remaining = remaining.slice(clause[0].length);
    }
  }

  // Word boundary — don't wait for punctuation
  if (remaining.length >= maxBuffer) {
    const breakAt = remaining.lastIndexOf(' ', maxBuffer);
    if (breakAt >= minChars) {
      chunks.push(remaining.slice(0, breakAt).trim());
      remaining = remaining.slice(breakAt).trimStart();
    }
  } else if (remaining.length >= 12) {
    const breakAt = remaining.lastIndexOf(' ');
    if (breakAt >= minChars) {
      chunks.push(remaining.slice(0, breakAt).trim());
      remaining = remaining.slice(breakAt).trimStart();
    }
  }

  return { chunks, remaining };
}

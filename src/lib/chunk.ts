/**
 * Splits text into semantic chunks at paragraph then sentence boundaries.
 * Used to break large pastes into manageable LLM calls without mid-thought splits.
 */
export function chunkText(text: string, maxChars: number): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (!current) {
      current = para;
    } else if (current.length + 2 + para.length <= maxChars) {
      current += "\n\n" + para;
    } else {
      chunks.push(current);
      current = para;
    }

    // A single paragraph that exceeds maxChars gets split at sentence boundaries.
    while (current.length > maxChars) {
      const cutAt = findSentenceBoundary(current, maxChars);
      chunks.push(current.slice(0, cutAt).trim());
      current = current.slice(cutAt).trim();
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

/** Finds the best cut point at or before maxChars, preferring sentence ends. */
function findSentenceBoundary(text: string, maxChars: number): number {
  const window = text.slice(0, maxChars);
  // Find the last sentence-ending punctuation (handles both space and newline after).
  const last = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
    window.lastIndexOf(".\n"),
    window.lastIndexOf("!\n"),
    window.lastIndexOf("?\n"),
  );
  if (last > 0) return last + 2;
  // Fall back to last space.
  const spaceIdx = window.lastIndexOf(" ");
  return spaceIdx > 0 ? spaceIdx : maxChars;
}

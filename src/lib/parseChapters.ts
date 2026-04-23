export interface Chapter {
  title: string;
  content: string; // raw plain-text content
}

// Heuristic: a line is a heading if it's ≤120 chars, doesn't end in period/comma/semicolon,
// and is followed (after whitespace) by a non-empty paragraph.
function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return false;
  if (/[.,;]$/.test(trimmed)) return false;
  // Must have at least 2 words (avoid splitting on short sentence fragments)
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return false;
  return true;
}

export function parseChapters(text: string): Chapter[] {
  if (!text.trim()) return [];

  // Normalise line endings
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split into blocks by double newline
  const blocks = normalised.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  if (blocks.length === 0) return [];

  const chapters: Chapter[] = [];
  let currentTitle = "Introducción";
  let currentContent: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isHeading = looksLikeHeading(block) && i < blocks.length - 1;

    if (isHeading && currentContent.length > 0) {
      chapters.push({ title: currentTitle, content: currentContent.join("\n\n") });
      currentTitle = block;
      currentContent = [];
    } else if (isHeading && currentContent.length === 0 && chapters.length === 0) {
      // Very first block — treat as title only if no content yet
      currentTitle = block;
    } else {
      currentContent.push(block);
    }
  }

  if (currentContent.length > 0) {
    chapters.push({ title: currentTitle, content: currentContent.join("\n\n") });
  }

  // If nothing was split, return the whole text as one chapter
  if (chapters.length === 0) {
    return [{ title: currentTitle, content: normalised.trim() }];
  }

  return chapters;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

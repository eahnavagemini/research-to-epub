export interface Chapter {
  title: string;
  content: string; // raw plain-text content
}

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return false;
  if (/[.,;]$/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return false;
  return true;
}

// When text arrives as one big blob (no newlines), split at embedded section
// boundaries: a period/colon followed immediately by an uppercase letter that
// starts a multi-word phrase also ending without sentence punctuation.
// e.g.  "...automatizados.Estrangulamiento del Hardware..." → split before "Estrangulamiento"
function splitMergedBlocks(text: string): string[] {
  // Insert a newline before uppercase words that follow a period/colon with no space
  // Only do this when the sequence looks like SectionTitle (≥2 words, short line)
  const spaced = text.replace(/([.!?:])([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü])/g, "$1\n$2");
  return spaced.split(/\n/).map((s) => s.trim()).filter(Boolean);
}

export function parseChapters(text: string): Chapter[] {
  if (!text.trim()) return [];

  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Priority 1: double newlines
  const byDouble = normalised.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  // Priority 2: single newlines
  const bySingle = normalised.split(/\n/).map((b) => b.trim()).filter(Boolean);
  // Priority 3: detect merged text with no newlines at all
  const blocks =
    byDouble.length > 2 ? byDouble :
    bySingle.length > 2 ? bySingle :
    splitMergedBlocks(normalised);

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

export interface Chapter {
  title: string;
  content: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function norm(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// Heading heuristic for line-based parsing (text with newlines)
function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 150) return false;
  if (/[.,;]$/.test(t)) return false;
  const words = t.split(/\s+/);
  return words.length >= 2 && words.length <= 20;
}

// ── Strategy A: text that already has newlines ────────────────────────────────

function parseWithNewlines(blocks: string[]): Chapter[] {
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
      currentTitle = block;
    } else {
      currentContent.push(block);
    }
  }
  if (currentContent.length > 0) {
    chapters.push({ title: currentTitle, content: currentContent.join("\n\n") });
  }
  return chapters;
}

// ── Strategy B: merged text (AI research without newlines) ───────────────────
// Detects section titles by the pattern:  "Title Phrase: Content that follows..."
// where "Title Phrase" starts with uppercase, has no period inside, ≤ 10 words.

function detectMergedSections(text: string): Chapter[] {
  // Match: optional sentence-end + [Title (no internal period, 2-10 words)]: [Uppercase start]
  const re =
    /(?:^|(?<=[.!?]\s{0,2}))([A-ZÁÉÍÓÚÑÜ][^.!?\n:]{5,100}):\s+(?=[A-ZÁÉÍÓÚÑÜ])/g;

  const sections: { titleStart: number; title: string; contentStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const title = m[1].trim();
    const wordCount = title.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 12) {
      sections.push({ titleStart: m.index, title, contentStart: m.index + m[0].length });
    }
  }

  if (sections.length < 2) {
    return [{ title: "Contenido", content: text.trim() }];
  }

  const chapters: Chapter[] = [];

  // Text before the first section → Introducción
  const prelude = text.slice(0, sections[0].titleStart).trim();
  if (prelude.length > 80) {
    chapters.push({ title: "Introducción", content: prelude });
  }

  for (let i = 0; i < sections.length; i++) {
    const start = sections[i].contentStart;
    const end = i + 1 < sections.length ? sections[i + 1].titleStart : text.length;
    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chapters.push({ title: sections[i].title, content });
    }
  }

  return chapters;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function parseChapters(text: string): Chapter[] {
  if (!text.trim()) return [];
  const n = norm(text);

  // Try structured text (has explicit newlines)
  const byDouble = n.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (byDouble.length > 3) {
    const result = parseWithNewlines(byDouble);
    if (result.length > 1) return result;
  }

  const bySingle = n.split(/\n/).map((b) => b.trim()).filter(Boolean);
  if (bySingle.length > 3) {
    const result = parseWithNewlines(bySingle);
    if (result.length > 1) return result;
  }

  // Fallback: AI research merged text detection
  const merged = detectMergedSections(n);
  if (merged.length > 1) return merged;

  // Last resort: single chapter
  return [{ title: "Contenido", content: n.trim() }];
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

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
  // Pattern A: "Title: Subtitle" — lookbehind allows start, .!? or newline before title
  const reColon =
    /(?:^|(?<=[.!?]\s{0,2})|(?<=\n))([A-ZÁÉÍÓÚÑÜ][^\n!?:]{3,100}):\s+(?=[A-ZÁÉÍÓÚÑÜ])/g;

  // Pattern B: Title Case phrase with NO colon, e.g.
  //   "Síntesis Conclusiva"
  //   "La Guerra de Chips y el Déficit Computacional Masivo"
  // First word is Title Case; subsequent words are either Title Case or short
  // lowercase connectors (≤4 chars: "de", "y", "el", "del", "por", "con", "para"…).
  // Must appear right after sentence-end punctuation and immediately before uppercase.
  const reTitle =
    /(?<=[.!?])([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+(?:[a-záéíóúñü]{1,4}|[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)){1,9})(?=[A-ZÁÉÍÓÚÑÜ])/g;

  type Raw = { titleStart: number; afterColon: number; hasSubtitle: boolean };
  const raw: Raw[] = [];
  let m: RegExpExecArray | null;

  while ((m = reColon.exec(text)) !== null) {
    const wc = m[1].trim().split(/\s+/).length;
    if (wc >= 2 && wc <= 12)
      raw.push({ titleStart: m.index, afterColon: m.index + m[0].length, hasSubtitle: true });
  }

  while ((m = reTitle.exec(text)) !== null) {
    const words = m[1].trim().split(/\s+/);
    const titleCaseCount = words.filter(w => /^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+$/.test(w)).length;
    // Require at least 2 Title Case words so "La de" style garbage is rejected
    if (words.length >= 2 && words.length <= 10 && titleCaseCount >= 2) {
      const pos = m.index;
      const bodyStart = m.index + m[0].length;
      if (!raw.some(r => Math.abs(r.titleStart - pos) < 5))
        raw.push({ titleStart: pos, afterColon: bodyStart, hasSubtitle: false });
    }
  }

  raw.sort((a, b) => a.titleStart - b.titleStart);
  if (raw.length < 2) return [{ title: "Contenido", content: text.trim() }];

  // For colon-style headings, find where the subtitle ends and body begins.
  function findBodyStart(from: number, cap: number): number {
    const br = /(?<!\s)[^A-ZÁÉÍÓÚÑÜ\s][A-ZÁÉÍÓÚÑÜ]/g;
    br.lastIndex = from;
    const bm = br.exec(text);
    if (bm && bm.index < cap) return bm.index + 1;
    return from;
  }

  const sections: { titleStart: number; fullTitle: string; bodyStart: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const cap = i + 1 < raw.length ? raw[i + 1].titleStart : raw[i].afterColon + 400;
    let bodyStart: number;
    if (raw[i].hasSubtitle) {
      bodyStart = findBodyStart(raw[i].afterColon, cap);
    } else {
      bodyStart = raw[i].afterColon; // no-colon: body starts right after title
    }
    const fullTitle = text.slice(raw[i].titleStart, bodyStart).trim();
    sections.push({ titleStart: raw[i].titleStart, fullTitle, bodyStart });
  }

  const chapters: Chapter[] = [];
  const prelude = text.slice(0, sections[0].titleStart).trim();
  if (prelude.length > 80) chapters.push({ title: "Introducción", content: prelude });

  for (let i = 0; i < sections.length; i++) {
    const start = sections[i].bodyStart;
    const end = i + 1 < sections.length ? sections[i + 1].titleStart : text.length;
    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chapters.push({ title: sections[i].fullTitle, content });
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

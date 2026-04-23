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
  // Detect "Short Title: Subtitle" patterns where:
  // - lookbehind: start of string, period/!? (0-2 spaces), or newline
  // - title chars: allow periods so "ChatGPT 2.0", "GPT-4.5" work
  const re =
    /(?:^|(?<=[.!?]\s{0,2})|(?<=\n))([A-ZÁÉÍÓÚÑÜ][^\n!?:]{3,100}):\s+(?=[A-ZÁÉÍÓÚÑÜ])/g;

  // First pass: collect raw matches (position of title + position right after ": ")
  const raw: { titleStart: number; afterColon: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const wc = m[1].trim().split(/\s+/).length;
    if (wc >= 2 && wc <= 12) {
      raw.push({ titleStart: m.index, afterColon: m.index + m[0].length });
    }
  }

  if (raw.length < 2) return [{ title: "Contenido", content: text.trim() }];

  // Second pass: for each section, find where the FULL heading ends and body begins.
  // In merged text the subtitle ends at the first [lowercase][UPPERCASE] transition
  // with NO space between them (e.g. "ContextualEl", "PíxelesEl").
  // Inside the subtitle all capitalized words ARE preceded by a space, so this
  // transition only occurs at the heading→body boundary.
  function findBodyStart(from: number, cap: number): number {
    const br = /[a-záéíóúñü][A-ZÁÉÍÓÚÑÜ]/g;
    br.lastIndex = from;
    const bm = br.exec(text);
    if (bm && bm.index < cap) return bm.index + 1; // body starts at the uppercase letter
    return from; // no boundary found → body starts right after ": "
  }

  const sections: { titleStart: number; fullTitle: string; bodyStart: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const cap = i + 1 < raw.length ? raw[i + 1].titleStart : raw[i].afterColon + 400;
    const bodyStart = findBodyStart(raw[i].afterColon, cap);
    // Full heading = everything from the section start up to where the body begins
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

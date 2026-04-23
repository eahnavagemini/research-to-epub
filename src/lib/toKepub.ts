// Converts plain-text chapter content into KEPUB-annotated HTML.
// KEPUB adds <span class="koboSpan" id="kobo.N.M"> around every paragraph
// so Kobo can track reading position and show statistics.

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Split a single long string (no newlines) into readable paragraphs
// by grouping every SENTENCES_PER_PARA sentences together.
const SENTENCES_PER_PARA = 4;
function sentenceGroups(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (!sentences || sentences.length <= SENTENCES_PER_PARA) return [text.trim()];
  const groups: string[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARA) {
    groups.push(sentences.slice(i, i + SENTENCES_PER_PARA).join("").trim());
  }
  return groups.filter(Boolean);
}

// Get paragraph-level blocks from a chapter's raw text content
function getBlocks(text: string): string[] {
  const n = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const byDouble = n.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (byDouble.length > 1) return byDouble;

  const bySingle = n.split(/\n/).map((b) => b.trim()).filter(Boolean);
  if (bySingle.length > 1) return bySingle;

  // One big blob — split into sentence groups
  return sentenceGroups(n);
}

// Detect pipe-delimited table blocks: |cell|cell|...
function isPipeTable(block: string): boolean {
  const lines = block.split("\n");
  const tableLines = lines.filter((l) => /^\|.+\|$/.test(l.trim()));
  return tableLines.length >= 2 && tableLines.length >= lines.length * 0.6;
}

function renderTable(block: string): string {
  const rows = block
    .split("\n")
    .filter((l) => /^\|.+\|$/.test(l.trim()))
    .map((row) => {
      const cells = row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
    });
  return `<table class="research-table">${rows.join("")}</table>`;
}

// A block is rendered as <h3> if it looks like a subheading:
// short (≤ 120 chars), no terminal period/comma, 2-15 words
function isSubheading(block: string): boolean {
  const t = block.trim();
  if (t.length > 120 || /[.,;]$/.test(t) || t.includes("\n")) return false;
  const words = t.split(/\s+/);
  return words.length >= 2 && words.length <= 15;
}

function renderBlock(block: string, chIdx: number, spanIdx: number): { html: string; nextSpan: number } {
  const t = block.trim();

  if (isPipeTable(t)) {
    return { html: renderTable(t), nextSpan: spanIdx };
  }

  if (isSubheading(t)) {
    return {
      html: `<h3><span class="koboSpan" id="kobo.${chIdx}.${spanIdx}">${escapeHtml(t)}</span></h3>`,
      nextSpan: spanIdx + 1,
    };
  }

  return {
    html: `<p><span class="koboSpan" id="kobo.${chIdx}.${spanIdx}">${escapeHtml(t)}</span></p>`,
    nextSpan: spanIdx + 1,
  };
}

export function plainTextToKepubHtml(text: string, chapterIdx: number): string {
  const blocks = getBlocks(text);
  let spanIdx = 1;
  const parts: string[] = [];

  for (const block of blocks) {
    const { html, nextSpan } = renderBlock(block, chapterIdx + 1, spanIdx);
    parts.push(html);
    spanIdx = nextSpan;
  }

  return parts.join("\n");
}

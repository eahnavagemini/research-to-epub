// Converts a block of plain text into HTML with Kobo KEPUB span annotations.
// KEPUB = standard EPUB where every paragraph is wrapped in:
//   <span class="koboSpan" id="kobo.{chapterIndex}.{spanIndex}">...</span>

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blockToHtml(block: string, chapterIdx: number, spanIdx: number): { html: string; nextSpan: number } {
  const trimmed = block.trim();

  // Pipe table detection: most lines start/end with |
  const lines = trimmed.split("\n");
  const tableLines = lines.filter((l) => /^\|.+\|$/.test(l.trim()));
  if (tableLines.length >= 2 && tableLines.length >= lines.length * 0.6) {
    const rows = tableLines.map((row) => {
      const cells = row
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
      const tag = "td";
      return `<tr>${cells.map((c) => `<${tag}>${escapeHtml(c)}</${tag}>`).join("")}</tr>`;
    });
    return {
      html: `<table class="research-table">${rows.join("")}</table>`,
      nextSpan: spanIdx,
    };
  }

  // Short line heuristic → subheading <h3>
  if (trimmed.length <= 120 && !/[.,;]$/.test(trimmed) && !trimmed.includes("\n")) {
    const words = trimmed.split(/\s+/);
    if (words.length >= 2 && words.length <= 15) {
      return {
        html: `<h3><span class="koboSpan" id="kobo.${chapterIdx}.${spanIdx}">${escapeHtml(trimmed)}</span></h3>`,
        nextSpan: spanIdx + 1,
      };
    }
  }

  // Regular paragraph — wrap content in koboSpan
  const id = `kobo.${chapterIdx}.${spanIdx}`;
  const html = `<p><span class="koboSpan" id="${id}">${escapeHtml(trimmed)}</span></p>`;
  return { html, nextSpan: spanIdx + 1 };
}

export function plainTextToKepubHtml(text: string, chapterIdx: number): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  let spanIdx = 1;
  const htmlParts: string[] = [];

  for (const block of blocks) {
    const { html, nextSpan } = blockToHtml(block, chapterIdx + 1, spanIdx);
    htmlParts.push(html);
    spanIdx = nextSpan;
  }

  return htmlParts.join("\n");
}

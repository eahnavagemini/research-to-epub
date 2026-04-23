import epub from "epub-gen-memory/bundle";
import type { Chapter } from "./parseChapters";
import { plainTextToKepubHtml } from "./toKepub";

export interface EpubMetadata {
  title: string;
  author: string;
  language: string;
}

const KOBO_CSS = `
body {
  font-family: serif;
  font-size: 1em;
  line-height: 1.7;
  margin: 1em 1.5em;
  color: #1a1a1a;
}
h1, h2, h3 {
  font-family: sans-serif;
  line-height: 1.3;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
p {
  margin: 0.6em 0;
  text-align: justify;
}
.research-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.85em;
  margin: 1em 0;
}
.research-table td {
  border: 1px solid #888;
  padding: 0.4em 0.6em;
  vertical-align: top;
}
.koboSpan { display: inline; }
`;

export async function generateKepub(
  chapters: Chapter[],
  meta: EpubMetadata
): Promise<Blob> {
  const epubChapters = chapters.map((ch, i) => ({
    title: ch.title,
    content: plainTextToKepubHtml(ch.content, i),
  }));

  return epub(
    { title: meta.title, author: meta.author, lang: meta.language, css: KOBO_CSS, version: 3 },
    epubChapters
  );
}

export function downloadKepub(blob: Blob, title: string): void {
  const safeName = title.replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").trim().replace(/\s+/g, "-");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.kepub.epub`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

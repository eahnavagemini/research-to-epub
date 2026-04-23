import JSZip from "jszip";
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

function chapterId(i: number) {
  return `ch${String(i + 1).padStart(3, "0")}`;
}

function chapterXhtml(title: string, body: string, lang: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
</head>
<body>
  <h2>${title}</h2>
  ${body}
</body>
</html>`;
}

function contentOpf(meta: EpubMetadata, chapters: { id: string; title: string }[], uid: string): string {
  const items = chapters.map(ch =>
    `<item id="${ch.id}" href="Text/${ch.id}.xhtml" media-type="application/xhtml+xml"/>`
  ).join("\n    ");
  const spine = chapters.map(ch =>
    `<itemref idref="${ch.id}"/>`
  ).join("\n    ");

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="${meta.language}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${uid}</dc:identifier>
    <dc:title>${meta.title}</dc:title>
    <dc:creator>${meta.author}</dc:creator>
    <dc:language>${meta.language}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="Styles/style.css" media-type="text/css"/>
    ${items}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`;
}

function tocNcx(meta: EpubMetadata, chapters: { id: string; title: string }[], uid: string): string {
  const navPoints = chapters.map((ch, i) => `
    <navPoint id="nav-${ch.id}" playOrder="${i + 1}">
      <navLabel><text>${ch.title}</text></navLabel>
      <content src="Text/${ch.id}.xhtml"/>
    </navPoint>`).join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${meta.title}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`;
}

function navXhtml(meta: EpubMetadata, chapters: { id: string; title: string }[], lang: string): string {
  const items = chapters.map(ch =>
    `<li><a href="Text/${ch.id}.xhtml">${ch.title}</a></li>`
  ).join("\n      ");

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head><meta charset="utf-8"/><title>${meta.title}</title></head>
<body>
  <nav epub:type="toc">
    <h1>${meta.title}</h1>
    <ol>
      ${items}
    </ol>
  </nav>
</body>
</html>`;
}

function makeUid(): string {
  return "urn:uuid:" + "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function generateKepub(chapters: Chapter[], meta: EpubMetadata): Promise<Blob> {
  const uid = makeUid();
  const zip = new JSZip();

  // mimetype must be first and uncompressed
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.file("META-INF/container.xml",
    `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const chapterMeta = chapters.map((_, i) => ({ id: chapterId(i), title: chapters[i].title }));

  zip.file("OEBPS/content.opf", contentOpf(meta, chapterMeta, uid));
  zip.file("OEBPS/toc.ncx", tocNcx(meta, chapterMeta, uid));
  zip.file("OEBPS/nav.xhtml", navXhtml(meta, chapterMeta, meta.language));
  zip.file("OEBPS/Styles/style.css", KOBO_CSS);

  chapters.forEach((ch, i) => {
    const body = plainTextToKepubHtml(ch.content, i);
    zip.file(`OEBPS/Text/${chapterId(i)}.xhtml`, chapterXhtml(ch.title, body, meta.language));
  });

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

export function downloadKepub(blob: Blob, title: string): void {
  const safeName = title
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.kepub.epub`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

import type { Chapter } from "../lib/parseChapters";
import { wordCount } from "../lib/parseChapters";

interface Props {
  chapters: Chapter[];
}

export function ChapterPreview({ chapters }: Props) {
  if (chapters.length === 0) return null;

  const totalWords = chapters.reduce((sum, ch) => sum + wordCount(ch.content), 0);
  const readingMinutes = Math.ceil(totalWords / 200);

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-blue-800">
          {chapters.length} {chapters.length === 1 ? "capítulo" : "capítulos"} detectados
        </h2>
        <span className="text-xs text-blue-600">
          ~{totalWords.toLocaleString()} palabras · ~{readingMinutes} min lectura
        </span>
      </div>
      <ol className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {chapters.map((ch, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-800 line-clamp-1">{ch.title}</span>
              <span className="ml-2 text-xs text-gray-400">
                {wordCount(ch.content).toLocaleString()} palabras
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

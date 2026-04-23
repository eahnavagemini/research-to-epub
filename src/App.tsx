import { useState, useMemo, useCallback } from "react";
import { MetadataForm } from "./components/MetadataForm";
import { ChapterPreview } from "./components/ChapterPreview";
import { parseChapters, wordCount } from "./lib/parseChapters";
import { generateKepub, downloadKepub } from "./lib/generateEpub";

type Status = "idle" | "generating" | "done" | "error";

export default function App() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("AI Research");
  const [language, setLanguage] = useState("es");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const chapters = useMemo(() => parseChapters(text), [text]);
  const totalWords = useMemo(
    () => chapters.reduce((s, ch) => s + wordCount(ch.content), 0),
    [chapters]
  );

  const handleMeta = useCallback(
    (field: "title" | "author" | "language", value: string) => {
      if (field === "title") setTitle(value);
      else if (field === "author") setAuthor(value);
      else setLanguage(value);
    },
    []
  );

  const handleGenerate = async () => {
    if (!title.trim()) {
      setErrorMsg("El título es obligatorio.");
      return;
    }
    if (chapters.length === 0) {
      setErrorMsg("Pega el texto de la investigación primero.");
      return;
    }
    setErrorMsg("");
    setStatus("generating");
    try {
      const blob = await generateKepub(chapters, {
        title: title.trim(),
        author: author.trim() || "AI Research",
        language,
      });
      downloadKepub(blob, title.trim());
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Error generando el EPUB. Revisa la consola.");
      setStatus("error");
    }
  };

  const canGenerate = title.trim().length > 0 && chapters.length > 0 && status !== "generating";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Research → KEPUB
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Convierte investigaciones de IA a formato KEPUB optimizado para Kobo Clara BW
          </p>
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Metadatos del libro</h2>
          <MetadataForm
            title={title}
            author={author}
            language={language}
            onChange={handleMeta}
          />
        </div>

        {/* Text input */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Texto de la investigación</h2>
            {totalWords > 0 && (
              <span className="text-xs text-gray-400">
                {totalWords.toLocaleString()} palabras
              </span>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el texto completo de la investigación de IA…"
            className="w-full h-72 rounded-xl border border-gray-300 px-4 py-3 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Los capítulos se detectan automáticamente por líneas cortas que actúan como títulos de sección.
          </p>
        </div>

        {/* Chapter preview */}
        {chapters.length > 0 && <ChapterPreview chapters={chapters} />}

        {/* Error */}
        {errorMsg && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full py-4 rounded-2xl text-base font-semibold text-white transition-all
            bg-blue-600 hover:bg-blue-700 active:scale-[0.98]
            disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {status === "generating" && "Generando KEPUB…"}
          {status === "done" && "Descargado ✓"}
          {(status === "idle" || status === "error") && "Generar y descargar .kepub.epub"}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          Generación 100% local · Sin servidores · Para Kobo Clara BW
        </p>
      </div>
    </div>
  );
}

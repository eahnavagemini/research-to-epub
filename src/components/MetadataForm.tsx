interface Props {
  title: string;
  author: string;
  language: string;
  onChange: (field: "title" | "author" | "language", value: string) => void;
}

export function MetadataForm({ title, author, language, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="sm:col-span-1">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Título <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Título del libro"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Autor
        </label>
        <input
          type="text"
          value={author}
          onChange={(e) => onChange("author", e.target.value)}
          placeholder="AI Research"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Idioma
        </label>
        <select
          value={language}
          onChange={(e) => onChange("language", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="pt">Português</option>
        </select>
      </div>
    </div>
  );
}

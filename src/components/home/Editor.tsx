import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Editor({
  activeFile,
  content,
  setContent,
}: {
  activeFile: string | null;
  content: string;
  setContent: (v: string) => void;
}) {
  const timeout = useRef<any>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  // 🔥 debounce save
  useEffect(() => {
    if (!activeFile) return;

    if (timeout.current) clearTimeout(timeout.current);

    timeout.current = setTimeout(() => {
      invoke("write_file", {
        path: activeFile,
        content,
      });
    }, 400);
  }, [content]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <div className="h-10 border-b border-zinc-800 px-3 flex items-center justify-between text-sm text-zinc-400">
        <span>{activeFile || "No file selected"}</span>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            className={`px-2 py-1 rounded ${mode === "edit" ? "bg-zinc-700 text-white" : ""}`}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            className={`px-2 py-1 rounded ${mode === "preview" ? "bg-zinc-700 text-white" : ""}`}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "edit" ? (
          <textarea
            className="w-full h-full p-4 bg-transparent outline-none resize-none text-sm"
            placeholder="Start writing markdown..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        ) : (
          <div className="h-full overflow-auto p-4 prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

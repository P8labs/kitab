import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tree } from "./Tree";

type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
};

export function Sidebar({
  tree,
  onOpen,
  vaultPath,
  refresh,
}: {
  tree: FileNode[];
  onOpen: (path: string) => void;
  vaultPath: string;
  refresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [fileName, setFileName] = useState("");

  const createFile = async () => {
    if (!fileName || !vaultPath) return;

    const fullPath = `${vaultPath}/${fileName}.md`;

    await invoke("create_file", { path: fullPath });

    setFileName("");
    setCreating(false);

    refresh();
  };

  return (
    <div className="w-64 border-r border-zinc-800 p-3 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm text-zinc-400">Files</h2>

        <button
          className="text-xs text-zinc-500 hover:text-white"
          onClick={() => setCreating(true)}
        >
          +
        </button>
      </div>

      {/* Inline create input */}
      {creating && (
        <input
          autoFocus
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="mb-2 px-2 py-1 text-sm bg-zinc-900 border border-zinc-700 rounded outline-none"
          placeholder="file name..."
          onKeyDown={(e) => {
            if (e.key === "Enter") createFile();
            if (e.key === "Escape") {
              setCreating(false);
              setFileName("");
            }
          }}
          onBlur={() => {
            setCreating(false);
            setFileName("");
          }}
        />
      )}

      {/* Tree */}
      <Tree nodes={tree} onOpen={onOpen} />
    </div>
  );
}

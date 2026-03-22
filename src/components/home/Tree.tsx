import {
  CaretRight,
  FileText,
  FolderSimple,
  StackSimple,
} from "@phosphor-icons/react";

type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
};

export function Tree({
  nodes,
  onOpen,
  activePath,
}: {
  nodes: FileNode[];
  onOpen: (path: string) => void;
  activePath?: string | null;
}) {
  if (!nodes.length) {
    return (
      <div className="text-[12px] text-zinc-500 px-2 py-2 bg-white/5 border border-white/5 rounded-lg">
        Drop notes into this vault or create a file to get started.
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {nodes.map((node) => {
        const isSelected = activePath === node.path;

        return (
          <li key={node.path}>
            <button
              className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
                isSelected
                  ? "bg-white/8 text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}
              onClick={() => {
                if (!node.is_dir) onOpen(node.path);
              }}
              disabled={node.is_dir}
            >
              <span
                className={`flex items-center justify-center rounded-md border border-white/5 bg-white/5 p-1 ${
                  node.is_dir ? "text-amber-200/80" : "text-blue-100/80"
                }`}
              >
                {node.is_dir ? (
                  <FolderSimple weight="fill" className="size-4" />
                ) : (
                  <FileText weight="fill" className="size-4" />
                )}
              </span>

              <div className="flex-1 truncate">
                <div className="flex items-center gap-2">
                  <span className="truncate">{node.name}</span>
                  {node.is_dir && (
                    <StackSimple className="size-3 text-zinc-500" />
                  )}
                  {isSelected && (
                    <CaretRight className="size-3 text-blue-100/70" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 truncate group-hover:text-zinc-400">
                  {node.path}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

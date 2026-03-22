import { useMemo, useState } from "react";
import {
  Delete01Icon,
  File01Icon,
  HashtagIcon,
  Notification01Icon,
  RefreshIcon,
  Settings01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HIcon } from "@/components/ui/hicon";
import { cn } from "@/lib/utils";
import { Tree } from "./Tree";

type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
};

type CreateType = "file" | "folder";

const navItems = [
  { label: "All Notes", icon: File01Icon },
  { label: "Notifications", icon: Notification01Icon },
  { label: "Settings", icon: Settings01Icon },
  { label: "Tags", icon: Tag01Icon },
  { label: "Trash", icon: Delete01Icon },
];

export function Sidebar({
  tree,
  onOpen,
  vaultPath,
  refresh,
  onCreate,
  activeFile,
}: {
  tree: FileNode[];
  onOpen: (path: string) => void;
  vaultPath: string;
  refresh: () => void;
  onCreate: (type: CreateType, name: string) => Promise<void>;
  activeFile: string | null;
}) {
  const [creating, setCreating] = useState(false);
  const [createType, setCreateType] = useState<CreateType>("file");
  const [name, setName] = useState("");

  const vaultName = useMemo(() => {
    if (!vaultPath) return "Vault";
    const parts = vaultPath.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] || "Vault";
  }, [vaultPath]);

  const derivedTags = useMemo(() => {
    if (!tree.length) return ["inbox", "personal", "ideas", "archive"];
    return Array.from(
      new Set(
        tree
          .filter((node) => !node.is_dir)
          .slice(0, 8)
          .map(
            (node) =>
              node.name.replace(".md", "").split(/\W+/)[0].toLowerCase() ||
              "note",
          ),
      ),
    );
  }, [tree]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onCreate(createType, name.trim());
    setName("");
    setCreating(false);
  };

  return (
    <div className="relative flex h-full w-72 flex-col gap-4 border-r border-white/5 bg-[#0f0f10]/95 px-4 py-4 text-[13px] text-zinc-100 shadow-[1px_0_0_rgba(255,255,255,0.04)]">
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_10%_20%,#1a1a1a,transparent_55%)] opacity-70" />
      <div className="relative flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Workspace
          </p>
          <p className="text-sm font-semibold text-zinc-100">{vaultName}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/5 text-zinc-200 hover:bg-white/10"
          onClick={refresh}
        >
          <HIcon icon={RefreshIcon} size={16} />
        </Button>
      </div>

      <div className="relative space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className="h-9 w-full justify-start gap-2 rounded-lg bg-transparent px-2 text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <HIcon icon={item.icon} className="text-zinc-500" size={16} />
            <span className="text-[13px]">{item.label}</span>
          </Button>
        ))}
      </div>

      <div className="relative space-y-2 rounded-2xl border border-white/5 bg-[#0d0d10] px-3 py-3 shadow-inner shadow-black/20">
        <div className="flex items-center justify-between text-[12px] text-zinc-400">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-[0.08em] text-zinc-400">
            <HIcon icon={HashtagIcon} size={12} />
            Tags
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {derivedTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-300 transition hover:bg-white/10"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-[12px] uppercase tracking-[0.08em] text-zinc-500">
            Vault
          </p>
          <p className="text-[11px] text-zinc-500">Create files or folders</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 rounded-lg border border-white/5 bg-white/5 px-2 text-[12px] text-zinc-200 hover:bg-white/10"
          onClick={() => setCreating((v) => !v)}
        >
          + New
        </Button>
      </div>

      {creating && (
        <div className="relative space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-[12px] text-zinc-400">
            <span>Type</span>
            <div className="flex gap-1">
              {(["file", "folder"] as CreateType[]).map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={createType === type ? "secondary" : "ghost"}
                  className={cn(
                    "h-7 rounded-md px-2 text-[12px]",
                    createType === type
                      ? "bg-white/20 text-zinc-100"
                      : "text-zinc-400 hover:bg-white/10",
                  )}
                  onClick={() => setCreateType(type)}
                >
                  {type === "file" ? "Note" : "Folder"}
                </Button>
              ))}
            </div>
          </div>
          <Input
            autoFocus
            value={name}
            placeholder={
              createType === "file" ? "New note name" : "Folder name"
            }
            className="h-9 border-white/10 bg-[#0b0b0c] text-[13px] placeholder:text-zinc-600"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setName("");
              }
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[12px] text-zinc-400"
              onClick={() => {
                setCreating(false);
                setName("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 bg-white/10 text-[12px] text-white hover:bg-white/15"
              onClick={handleCreate}
            >
              Create
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="relative -m-2 h-full px-2">
        <div className="space-y-2 pb-8">
          <Tree nodes={tree} onOpen={onOpen} activePath={activeFile} />
        </div>
      </ScrollArea>
    </div>
  );
}

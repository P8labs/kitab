import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowsClockwise,
  DotsThree,
  PencilSimple,
  ShareNetwork,
} from "@phosphor-icons/react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (!activeFile) return;

    if (timeout.current) clearTimeout(timeout.current);

    timeout.current = setTimeout(() => {
      invoke("write_file", {
        path: activeFile,
        content,
      });
    }, 400);
  }, [content, activeFile]);

  const title = useMemo(() => {
    if (!activeFile) return "No note selected";
    const filename = activeFile.split(/[/\\]/).pop() || "";
    return filename.replace(/\.md$/i, "");
  }, [activeFile]);

  const subtitle = useMemo(() => {
    if (!activeFile) return "Select a note from the list to start editing";
    return activeFile;
  }, [activeFile]);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden text-zinc-100 shadow-inner shadow-black/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.05),transparent_35%),radial-gradient(circle_at_70%_0%,rgba(59,130,246,0.08),transparent_30%)]" />
      <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            {mode === "edit" ? "Editing" : "Preview"}
          </p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {activeFile && (
              <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-400">
                autosaving
              </span>
            )}
          </div>
          <p className="text-[12px] text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-white/5 bg-white/5 text-zinc-200 hover:bg-white/10"
          >
            <ShareNetwork className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-white/5 bg-white/5 text-zinc-200 hover:bg-white/10"
          >
            <PencilSimple className="size-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 rounded-xl border border-white/5 bg-white/5 text-zinc-200 transition hover:bg-white/10">
              <DotsThree className="mx-auto size-5" weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-[#111112] text-[13px] shadow-2xl ring-1 ring-white/5">
              <DropdownMenuItem>Pin to top</DropdownMenuItem>
              <DropdownMenuItem>Markdown</DropdownMenuItem>
              <DropdownMenuItem>Copy link</DropdownMenuItem>
              <DropdownMenuItem>Publish</DropdownMenuItem>
              <DropdownMenuItem>History</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-2">
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <ArrowsClockwise className="size-4" />
          <span>Changes auto-save within a breath.</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-1">
          {(["edit", "preview"] as const).map((key) => (
            <Button
              key={key}
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 rounded-md px-3 text-[12px]",
                mode === key
                  ? "bg-white/15 text-white shadow-inner shadow-black/30"
                  : "text-zinc-400 hover:text-white",
              )}
              onClick={() => setMode(key)}
            >
              {key === "edit" ? "Edit" : "Preview"}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden px-5 py-4">
        {mode === "edit" ? (
          <textarea
            className="h-full w-full resize-none rounded-2xl border border-white/5 bg-[#0b0b0c]/85 p-4 text-[13px] leading-6 text-zinc-100 outline-none ring-1 ring-transparent transition focus:ring-white/12"
            placeholder="Capture ideas, outlines, or full documents with Markdown. Shift + Enter inserts a newline."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        ) : (
          <div className="prose prose-invert relative h-full max-w-none overflow-auto rounded-2xl border border-white/5 bg-[#0b0b0c]/85 p-6 text-[14px] leading-7">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

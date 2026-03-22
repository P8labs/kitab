import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Add01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

import { HIcon } from "@/components/ui/hicon";
import { HomeBottomContent } from "@/components/home/HomeBottomContent";
import { cn } from "@/lib/utils";
import type { BottomTab, EditorMode } from "@/components/home/types";

type HomeEditorWorkspaceProps = {
  tabs: string[];
  activeFile: string | null;
  currentContent: string;
  saveLabel: string;
  editorMode: EditorMode;
  bottomVisible: boolean;
  bottomTab: BottomTab;
  headings: Array<{ level: number; text: string }>;
  backlinks: string[];
  stripMarkdownExt: (name: string) => string;
  onOpenFile: (path: string) => void;
  onCloseTab: (path: string) => void;
  onStartCreate: () => void;
  setEditorMode: (mode: EditorMode) => void;
  setBottomVisible: (visible: boolean) => void;
  setBottomTab: (tab: BottomTab) => void;
  onContentChange: (value: string) => void;
};

const editorModes: EditorMode[] = ["source", "live", "preview"];
const bottomTabs: Array<[BottomTab, string]> = [
  ["outline", "Outline"],
  ["backlinks", "Backlinks"],
  ["meta", "Metadata"],
];

export function HomeEditorWorkspace({
  tabs,
  activeFile,
  currentContent,
  saveLabel,
  editorMode,
  bottomVisible,
  bottomTab,
  headings,
  backlinks,
  stripMarkdownExt,
  onOpenFile,
  onCloseTab,
  onStartCreate,
  setEditorMode,
  setBottomVisible,
  setBottomTab,
  onContentChange,
}: HomeEditorWorkspaceProps) {
  return (
    <>
      <div className="border-border flex h-8 items-end border-b bg-surface-panel px-1">
        <div className="flex h-full min-w-0 items-end gap-0.5 overflow-x-auto pb-px">
          {tabs.map((tabPath) => {
            const tabTitle = stripMarkdownExt(
              tabPath.split(/[/\\]/).pop() || tabPath,
            );
            const isActive = activeFile === tabPath;

            return (
              <div
                key={tabPath}
                className={cn(
                  "group flex h-7 max-w-55 min-w-30 items-center rounded-t-[4px] border border-transparent px-2 text-[12px]",
                  isActive
                    ? "border-border border-b-surface-panel bg-surface-panel text-text-primary"
                    : "bg-surface-sidebar text-text-muted hover:bg-surface-hover",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => onOpenFile(tabPath)}
                >
                  {tabTitle}
                </button>
                <button
                  type="button"
                  className="ml-1 hidden size-4 items-center justify-center rounded-[3px] text-text-muted group-hover:flex hover:bg-surface-hover hover:text-text-primary"
                  onClick={() => onCloseTab(tabPath)}
                >
                  <HIcon icon={Cancel01Icon} size={12} />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          title="New note"
          className="mb-0.5 ml-1 flex size-6 items-center justify-center rounded-[4px] text-text-muted hover:bg-surface-hover hover:text-text-primary"
          onClick={onStartCreate}
        >
          <HIcon icon={Add01Icon} size={14} />
        </button>
      </div>

      <div className="border-border text-text-muted flex h-8 items-center justify-between border-b px-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span>{saveLabel}</span>
          {activeFile && (
            <span className="truncate opacity-70">{activeFile}</span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {editorModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setEditorMode(mode)}
              className={cn(
                "h-6 rounded-[4px] px-2 text-[11px] transition-colors",
                editorMode === mode
                  ? "bg-surface-active text-text-primary"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary",
              )}
            >
              {mode}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setBottomVisible(!bottomVisible)}
            className="text-text-muted hover:bg-surface-hover hover:text-text-primary ml-1 flex h-6 items-center rounded-[4px] px-2 text-[11px]"
          >
            {bottomVisible ? "Hide context" : "Show context"}
          </button>
        </div>
      </div>

      {!activeFile ? (
        <div className="text-text-muted flex flex-1 items-center justify-center text-[12px]">
          Select a note to start writing.
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {(editorMode === "source" || editorMode === "live") && (
              <textarea
                value={currentContent}
                onChange={(event) => onContentChange(event.target.value)}
                className={cn(
                  "bg-surface-panel text-text-primary h-full flex-1 resize-none px-5 py-4 text-[14px] leading-[1.7] font-medium outline-none",
                  editorMode === "live" && "border-border border-r",
                )}
                placeholder="Start writing in Markdown..."
              />
            )}

            {(editorMode === "preview" || editorMode === "live") && (
              <div className="markdown-preview h-full flex-1 overflow-auto px-5 py-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentContent || "_No content yet._"}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {bottomVisible && (
            <section className="border-border bg-surface-sidebar h-36 border-t px-2 py-1.5">
              <div className="mb-1 flex items-center gap-0.5">
                {bottomTabs.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "h-6 rounded-[4px] px-2 text-[11px]",
                      bottomTab === key
                        ? "bg-surface-active text-text-primary"
                        : "text-text-muted hover:bg-surface-hover",
                    )}
                    onClick={() => setBottomTab(key)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="text-text-muted hover:bg-surface-hover ml-auto flex size-6 items-center justify-center rounded-[4px]"
                  onClick={() => setBottomVisible(false)}
                >
                  <HIcon icon={ArrowDown01Icon} size={16} />
                </button>
              </div>
              <div className="h-[calc(100%-1.75rem)] overflow-auto pr-1">
                <HomeBottomContent
                  activeFile={activeFile}
                  bottomTab={bottomTab}
                  headings={headings}
                  backlinks={backlinks}
                  currentContent={currentContent}
                />
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

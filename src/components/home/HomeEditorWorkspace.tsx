import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useRef, useState } from "react";
import {
  Add01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CodeIcon,
  ViewIcon,
  ViewSidebarLeftIcon,
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
  linkedNoteTitles: string[];
  resolveLinkedNote: (title: string) => string | null;
  onOpenLinkedNote: (title: string) => void;
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

const WIKI_LINK_PREFIX = "/__kitab-note__/";

const modeMeta: Record<EditorMode, { label: string; icon: typeof CodeIcon }> = {
  source: {
    label: "Source",
    icon: CodeIcon,
  },
  preview: {
    label: "Preview",
    icon: ViewIcon,
  },
  live: {
    label: "Live",
    icon: ViewSidebarLeftIcon,
  },
};

const wikilinkToMarkdownLink = (value: string) =>
  value.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, rawTarget, rawLabel) => {
      const target = rawTarget.trim();
      const label = (rawLabel || rawTarget).trim();
      return `[${label}](${WIKI_LINK_PREFIX}${encodeURIComponent(target)})`;
    },
  );

const getWikiLinkQuery = (text: string, caret: number) => {
  const beforeCaret = text.slice(0, caret);
  const openAt = beforeCaret.lastIndexOf("[[");
  if (openAt < 0) return null;

  const lastCloseAt = beforeCaret.lastIndexOf("]]");
  if (lastCloseAt > openAt) return null;

  const query = beforeCaret.slice(openAt + 2);
  if (query.includes("\n") || query.includes("[") || query.includes("]")) {
    return null;
  }

  if (query.includes("|")) return null;

  return {
    start: openAt + 2,
    end: caret,
    query,
  };
};

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
  linkedNoteTitles,
  resolveLinkedNote,
  onOpenLinkedNote,
  setEditorMode,
  setBottomVisible,
  setBottomTab,
  onContentChange,
}: HomeEditorWorkspaceProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [hideSuggestions, setHideSuggestions] = useState(false);

  const suggestionIndex = useMemo(() => {
    const normalized = linkedNoteTitles
      .map((title) => ({ title, lower: title.toLowerCase() }))
      .sort((a, b) => a.lower.localeCompare(b.lower));

    const byFirstChar = new Map<
      string,
      Array<{ title: string; lower: string }>
    >();
    normalized.forEach((item) => {
      const key = item.lower[0] || "";
      const bucket = byFirstChar.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        byFirstChar.set(key, [item]);
      }
    });

    return {
      all: normalized,
      byFirstChar,
    };
  }, [linkedNoteTitles]);

  const wikiLinkQuery = useMemo(() => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    return getWikiLinkQuery(currentContent, textarea.selectionStart ?? 0);
  }, [currentContent]);

  const noteSuggestions = useMemo(() => {
    if (!wikiLinkQuery) return [];
    const lookup = wikiLinkQuery.query.trim().toLowerCase();

    if (!lookup) {
      return suggestionIndex.all.slice(0, 8).map((item) => item.title);
    }

    const candidatePool =
      suggestionIndex.byFirstChar.get(lookup[0]) ?? suggestionIndex.all;
    const starts: string[] = [];
    const includes: string[] = [];

    for (const item of candidatePool) {
      if (!item.lower.includes(lookup)) {
        continue;
      }

      if (item.lower.startsWith(lookup)) {
        starts.push(item.title);
      } else {
        includes.push(item.title);
      }

      if (starts.length + includes.length >= 8) {
        if (starts.length >= 8) {
          break;
        }
      }
    }

    return [...starts, ...includes].slice(0, 8);
  }, [suggestionIndex, wikiLinkQuery]);

  const applySuggestion = (title: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const caret = textarea.selectionStart ?? 0;
    const query = getWikiLinkQuery(currentContent, caret);
    if (!query) return;

    const hasClosing = currentContent.slice(query.end, query.end + 2) === "]]";
    const insertion = `${title}${hasClosing ? "" : "]]"}`;
    const nextValue =
      currentContent.slice(0, query.start) +
      insertion +
      currentContent.slice(query.end);

    onContentChange(nextValue);
    setActiveSuggestionIndex(0);
    setHideSuggestions(true);

    const nextCaret = query.start + insertion.length + (hasClosing ? 2 : 0);
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const onTextareaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (!noteSuggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev + 1) % noteSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex(
        (prev) => (prev - 1 + noteSuggestions.length) % noteSuggestions.length,
      );
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applySuggestion(noteSuggestions[activeSuggestionIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setActiveSuggestionIndex(0);
    }
  };

  const markdownValue = useMemo(
    () => wikilinkToMarkdownLink(currentContent || "_No content yet._"),
    [currentContent],
  );

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
                "flex h-6 items-center gap-1.5 rounded-[4px] px-2 text-[11px] transition-colors",
                editorMode === mode
                  ? "bg-surface-active text-text-primary"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary",
              )}
            >
              <HIcon icon={modeMeta[mode].icon} size={14} />
              <span>{modeMeta[mode].label}</span>
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
              <div
                className={cn(
                  "relative h-full flex-1",
                  editorMode === "live" && "border-border border-r",
                )}
              >
                <textarea
                  ref={textareaRef}
                  value={currentContent}
                  onChange={(event) => {
                    setHideSuggestions(false);
                    onContentChange(event.target.value);
                  }}
                  onClick={() => setActiveSuggestionIndex(0)}
                  onKeyDown={onTextareaKeyDown}
                  className="bg-surface-panel text-text-primary h-full w-full resize-none px-5 py-4 text-[14px] leading-[1.7] font-medium outline-none"
                  placeholder="Start writing in Markdown..."
                />

                {!hideSuggestions &&
                  noteSuggestions.length > 0 &&
                  wikiLinkQuery && (
                    <div className="border-border absolute right-3 bottom-3 z-20 w-64 rounded-[8px] border bg-surface-sidebar p-1 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                      <p className="px-2 py-1 text-[10px] tracking-[0.06em] text-text-muted uppercase">
                        Link note
                      </p>
                      <div className="max-h-44 overflow-auto">
                        {noteSuggestions.map((title, index) => (
                          <button
                            key={title}
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded-[6px] px-2 py-1.5 text-left text-[12px]",
                              index === activeSuggestionIndex
                                ? "bg-surface-active text-text-primary"
                                : "text-text-muted hover:bg-surface-hover hover:text-text-primary",
                            )}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              applySuggestion(title);
                            }}
                          >
                            <span className="truncate">{title}</span>
                            <span className="text-[10px] opacity-65">
                              [[ ]]
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {(editorMode === "preview" || editorMode === "live") && (
              <div className="markdown-preview h-full flex-1 overflow-auto px-5 py-4 markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children, ...props }: any) => {
                      if (href?.startsWith(WIKI_LINK_PREFIX)) {
                        const linkedTitle = decodeURIComponent(
                          href.slice(WIKI_LINK_PREFIX.length),
                        );
                        const linkedPath = resolveLinkedNote(linkedTitle);

                        return (
                          <a
                            href="#"
                            className={cn(
                              "font-medium underline underline-offset-2 transition-colors",
                              linkedPath
                                ? "text-text-primary hover:text-primary"
                                : "cursor-not-allowed text-text-muted",
                            )}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (!linkedPath) return;
                              onOpenLinkedNote(linkedTitle);
                            }}
                            title={
                              linkedPath
                                ? `Open note: ${linkedTitle}`
                                : `Note not found: ${linkedTitle}`
                            }
                          >
                            {children}
                          </a>
                        );
                      }

                      return (
                        <a
                          href={href}
                          className="text-primary underline underline-offset-2"
                          target="_blank"
                          rel="noreferrer"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {markdownValue}
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

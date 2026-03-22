import { type ReactNode } from "react";
import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Edit02Icon,
  File01Icon,
  FileAddIcon,
  Folder01Icon,
  FolderAddIcon,
  FolderOpenIcon,
  Loading03Icon,
  RefreshIcon,
  Search01Icon,
  ShutDownIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { HIcon } from "@/components/ui/hicon";
import type {
  CreateType,
  DraftCreate,
  DraftRename,
  FileNode,
  LeftView,
} from "@/components/home/types";
import { cn } from "@/lib/utils";

type HomeSidebarContentProps = {
  leftView: LeftView;
  vaultName: string;
  query: string;
  setQuery: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchResults: FileNode[];
  tree: FileNode[];
  expandedFolders: Set<string>;
  loadingFolders: Set<string>;
  childrenByPath: Record<string, FileNode[]>;
  activeFile: string | null;
  selectedPath: string | null;
  draftCreate: DraftCreate | null;
  setDraftCreate: React.Dispatch<React.SetStateAction<DraftCreate | null>>;
  draftRename: DraftRename | null;
  setDraftRename: React.Dispatch<React.SetStateAction<DraftRename | null>>;
  stripMarkdownExt: (name: string) => string;
  onLoadTree: () => void;
  onSelectPath: (path: string) => void;
  onStartCreate: (parentPath: string | null, type: CreateType) => void;
  onSubmitCreate: () => void;
  onSubmitRename: () => void;
  onDeletePath: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onCloseCurrentVault: () => void;
  onGoToOnboard: () => void;
};

export function HomeSidebarContent({
  leftView,
  vaultName,
  query,
  setQuery,
  searchTerm,
  setSearchTerm,
  searchResults,
  tree,
  expandedFolders,
  loadingFolders,
  childrenByPath,
  activeFile,
  selectedPath,
  draftCreate,
  setDraftCreate,
  draftRename,
  setDraftRename,
  stripMarkdownExt,
  onLoadTree,
  onSelectPath,
  onStartCreate,
  onSubmitCreate,
  onSubmitRename,
  onDeletePath,
  onToggleFolder,
  onOpenFile,
  onCloseCurrentVault,
  onGoToOnboard,
}: HomeSidebarContentProps) {
  const normalizedQuery = query.trim().toLowerCase();

  const renderCreateRow = (parentPath: string | null, depth: number) => {
    if (!draftCreate || draftCreate.parentPath !== parentPath) return null;

    return (
      <div
        className="px-1 py-0.5"
        style={{ paddingLeft: 8 + depth * 12 }}
        data-create-draft
      >
        <div className="flex h-8 items-center gap-1 rounded-[5px] bg-surface-active px-1.5">
          <HIcon
            icon={draftCreate.type === "file" ? File01Icon : Folder01Icon}
            className="text-text-muted"
            size={15}
          />
          <input
            data-create-draft
            autoFocus
            value={draftCreate.name}
            className="h-7 flex-1 border-0 bg-transparent text-[13px] text-text-primary outline-none"
            placeholder={draftCreate.type === "file" ? "untitled" : "folder"}
            onChange={(event) =>
              setDraftCreate((prev) =>
                prev
                  ? {
                      ...prev,
                      name: event.target.value,
                    }
                  : prev,
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmitCreate();
              if (event.key === "Escape") setDraftCreate(null);
            }}
          />
        </div>
      </div>
    );
  };

  const renderTree = (
    nodes: FileNode[],
    parentPath: string | null,
    depth = 0,
  ): ReactNode => {
    const filtered = normalizedQuery
      ? nodes.filter((node) =>
          node.name.toLowerCase().includes(normalizedQuery),
        )
      : nodes;

    return (
      <>
        {renderCreateRow(parentPath, depth)}
        {filtered.map((node) => {
          const isFolder = node.is_dir;
          const isExpanded = expandedFolders.has(node.path);
          const children = childrenByPath[node.path] ?? [];
          const isActive = activeFile === node.path;
          const isSelected = selectedPath === node.path;
          const isRenaming = draftRename?.path === node.path;

          return (
            <div key={node.path}>
              <div
                className={cn(
                  "group flex h-8 items-center gap-1 px-1 py-0.5 text-[13px] leading-none text-text-muted",
                  isSelected && "text-text-primary",
                )}
                style={{ paddingLeft: 8 + depth * 12 }}
              >
                <button
                  type="button"
                  className={cn(
                    "flex h-7 min-w-0 flex-1 items-center gap-1 rounded-[5px] px-1.5 text-left transition-colors",
                    isActive && "bg-surface-active text-text-primary",
                    !isActive && "hover:bg-surface-hover",
                  )}
                  onClick={() => {
                    onSelectPath(node.path);
                    if (isFolder) {
                      onToggleFolder(node.path);
                    } else {
                      onOpenFile(node.path);
                    }
                  }}
                >
                  {isFolder ? (
                    <span className="flex size-4 items-center justify-center">
                      <HIcon
                        icon={ArrowRight01Icon}
                        className={cn(
                          "text-text-muted transition-transform",
                          isExpanded && "rotate-90",
                        )}
                        size={14}
                      />
                    </span>
                  ) : (
                    <span className="size-4" />
                  )}

                  <HIcon
                    icon={
                      isFolder
                        ? isExpanded
                          ? FolderOpenIcon
                          : Folder01Icon
                        : File01Icon
                    }
                    size={15}
                  />

                  {isRenaming ? (
                    <input
                      autoFocus
                      value={draftRename?.name ?? ""}
                      className="h-6 min-w-0 flex-1 border-0 bg-transparent text-[13px] text-text-primary outline-none"
                      onChange={(event) =>
                        setDraftRename((prev) =>
                          prev
                            ? {
                                ...prev,
                                name: event.target.value,
                              }
                            : prev,
                        )
                      }
                      onBlur={onSubmitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onSubmitRename();
                        if (event.key === "Escape") setDraftRename(null);
                      }}
                    />
                  ) : (
                    <span className="truncate">
                      {stripMarkdownExt(node.name)}
                    </span>
                  )}
                </button>

                <div className="hidden items-center gap-0.5 group-hover:flex">
                  {isFolder && (
                    <>
                      <button
                        type="button"
                        className="tree-action"
                        title="New note"
                        onClick={() => onStartCreate(node.path, "file")}
                      >
                        <HIcon icon={FileAddIcon} size={14} />
                      </button>
                      <button
                        type="button"
                        className="tree-action"
                        title="New folder"
                        onClick={() => onStartCreate(node.path, "folder")}
                      >
                        <HIcon icon={FolderAddIcon} size={14} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="tree-action"
                    title="Rename"
                    onClick={() =>
                      setDraftRename({
                        path: node.path,
                        name: stripMarkdownExt(node.name),
                      })
                    }
                  >
                    <HIcon icon={Edit02Icon} size={14} />
                  </button>
                  <button
                    type="button"
                    className="tree-action"
                    title="Delete"
                    onClick={() => onDeletePath(node.path)}
                  >
                    <HIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>
              </div>

              {isFolder && isExpanded && (
                <div>
                  {loadingFolders.has(node.path) && (
                    <div
                      className="flex items-center gap-1 px-2 py-1 text-[12px] text-text-muted"
                      style={{ paddingLeft: 20 + depth * 12 }}
                    >
                      <HIcon
                        icon={Loading03Icon}
                        className="animate-spin"
                        size={14}
                      />
                      Loading...
                    </div>
                  )}
                  {renderTree(children, node.path, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  if (leftView === "search") {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-2 py-1.5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
            Search
          </p>
          <div className="relative mt-1">
            <HIcon
              icon={Search01Icon}
              className="pointer-events-none absolute left-2 top-1.5 text-text-muted"
              size={14}
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search notes"
              className="h-8 w-full rounded-[5px] border border-border bg-surface-panel pl-7 pr-2 text-[13px] text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto py-1">
          {searchResults.map((node) => (
            <button
              key={node.path}
              type="button"
              className="flex h-8 w-full items-center gap-1 px-2 text-left text-[13px] text-text-muted hover:bg-surface-hover hover:text-text-primary"
              onClick={() => onOpenFile(node.path)}
            >
              <HIcon icon={File01Icon} size={14} />
              <span className="truncate">{stripMarkdownExt(node.name)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (leftView === "settings") {
    return (
      <div className="flex h-full flex-col gap-2 px-2 py-2 text-[13px]">
        <div className="rounded-[5px] border border-border bg-surface-panel p-2">
          <p className="text-[12px] font-medium text-text-primary">Vault</p>
          <p className="mt-0.5 truncate text-[12px] text-text-muted">
            {vaultName}
          </p>
        </div>

        <button
          type="button"
          className="flex h-9 items-center gap-1 rounded-[5px] border border-border px-2 text-left text-[13px] text-text-muted hover:bg-surface-hover"
          onClick={onCloseCurrentVault}
        >
          <HIcon icon={ShutDownIcon} size={14} />
          Close current vault
        </button>

        <button
          type="button"
          className="flex h-9 items-center gap-1 rounded-[5px] border border-border px-2 text-left text-[13px] text-text-muted hover:bg-surface-hover"
          onClick={onGoToOnboard}
        >
          <HIcon icon={Add01Icon} size={14} />
          Open/Create another vault
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Vault
            </p>
            <p className="truncate text-[13px] font-medium text-text-primary">
              {vaultName}
            </p>
          </div>
          <Button size="icon-xs" variant="ghost" onClick={onLoadTree}>
            <HIcon icon={RefreshIcon} size={14} />
          </Button>
        </div>

        <div className="relative">
          <HIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-2 top-1.5 text-text-muted"
            size={14}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter files"
            className="h-8 w-full rounded-[5px] border border-border bg-surface-panel pl-7 pr-2 text-[13px] text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border px-2 py-1 text-[12px] text-text-muted">
        <span>Files</span>
        <div className="flex items-center gap-0.5">
          <button
            className="tree-action"
            title="New file"
            onClick={() => onStartCreate(null, "file")}
          >
            <HIcon icon={FileAddIcon} size={14} />
          </button>
          <button
            className="tree-action"
            title="New folder"
            onClick={() => onStartCreate(null, "folder")}
          >
            <HIcon icon={FolderAddIcon} size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-1">{renderTree(tree, null)}</div>
    </>
  );
}

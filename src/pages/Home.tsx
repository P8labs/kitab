import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiFile3Fill,
  RiFileAddLine,
  RiFolder3Fill,
  RiFolderAddLine,
  RiFolderOpenFill,
  RiLoader4Line,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiRefreshLine,
  RiSearchLine,
  RiSettings3Line,
  RiShutDownLine,
  RiStackLine,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Titlebar } from "@/components/shell/Titlebar";
import { useApp } from "@/state/app";
import { cn } from "@/lib/utils";

type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
};

type CreateType = "file" | "folder";
type LeftView = "vault" | "search" | "settings";
type EditorMode = "source" | "live" | "preview";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type BottomTab = "outline" | "backlinks" | "meta";

type DraftCreate = {
  parentPath: string | null;
  type: CreateType;
  name: string;
};

type DraftRename = {
  path: string;
  name: string;
};

const railItems: Array<{
  key: LeftView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "vault", label: "Vault", icon: RiStackLine },
  { key: "search", label: "Search", icon: RiSearchLine },
  { key: "settings", label: "Settings", icon: RiSettings3Line },
];

const sortNodes = (nodes: FileNode[]) =>
  [...nodes].sort((a, b) => {
    if (a.is_dir === b.is_dir) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }

    return a.is_dir ? -1 : 1;
  });

const stripMarkdownExt = (name: string) => name.replace(/\.md$/i, "");

const getParentPath = (targetPath: string) => {
  const parts = targetPath.split(/[/\\]/);
  parts.pop();
  return parts.join(targetPath.includes("\\") ? "\\" : "/");
};

const isSameOrChildPath = (candidate: string, parent: string) => {
  if (candidate === parent) return true;
  return (
    candidate.startsWith(`${parent}/`) || candidate.startsWith(`${parent}\\`)
  );
};

export default function Home() {
  const navigate = useNavigate();
  const { setHasVault } = useApp();

  const [tree, setTree] = useState<FileNode[]>([]);
  const [childrenByPath, setChildrenByPath] = useState<
    Record<string, FileNode[]>
  >({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  const [vaultPath, setVaultPath] = useState("");
  const [vaultName, setVaultName] = useState("Vault");

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [tabs, setTabs] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState<Record<string, string>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const [leftView, setLeftView] = useState<LeftView>("vault");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [draftCreate, setDraftCreate] = useState<DraftCreate | null>(null);
  const [draftRename, setDraftRename] = useState<DraftRename | null>(null);

  const [editorMode, setEditorMode] = useState<EditorMode>("live");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [bottomVisible, setBottomVisible] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomTab>("outline");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<Record<string, string>>({});
  const lastSavedRef = useRef<Record<string, string>>({});

  const separator = useMemo(
    () => (vaultPath.includes("\\") ? "\\" : "/"),
    [vaultPath],
  );

  useEffect(() => {
    latestContentRef.current = fileContent;
  }, [fileContent]);

  const fetchDirectory = async (path: string) => {
    const res = (await invoke("read_dir", { path })) as FileNode[];
    return sortNodes(res);
  };

  const loadTree = async () => {
    const config: any = await invoke("get_config");

    if (!config?.last_opened) return;
    setVaultPath(config.last_opened);
    const folderParts = config.last_opened.split(/[/\\]/).filter(Boolean);
    setVaultName(folderParts[folderParts.length - 1] || "Vault");

    const res = await fetchDirectory(config.last_opened);
    setTree(res);
    setChildrenByPath({});
    setExpandedFolders(new Set());
    setLoadingFolders(new Set());
  };

  useEffect(() => {
    loadTree();
  }, []);

  const refreshDirectory = async (path: string | null) => {
    if (!vaultPath) return;

    if (!path) {
      setTree(await fetchDirectory(vaultPath));
      return;
    }

    const children = await fetchDirectory(path);
    setChildrenByPath((prev) => ({
      ...prev,
      [path]: children,
    }));
  };

  const toggleFolder = async (path: string) => {
    if (expandedFolders.has(path)) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      return;
    }

    if (!childrenByPath[path]) {
      setLoadingFolders((prev) => new Set(prev).add(path));
      try {
        const children = await fetchDirectory(path);
        setChildrenByPath((prev) => ({
          ...prev,
          [path]: children,
        }));
      } finally {
        setLoadingFolders((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    }

    setExpandedFolders((prev) => new Set(prev).add(path));
  };

  const openFile = async (path: string) => {
    let content = fileContent[path];

    if (content === undefined) {
      content = ((await invoke("read_file", { path })) as string) || "";
      setFileContent((prev) => ({
        ...prev,
        [path]: content as string,
      }));
    }

    lastSavedRef.current[path] = content || "";
    setSaveState("saved");
    setSelectedPath(path);
    setActiveFile(path);
    setTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  const currentContent = activeFile ? (fileContent[activeFile] ?? "") : "";

  useEffect(() => {
    if (!activeFile) {
      setSaveState("idle");
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      return;
    }

    const content = currentContent;
    if (content === (lastSavedRef.current[activeFile] ?? "")) {
      setSaveState("saved");
      return;
    }

    setSaveState("dirty");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    const filePath = activeFile;
    saveTimerRef.current = setTimeout(async () => {
      const payload = latestContentRef.current[filePath] ?? "";
      setSaveState("saving");

      try {
        await invoke("write_file", { path: filePath, content: payload });
        lastSavedRef.current[filePath] = payload;

        const latest = latestContentRef.current[filePath] ?? "";
        setSaveState(latest === payload ? "saved" : "dirty");
      } catch {
        setSaveState("error");
      }
    }, 350);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeFile, currentContent]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setDraftCreate({
          parentPath: null,
          type: "file",
          name: "",
        });
      }

      if (event.key === "Escape") {
        setDraftCreate(null);
        setDraftRename(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeTab = (path: string) => {
    setTabs((prev) => {
      const nextTabs = prev.filter((tab) => tab !== path);
      if (activeFile === path) {
        setActiveFile(nextTabs[nextTabs.length - 1] ?? null);
      }
      return nextTabs;
    });
  };

  const startCreate = (parentPath: string | null, type: CreateType) => {
    setDraftRename(null);
    setDraftCreate({
      parentPath,
      type,
      name: "",
    });
  };

  const submitCreate = async () => {
    if (!draftCreate || !vaultPath || !draftCreate.name.trim()) return;

    const baseName = draftCreate.name.trim();
    const name =
      draftCreate.type === "file"
        ? `${stripMarkdownExt(baseName)}.md`
        : baseName;
    const base = draftCreate.parentPath ?? vaultPath;
    const fullPath = `${base}${base.endsWith(separator) ? "" : separator}${name}`;

    if (draftCreate.type === "file") {
      await invoke("create_file", { path: fullPath });
    } else {
      await invoke("create_dir", { path: fullPath });
    }

    if (draftCreate.parentPath) {
      await refreshDirectory(draftCreate.parentPath);
      setExpandedFolders((prev) => new Set(prev).add(draftCreate.parentPath!));
    } else {
      await refreshDirectory(null);
    }

    if (draftCreate.type === "file") {
      await openFile(fullPath);
    }

    setDraftCreate(null);
  };

  const submitRename = async () => {
    if (!draftRename || !draftRename.name.trim()) return;

    const oldPath = draftRename.path;
    const originalName = oldPath.split(/[/\\]/).pop() || "";
    const parentPath = getParentPath(oldPath);
    const isFile = /\.md$/i.test(originalName);
    const nextName = isFile
      ? `${stripMarkdownExt(draftRename.name.trim())}.md`
      : draftRename.name.trim();
    const newPath = `${parentPath}${parentPath.endsWith(separator) ? "" : separator}${nextName}`;

    if (newPath === oldPath) {
      setDraftRename(null);
      return;
    }

    await invoke("rename_file", { oldPath, newPath });

    setFileContent((prev) => {
      const next = { ...prev };

      Object.keys(prev).forEach((key) => {
        if (!isSameOrChildPath(key, oldPath)) return;
        const replacement = key.replace(oldPath, newPath);
        next[replacement] = prev[key];
        delete next[key];
      });

      return next;
    });

    setTabs((prev) =>
      prev.map((tabPath) =>
        isSameOrChildPath(tabPath, oldPath)
          ? tabPath.replace(oldPath, newPath)
          : tabPath,
      ),
    );

    setActiveFile((prev) =>
      prev && isSameOrChildPath(prev, oldPath)
        ? prev.replace(oldPath, newPath)
        : prev,
    );

    setSelectedPath((prev) =>
      prev && isSameOrChildPath(prev, oldPath)
        ? prev.replace(oldPath, newPath)
        : prev,
    );

    setChildrenByPath({});
    await refreshDirectory(null);
    setDraftRename(null);
  };

  const deletePath = async (path: string) => {
    await invoke("delete_path", { path });

    setFileContent((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (isSameOrChildPath(key, path)) {
          delete next[key];
        }
      });
      return next;
    });

    setTabs((prev) => {
      const remaining = prev.filter(
        (tabPath) => !isSameOrChildPath(tabPath, path),
      );
      setActiveFile((current) => {
        if (!current || !isSameOrChildPath(current, path)) return current;
        return remaining[remaining.length - 1] ?? null;
      });
      return remaining;
    });

    setSelectedPath((prev) =>
      prev && isSameOrChildPath(prev, path) ? null : prev,
    );

    const parentPath = getParentPath(path);
    if (parentPath === vaultPath) {
      await refreshDirectory(null);
    } else {
      await refreshDirectory(parentPath);
    }
  };

  const closeCurrentVault = async () => {
    await invoke("close_active_vault");
    setHasVault(false);
    navigate("/onboard");
  };

  const goToOnboard = () => {
    navigate("/onboard");
  };

  const discoveredFiles = useMemo(() => {
    const map = new Map<string, FileNode>();

    const walk = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        map.set(node.path, node);
        if (node.is_dir) {
          const children = childrenByPath[node.path];
          if (children?.length) {
            walk(children);
          }
        }
      });
    };

    walk(tree);
    return Array.from(map.values()).filter((node) => !node.is_dir);
  }, [tree, childrenByPath]);

  const searchResults = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();
    if (!value) return discoveredFiles;

    return discoveredFiles.filter((node) => {
      const inName = node.name.toLowerCase().includes(value);
      const inContent = (fileContent[node.path] || "")
        .toLowerCase()
        .includes(value);
      return inName || inContent;
    });
  }, [searchTerm, discoveredFiles, fileContent]);

  const headings = useMemo(() => {
    return currentContent
      .split("\n")
      .map((line) => {
        const match = /^(#{1,6})\s+(.+)/.exec(line);
        if (!match) return null;
        return {
          level: match[1].length,
          text: match[2].trim(),
        };
      })
      .filter((h): h is { level: number; text: string } => Boolean(h));
  }, [currentContent]);

  const backlinks = useMemo(() => {
    if (!activeFile) return [];
    const title = stripMarkdownExt(activeFile.split(/[/\\]/).pop() || "");
    const marker = `[[${title}]]`;

    return tabs
      .filter((tab) => tab !== activeFile)
      .filter((tab) => (fileContent[tab] || "").includes(marker))
      .map((tab) => stripMarkdownExt(tab.split(/[/\\]/).pop() || tab));
  }, [activeFile, tabs, fileContent]);

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : saveState === "dirty"
          ? "Unsaved"
          : saveState === "error"
            ? "Save failed"
            : "No file selected";

  const renderCreateRow = (parentPath: string | null, depth: number) => {
    if (!draftCreate || draftCreate.parentPath !== parentPath) return null;

    return (
      <div className="px-1 py-0.5" style={{ paddingLeft: 8 + depth * 12 }}>
        <div className="flex h-7 items-center gap-1 rounded-[5px] bg-[var(--surface-active)] px-1.5">
          {draftCreate.type === "file" ? (
            <RiFile3Fill className="size-3.5 text-[var(--text-muted)]" />
          ) : (
            <RiFolder3Fill className="size-3.5 text-[var(--text-muted)]" />
          )}
          <input
            autoFocus
            value={draftCreate.name}
            className="h-6 flex-1 border-0 bg-transparent text-[12px] text-[var(--text-primary)] outline-none"
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
            onBlur={submitCreate}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitCreate();
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
    const filtered = query.trim()
      ? nodes.filter((node) =>
          node.name.toLowerCase().includes(query.trim().toLowerCase()),
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
                  "group flex h-7 items-center gap-1 px-1 py-0.5 text-[12px] leading-none text-[var(--text-muted)]",
                  isSelected && "text-[var(--text-primary)]",
                )}
                style={{ paddingLeft: 8 + depth * 12 }}
              >
                <button
                  type="button"
                  className={cn(
                    "flex h-6 min-w-0 flex-1 items-center gap-1 rounded-[5px] px-1.5 text-left transition-colors",
                    isActive &&
                      "bg-[var(--surface-active)] text-[var(--text-primary)]",
                    !isActive && "hover:bg-[var(--surface-hover)]",
                  )}
                  onClick={() => {
                    setSelectedPath(node.path);
                    if (isFolder) {
                      toggleFolder(node.path);
                    } else {
                      openFile(node.path);
                    }
                  }}
                >
                  {isFolder ? (
                    <span className="flex size-3.5 items-center justify-center">
                      <RiArrowRightSLine
                        className={cn(
                          "size-3.5 text-[var(--text-muted)] transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                    </span>
                  ) : (
                    <span className="size-3.5" />
                  )}

                  {isFolder ? (
                    isExpanded ? (
                      <RiFolderOpenFill className="size-3.5" />
                    ) : (
                      <RiFolder3Fill className="size-3.5" />
                    )
                  ) : (
                    <RiFile3Fill className="size-3.5" />
                  )}

                  {isRenaming ? (
                    <input
                      autoFocus
                      value={draftRename?.name ?? ""}
                      className="h-5 min-w-0 flex-1 border-0 bg-transparent text-[12px] text-[var(--text-primary)] outline-none"
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
                      onBlur={submitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") submitRename();
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
                        onClick={() => startCreate(node.path, "file")}
                      >
                        <RiFileAddLine className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="tree-action"
                        title="New folder"
                        onClick={() => startCreate(node.path, "folder")}
                      >
                        <RiFolderAddLine className="size-3" />
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
                    <RiEdit2Line className="size-3" />
                  </button>
                  <button
                    type="button"
                    className="tree-action"
                    title="Delete"
                    onClick={() => deletePath(node.path)}
                  >
                    <RiDeleteBinLine className="size-3" />
                  </button>
                </div>
              </div>

              {isFolder && isExpanded && (
                <div>
                  {loadingFolders.has(node.path) && (
                    <div
                      className="flex items-center gap-1 px-2 py-1 text-[11px] text-[var(--text-muted)]"
                      style={{ paddingLeft: 20 + depth * 12 }}
                    >
                      <RiLoader4Line className="size-3 animate-spin" />
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

  const renderSidebarContent = () => {
    if (leftView === "search") {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Search
            </p>
            <div className="relative mt-1">
              <RiSearchLine className="pointer-events-none absolute left-2 top-1.5 size-3.5 text-[var(--text-muted)]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search notes"
                className="h-7 w-full rounded-[5px] border border-border bg-[var(--surface-panel)] pl-7 pr-2 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto py-1">
            {searchResults.map((node) => (
              <button
                key={node.path}
                type="button"
                className="flex h-7 w-full items-center gap-1 px-2 text-left text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                onClick={() => openFile(node.path)}
              >
                <RiFile3Fill className="size-3.5" />
                <span className="truncate">{stripMarkdownExt(node.name)}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (leftView === "settings") {
      return (
        <div className="flex h-full flex-col gap-2 px-2 py-2 text-[12px]">
          <div className="rounded-[5px] border border-border bg-[var(--surface-panel)] p-2">
            <p className="text-[11px] font-medium text-[var(--text-primary)]">
              Vault
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              {vaultName}
            </p>
          </div>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded-[5px] border border-border px-2 text-left text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            onClick={closeCurrentVault}
          >
            <RiShutDownLine className="size-3.5" />
            Close current vault
          </button>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded-[5px] border border-border px-2 text-left text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            onClick={goToOnboard}
          >
            <RiAddLine className="size-3.5" />
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
              <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Vault
              </p>
              <p className="truncate text-[12px] font-medium text-[var(--text-primary)]">
                {vaultName}
              </p>
            </div>
            <Button size="icon-xs" variant="ghost" onClick={() => loadTree()}>
              <RiRefreshLine className="size-3.5" />
            </Button>
          </div>

          <div className="relative">
            <RiSearchLine className="pointer-events-none absolute left-2 top-1.5 size-3.5 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter files"
              className="h-7 w-full rounded-[5px] border border-border bg-[var(--surface-panel)] pl-7 pr-2 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border px-2 py-1 text-[11px] text-[var(--text-muted)]">
          <span>Files</span>
          <div className="flex items-center gap-0.5">
            <button
              className="tree-action"
              title="New file"
              onClick={() => startCreate(null, "file")}
            >
              <RiFileAddLine className="size-3" />
            </button>
            <button
              className="tree-action"
              title="New folder"
              onClick={() => startCreate(null, "folder")}
            >
              <RiFolderAddLine className="size-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto py-1">
          {renderTree(tree, null)}
        </div>
      </>
    );
  };

  const renderBottomContent = () => {
    if (!activeFile) {
      return (
        <p className="text-[11px] text-[var(--text-muted)]">
          Open a note to view context.
        </p>
      );
    }

    if (bottomTab === "outline") {
      return headings.length ? (
        <div className="space-y-0.5">
          {headings.map((heading, idx) => (
            <div
              key={`${heading.text}-${idx}`}
              className="truncate rounded-[4px] px-1.5 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              style={{ paddingLeft: 6 + (heading.level - 1) * 10 }}
            >
              {heading.text}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-[var(--text-muted)]">No headings</p>
      );
    }

    if (bottomTab === "backlinks") {
      return backlinks.length ? (
        <div className="space-y-0.5">
          {backlinks.map((link) => (
            <div
              key={link}
              className="truncate rounded-[4px] px-1.5 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            >
              {link}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-[var(--text-muted)]">No backlinks</p>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--text-muted)]">
        <div className="rounded-[4px] bg-[var(--surface-hover)] px-2 py-1.5">
          <p>Words</p>
          <p className="mt-0.5 text-[12px] text-[var(--text-primary)]">
            {currentContent.trim().split(/\s+/).filter(Boolean).length}
          </p>
        </div>
        <div className="rounded-[4px] bg-[var(--surface-hover)] px-2 py-1.5">
          <p>Characters</p>
          <p className="mt-0.5 text-[12px] text-[var(--text-primary)]">
            {currentContent.length}
          </p>
        </div>
        <div className="rounded-[4px] bg-[var(--surface-hover)] px-2 py-1.5">
          <p>Lines</p>
          <p className="mt-0.5 text-[12px] text-[var(--text-primary)]">
            {currentContent.split("\n").length}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--app-base)] text-[13px] text-[var(--text-primary)]">
      <Titlebar
        title={
          activeFile
            ? stripMarkdownExt(activeFile.split(/[/\\]/).pop() || "Misty")
            : "Misty"
        }
      />

      <div className="flex h-[calc(100vh-2.25rem)] overflow-hidden">
        <aside className="flex w-11 flex-col items-center gap-1 border-r border-border bg-[var(--surface-sidebar-deep)] px-1 py-2">
          <button
            type="button"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mb-1 flex size-8 items-center justify-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            {sidebarCollapsed ? (
              <RiMenuUnfoldLine className="size-4" />
            ) : (
              <RiMenuFoldLine className="size-4" />
            )}
          </button>

          {railItems.map((item) => (
            <button
              key={item.key}
              type="button"
              title={item.label}
              className={cn(
                "flex size-8 items-center justify-center rounded-[5px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                leftView === item.key &&
                  "bg-[var(--surface-active)] text-[var(--text-primary)]",
              )}
              onClick={() => setLeftView(item.key)}
            >
              <item.icon className="size-4" />
            </button>
          ))}
        </aside>

        <section className="flex min-w-0 flex-1 overflow-hidden bg-[var(--app-base)]">
          {!sidebarCollapsed && (
            <section className="flex h-full w-[290px] min-w-[250px] max-w-[340px] flex-col border-r border-border bg-[var(--surface-sidebar)]">
              {renderSidebarContent()}
            </section>
          )}

          <section className="flex min-w-0 flex-1 flex-col bg-[var(--surface-panel)]">
            {leftView === "settings" ? (
              <div className="flex flex-1 items-start justify-center overflow-auto p-6">
                <div className="w-full max-w-3xl space-y-3 rounded-[6px] border border-border bg-[var(--surface-sidebar)] p-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
                      Settings
                    </p>
                    <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
                      Vault management
                    </h2>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      Close this vault or switch to another one from onboarding.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="flex h-10 items-center gap-2 rounded-[5px] border border-border px-3 text-left text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                      onClick={closeCurrentVault}
                    >
                      <RiShutDownLine className="size-4" />
                      Close current vault
                    </button>
                    <button
                      type="button"
                      className="flex h-10 items-center gap-2 rounded-[5px] border border-border px-3 text-left text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                      onClick={goToOnboard}
                    >
                      <RiAddLine className="size-4" />
                      Open or create another vault
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-8 items-end border-b border-border bg-[var(--surface-panel)] px-1">
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
                            "group flex h-7 min-w-[120px] max-w-[220px] items-center rounded-t-[4px] border border-transparent px-2 text-[12px]",
                            isActive
                              ? "border-border border-b-[var(--surface-panel)] bg-[var(--surface-panel)] text-[var(--text-primary)]"
                              : "bg-[var(--surface-sidebar)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]",
                          )}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 truncate text-left"
                            onClick={() => openFile(tabPath)}
                          >
                            {tabTitle}
                          </button>
                          <button
                            type="button"
                            className="ml-1 hidden size-4 items-center justify-center rounded-[3px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] group-hover:flex"
                            onClick={() => closeTab(tabPath)}
                          >
                            <RiCloseLine className="size-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    title="New note"
                    className="mb-0.5 ml-1 flex size-6 items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    onClick={() => startCreate(null, "file")}
                  >
                    <RiAddLine className="size-3.5" />
                  </button>
                </div>

                <div className="flex h-8 items-center justify-between border-b border-border px-2 text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <span>{saveLabel}</span>
                    {activeFile && (
                      <span className="truncate opacity-70">{activeFile}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    {(["source", "live", "preview"] as EditorMode[]).map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setEditorMode(mode)}
                          className={cn(
                            "h-6 rounded-[4px] px-2 text-[11px] transition-colors",
                            editorMode === mode
                              ? "bg-[var(--surface-active)] text-[var(--text-primary)]"
                              : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                          )}
                        >
                          {mode}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => setBottomVisible((v) => !v)}
                      className="ml-1 flex h-6 items-center rounded-[4px] px-2 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    >
                      {bottomVisible ? "Hide context" : "Show context"}
                    </button>
                  </div>
                </div>

                {!activeFile ? (
                  <div className="flex flex-1 items-center justify-center text-[12px] text-[var(--text-muted)]">
                    Select a note to start writing.
                  </div>
                ) : (
                  <>
                    <div className="flex min-h-0 flex-1 overflow-hidden">
                      {(editorMode === "source" || editorMode === "live") && (
                        <textarea
                          value={currentContent}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (!activeFile) return;

                            setFileContent((prev) => ({
                              ...prev,
                              [activeFile]: value,
                            }));
                            setSaveState("dirty");
                          }}
                          className={cn(
                            "h-full flex-1 resize-none bg-[var(--surface-panel)] px-5 py-4 font-medium text-[14px] leading-[1.7] text-[var(--text-primary)] outline-none",
                            editorMode === "live" && "border-r border-border",
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
                      <section className="h-36 border-t border-border bg-[var(--surface-sidebar)] px-2 py-1.5">
                        <div className="mb-1 flex items-center gap-0.5">
                          {(
                            [
                              ["outline", "Outline"],
                              ["backlinks", "Backlinks"],
                              ["meta", "Metadata"],
                            ] as Array<[BottomTab, string]>
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              className={cn(
                                "h-6 rounded-[4px] px-2 text-[11px]",
                                bottomTab === key
                                  ? "bg-[var(--surface-active)] text-[var(--text-primary)]"
                                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]",
                              )}
                              onClick={() => setBottomTab(key)}
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="ml-auto flex size-6 items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                            onClick={() => setBottomVisible(false)}
                          >
                            <RiArrowDownSLine className="size-4" />
                          </button>
                        </div>
                        <div className="h-[calc(100%-1.75rem)] overflow-auto pr-1">
                          {renderBottomContent()}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

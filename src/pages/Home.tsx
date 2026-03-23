import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import {
  Layers01Icon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Search01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";

import { HIcon } from "@/components/ui/hicon";
import { Titlebar } from "@/components/shell/Titlebar";
import { HomeSidebarContent } from "@/components/home/HomeSidebarContent";
import { HomeSettingsView } from "@/components/home/HomeSettingsView";
import { HomeEditorWorkspace } from "@/components/home/HomeEditorWorkspace";
import type {
  BottomTab,
  CreateType,
  DraftCreate,
  DraftRename,
  EditorMode,
  FileNode,
  LeftView,
  SaveState,
} from "@/components/home/types";
import { useApp } from "@/state/app";
import {
  eventToShortcut,
  isEditableElement,
  normalizeShortcut,
} from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

type NoteEntry = {
  title: string;
  path: string;
};

const railItems: Array<{
  key: LeftView;
  label: string;
  icon: Parameters<typeof HIcon>[0]["icon"];
}> = [
  { key: "vault", label: "Vault", icon: Layers01Icon },
  { key: "search", label: "Search", icon: Search01Icon },
  { key: "settings", label: "Settings", icon: Settings01Icon },
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
  const {
    setHasVault,
    themeMode,
    setThemeMode,
    shortcuts,
    setShortcut,
    resetShortcuts,
    systemInfo,
    loadSystemInfo,
    checkForUpdates,
    updateStatus,
    updateVersion,
    updateError,
  } = useApp();

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
  const [noteIndex, setNoteIndex] = useState<NoteEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const [leftView, setLeftView] = useState<LeftView>("vault");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FileNode[]>([]);

  const [draftCreate, setDraftCreate] = useState<DraftCreate | null>(null);
  const [draftRename, setDraftRename] = useState<DraftRename | null>(null);

  const [editorMode, setEditorMode] = useState<EditorMode>("live");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [bottomVisible, setBottomVisible] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>("outline");
  const [headings, setHeadings] = useState<
    Array<{ level: number; text: string }>
  >([]);
  const [backlinks, setBacklinks] = useState<string[]>([]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<Record<string, string>>({});
  const lastSavedRef = useRef<Record<string, string>>({});
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const separator = useMemo(
    () => (vaultPath.includes("\\") ? "\\" : "/"),
    [vaultPath],
  );

  useEffect(() => {
    latestContentRef.current = fileContent;
  }, [fileContent]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
  }, [themeMode]);

  useEffect(() => {
    void loadSystemInfo();
  }, [loadSystemInfo]);

  const fetchDirectory = async (path: string) => {
    const res = (await invoke("read_dir", { path })) as FileNode[];
    return sortNodes(res);
  };

  const loadNoteIndex = async (path: string) => {
    const notes = (await invoke("list_all_notes", {
      path,
    })) as NoteEntry[];
    setNoteIndex(notes);
  };

  const loadTree = async () => {
    const config: any = await invoke("get_config");

    if (!config?.last_opened) {
      setNoteIndex([]);
      return;
    }
    setVaultPath(config.last_opened);
    const folderParts = config.last_opened.split(/[/\\]/).filter(Boolean);
    setVaultName(folderParts[folderParts.length - 1] || "Vault");

    const res = await fetchDirectory(config.last_opened);
    await loadNoteIndex(config.last_opened);
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

  const startCreate = (parentPath: string | null, type: CreateType) => {
    setDraftRename(null);
    setDraftCreate({
      parentPath,
      type,
      name: "",
    });
  };

  const startRootCreate = (type: CreateType) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }

    if (leftView !== "vault") {
      setLeftView("vault");
    }

    startCreate(null, type);
  };

  const startRootFileCreate = () => {
    startRootCreate("file");
  };

  const startRootFolderCreate = () => {
    startRootCreate("folder");
  };

  const closeTab = (path: string) => {
    setTabs((prev) => {
      const nextTabs = prev.filter((tab) => tab !== path);
      if (activeFile === path) {
        setActiveFile(nextTabs[nextTabs.length - 1] ?? null);
      }
      return nextTabs;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraftCreate(null);
        setDraftRename(null);
        return;
      }

      if (isEditableElement(event.target)) {
        return;
      }

      const pressed = eventToShortcut(event);

      if (pressed === normalizeShortcut(shortcuts.newFolder)) {
        event.preventDefault();
        startRootFolderCreate();
        return;
      }

      if (pressed === normalizeShortcut(shortcuts.newFile)) {
        event.preventDefault();
        startRootFileCreate();
        return;
      }

      if (pressed === normalizeShortcut(shortcuts.closeTab)) {
        if (!activeFile) return;
        event.preventDefault();
        closeTab(activeFile);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeFile, shortcuts, startRootFileCreate, startRootFolderCreate]);

  useEffect(() => {
    if (!draftCreate) return;

    const dismissDraftOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-create-draft]")) return;
      setDraftCreate(null);
    };

    document.addEventListener("mousedown", dismissDraftOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", dismissDraftOnOutsideClick);
    };
  }, [draftCreate]);

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

    await loadNoteIndex(vaultPath);

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
    await loadNoteIndex(vaultPath);
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

    await loadNoteIndex(vaultPath);
  };

  const closeCurrentVault = async () => {
    await invoke("close_active_vault");
    setNoteIndex([]);
    setHasVault(false);
    navigate("/onboard");
  };

  const goToOnboard = () => {
    navigate("/onboard");
  };

  useEffect(() => {
    if (!vaultPath || leftView !== "search") {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const term = deferredSearchTerm.trim();

          if (!term) {
            const allNotes = noteIndex.map((note) => ({
              name: `${note.title}.md`,
              path: note.path,
              is_dir: false,
            }));
            if (!cancelled) {
              setSearchResults(allNotes);
            }
            return;
          }

          const matches = (await invoke("search_notes", {
            path: vaultPath,
            query: term,
          })) as NoteEntry[];

          if (!cancelled) {
            setSearchResults(
              matches.map((note) => ({
                name: `${note.title}.md`,
                path: note.path,
                is_dir: false,
              })),
            );
          }
        } catch {
          if (!cancelled) {
            setSearchResults([]);
          }
        }
      })();
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [leftView, vaultPath, deferredSearchTerm, noteIndex]);

  useEffect(() => {
    if (!activeFile || !bottomVisible || bottomTab !== "outline") {
      setHeadings([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const items = (await invoke("parse_markdown_headings", {
            content: currentContent,
          })) as Array<{ level: number; text: string }>;
          if (!cancelled) {
            setHeadings(items);
          }
        } catch {
          if (!cancelled) {
            setHeadings([]);
          }
        }
      })();
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeFile, currentContent, bottomVisible, bottomTab]);

  useEffect(() => {
    if (
      !activeFile ||
      !vaultPath ||
      !bottomVisible ||
      bottomTab !== "backlinks"
    ) {
      setBacklinks([]);
      return;
    }

    let cancelled = false;
    const title = stripMarkdownExt(activeFile.split(/[/\\]/).pop() || "");
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const links = (await invoke("find_backlinks", {
            path: vaultPath,
            noteTitle: title,
            activeFile,
          })) as string[];
          if (!cancelled) {
            setBacklinks(links);
          }
        } catch {
          if (!cancelled) {
            setBacklinks([]);
          }
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeFile, vaultPath, noteIndex, bottomVisible, bottomTab]);

  const notePathByTitle = useMemo(() => {
    const map = new Map<string, string>();

    noteIndex.forEach((node) => {
      const key = node.title.trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, node.path);
      }
    });

    return map;
  }, [noteIndex]);

  const linkedNoteTitles = useMemo(() => {
    const activeTitle = activeFile
      ? stripMarkdownExt(activeFile.split(/[/\\]/).pop() || "")
          .trim()
          .toLowerCase()
      : "";
    const seen = new Set<string>();
    const titles: string[] = [];

    noteIndex.forEach((node) => {
      const original = node.title.trim();
      const key = original.toLowerCase();
      if (activeTitle && key === activeTitle) return;
      if (!original || seen.has(key)) return;
      seen.add(key);
      titles.push(original);
    });

    return titles.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [noteIndex, activeFile]);

  const resolveLinkedNote = (title: string) => {
    const key = title.trim().toLowerCase();
    return notePathByTitle.get(key) ?? null;
  };

  const openLinkedNote = (title: string) => {
    const path = resolveLinkedNote(title);
    if (!path) return;
    void openFile(path);
  };

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

  return (
    <div className="app-shell bg-app-base text-text-primary h-screen w-screen overflow-hidden text-[14px]">
      <Titlebar
        title={
          activeFile
            ? stripMarkdownExt(activeFile.split(/[/\\]/).pop() || "Kitab")
            : "Kitab"
        }
      />

      <div className="flex h-[calc(100vh-2.25rem)] overflow-hidden">
        <aside className="border-border bg-surface-sidebar-deep/10! flex w-12 flex-col items-center gap-1.5 border-r px-1.5 py-2">
          <button
            type="button"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-text-muted hover:bg-surface-hover hover:text-text-primary mb-1 flex size-9 items-center justify-center rounded-[6px]"
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            {sidebarCollapsed ? (
              <HIcon icon={PanelLeftOpenIcon} size={16} />
            ) : (
              <HIcon icon={PanelLeftCloseIcon} size={16} />
            )}
          </button>

          {railItems.map((item) => (
            <button
              key={item.key}
              type="button"
              title={item.label}
              className={cn(
                "text-text-muted hover:bg-surface-hover hover:text-text-primary flex size-9 items-center justify-center rounded-[6px] transition-colors",
                leftView === item.key && "bg-surface-active text-text-primary",
              )}
              onClick={() => setLeftView(item.key)}
            >
              <HIcon icon={item.icon} size={16} />
            </button>
          ))}
        </aside>

        <section className="bg-app-base/10! flex min-w-0 flex-1 overflow-hidden">
          {!sidebarCollapsed && (
            <section className="border-border bg-surface-sidebar/10! flex h-full w-72.5 max-w-85 min-w-62.5 flex-col border-r">
              <HomeSidebarContent
                leftView={leftView}
                vaultName={vaultName}
                query={query}
                setQuery={setQuery}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchResults={searchResults}
                tree={tree}
                expandedFolders={expandedFolders}
                loadingFolders={loadingFolders}
                childrenByPath={childrenByPath}
                activeFile={activeFile}
                selectedPath={selectedPath}
                draftCreate={draftCreate}
                setDraftCreate={setDraftCreate}
                draftRename={draftRename}
                setDraftRename={setDraftRename}
                stripMarkdownExt={stripMarkdownExt}
                onLoadTree={loadTree}
                onSelectPath={setSelectedPath}
                onStartCreate={startCreate}
                onSubmitCreate={submitCreate}
                onSubmitRename={submitRename}
                onDeletePath={deletePath}
                onToggleFolder={toggleFolder}
                onOpenFile={openFile}
                onCloseCurrentVault={closeCurrentVault}
                onGoToOnboard={goToOnboard}
              />
            </section>
          )}

          <section className="flex min-w-0 flex-1 flex-col bg-surface-panel">
            {leftView === "settings" ? (
              <HomeSettingsView
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                shortcuts={shortcuts}
                onShortcutChange={setShortcut}
                onShortcutReset={resetShortcuts}
                appVersion={systemInfo?.appVersion ?? "loading..."}
                updateStatus={updateStatus}
                updateVersion={updateVersion}
                updateError={updateError}
                onCheckForUpdates={() => {
                  void checkForUpdates();
                }}
                osSummary={
                  systemInfo
                    ? `${systemInfo.platform} / ${systemInfo.osType} ${systemInfo.version} (${systemInfo.arch})`
                    : "loading..."
                }
                aboutLabel="Made by P8labs"
              />
            ) : (
              <HomeEditorWorkspace
                tabs={tabs}
                activeFile={activeFile}
                currentContent={currentContent}
                saveLabel={saveLabel}
                editorMode={editorMode}
                bottomVisible={bottomVisible}
                bottomTab={bottomTab}
                headings={headings}
                backlinks={backlinks}
                stripMarkdownExt={stripMarkdownExt}
                onOpenFile={openFile}
                onCloseTab={closeTab}
                onStartCreate={startRootFileCreate}
                linkedNoteTitles={linkedNoteTitles}
                resolveLinkedNote={resolveLinkedNote}
                onOpenLinkedNote={openLinkedNote}
                setEditorMode={setEditorMode}
                setBottomVisible={setBottomVisible}
                setBottomTab={setBottomTab}
                onContentChange={(value) => {
                  if (!activeFile) return;

                  setFileContent((prev) => ({
                    ...prev,
                    [activeFile]: value,
                  }));
                  setSaveState("dirty");
                }}
              />
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

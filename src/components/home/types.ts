export type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
};

export type CreateType = "file" | "folder";
export type LeftView = "vault" | "search" | "settings";
export type EditorMode = "source" | "live" | "preview";
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
export type BottomTab = "outline" | "backlinks" | "meta";
export type ThemeMode = "light" | "dark";

export type DraftCreate = {
  parentPath: string | null;
  type: CreateType;
  name: string;
};

export type DraftRename = {
  path: string;
  name: string;
};

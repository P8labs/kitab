import { getVersion } from "@tauri-apps/api/app";
import {
  arch,
  family,
  platform,
  type as osType,
  version as osVersion,
} from "@tauri-apps/plugin-os";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ThemeMode } from "@/components/home/types";
import { defaultShortcuts, normalizeShortcut } from "@/lib/shortcuts";

export type ShortcutAction = "closeTab" | "newFile" | "newFolder";

export type AppShortcuts = Record<ShortcutAction, string>;

type SystemInfo = {
  platform: string;
  osType: string;
  family: string;
  version: string;
  arch: string;
  appVersion: string;
};

type AppState = {
  hasVault: boolean;
  themeMode: ThemeMode;
  shortcuts: AppShortcuts;
  systemInfo: SystemInfo | null;
  setHasVault: (value: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setShortcut: (action: ShortcutAction, combo: string) => void;
  resetShortcuts: () => void;
  loadSystemInfo: () => Promise<void>;
  refresh: () => void;
  refreshToken: number;
};

type PersistedState = Pick<AppState, "themeMode" | "shortcuts">;

const resolveThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const normalizeShortcuts = (shortcuts: AppShortcuts): AppShortcuts => ({
  closeTab: normalizeShortcut(shortcuts.closeTab),
  newFile: normalizeShortcut(shortcuts.newFile),
  newFolder: normalizeShortcut(shortcuts.newFolder),
});

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasVault: false,
      themeMode: resolveThemeMode(),
      shortcuts: normalizeShortcuts(defaultShortcuts),
      systemInfo: null,
      refreshToken: 0,
      setHasVault: (value) => set({ hasVault: value }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setShortcut: (action, combo) =>
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [action]: normalizeShortcut(combo),
          },
        })),
      resetShortcuts: () =>
        set({ shortcuts: normalizeShortcuts(defaultShortcuts) }),
      loadSystemInfo: async () => {
        const fallback = {
          platform:
            typeof navigator !== "undefined" ? navigator.platform : "unknown",
          osType: "unknown",
          family: "unknown",
          version: "unknown",
          arch: "unknown",
          appVersion: "unknown",
        };

        try {
          const info = {
            platform: platform(),
            osType: osType(),
            family: family(),
            version: osVersion(),
            arch: arch(),
            appVersion: await getVersion(),
          };

          set({ systemInfo: info });
        } catch {
          set({ systemInfo: fallback });
        }
      },
      refresh: () =>
        set((state) => ({
          refreshToken: state.refreshToken + 1,
        })),
    }),
    {
      name: "kitab-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        themeMode: state.themeMode,
        shortcuts: state.shortcuts,
      }),
      merge: (persisted, current) => {
        const typedPersisted = persisted as Partial<PersistedState>;
        return {
          ...current,
          ...typedPersisted,
          shortcuts: normalizeShortcuts({
            ...defaultShortcuts,
            ...(typedPersisted.shortcuts ?? {}),
          }),
        };
      },
    },
  ),
);

export function useApp() {
  return useAppStore();
}

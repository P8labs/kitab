import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/components/home/types";
import type { AppShortcuts, ShortcutAction } from "@/state/app";
import {
  defaultShortcuts,
  eventToShortcut,
  isModifierOnlyShortcut,
  shortcutLabels,
} from "@/lib/shortcuts";

type HomeSettingsViewProps = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  shortcuts: AppShortcuts;
  onShortcutChange: (action: ShortcutAction, combo: string) => void;
  onShortcutReset: () => void;
  appVersion: string;
  osSummary: string;
  aboutLabel: string;
};

const themeModes: ThemeMode[] = ["light", "dark"];

export function HomeSettingsView({
  themeMode,
  setThemeMode,
  shortcuts,
  onShortcutChange,
  onShortcutReset,
  appVersion,
  osSummary,
  aboutLabel,
}: HomeSettingsViewProps) {
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(
    null,
  );

  const shortcutActions = useMemo(
    () => ["closeTab", "newFile", "newFolder"] as ShortcutAction[],
    [],
  );

  useEffect(() => {
    if (!recordingAction) return;

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingAction(null);
        return;
      }

      const combo = eventToShortcut(event);
      if (isModifierOnlyShortcut(combo)) {
        return;
      }

      onShortcutChange(recordingAction, combo);
      setRecordingAction(null);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [recordingAction, onShortcutChange]);

  return (
    <div className="relative flex min-w-0 flex-1 justify-start overflow-auto px-3 py- sm:px-6 sm:pt-8 h-full">
      <div className="flex flex-col w-full min-w-0 max-w-4xl h-fit px-4 py-4 sm:px-6 sm:py-6 dark:border-white/10">
        <div className="mb-8">
          <p className="text-[11px] tracking-[0.08em] text-text-muted uppercase">
            Settings
          </p>
          <h2 className="mt-1 text-[24px] font-semibold text-text-primary">
            Workspace preferences
          </h2>
          <p className="mt-1 text-[13px] text-text-muted">
            Tune appearance, keyboard shortcuts, and app details.
          </p>
        </div>

        <section className="border-border/75 border-t pt-5">
          <p className="mb-3 text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Appearance
          </p>
          <div className="flex items-center gap-2">
            {themeModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "h-9 rounded-full border border-black/12 px-4 text-[12px] capitalize shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors dark:border-white/45 dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)]",
                  themeMode === mode
                    ? "bg-surface-active text-text-primary"
                    : "bg-surface-sidebar text-text-primary hover:bg-surface-hover dark:bg-surface-sidebar/70 dark:text-text-muted dark:hover:bg-surface-hover",
                )}
                onClick={() => setThemeMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        <section className="border-border/75 mt-8 border-t pt-5">
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row">
            <div>
              <p className="text-[11px] tracking-[0.06em] text-text-muted uppercase">
                Keyboard shortcuts
              </p>
              <p className="mt-1 text-[12px] text-text-muted">
                Click record, then press your preferred key combo.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-black/12 bg-surface-sidebar px-3 py-1.5 text-[11px] text-text-primary shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-surface-hover dark:border-white/45 dark:bg-surface-sidebar/70 dark:text-text-muted dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)] dark:hover:bg-surface-hover"
              onClick={onShortcutReset}
            >
              Reset defaults
            </button>
          </div>

          <div className="space-y-1">
            {shortcutActions.map((action) => (
              <div
                key={action}
                className="flex flex-col items-start gap-2 rounded-xl border border-black/6 px-2 py-2 transition-all duration-150 hover:border-black/16 hover:bg-black/4 sm:flex-row sm:items-center sm:justify-between dark:border-transparent dark:hover:border-white/35 dark:hover:bg-surface-sidebar/75 dark:hover:shadow-[0_12px_26px_rgba(20,20,20,0.06)]"
              >
                <div>
                  <p className="text-[12px] font-medium text-text-primary">
                    {shortcutLabels[action]}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Default {defaultShortcuts[action]}
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                  <span className="min-w-20 rounded-full border border-black/12 bg-surface-sidebar px-3 py-1 text-center text-[11px] text-text-primary shadow-[0_2px_6px_rgba(0,0,0,0.06)] dark:border-white/45 dark:bg-surface-panel/70 dark:shadow-none">
                    {shortcuts[action]}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border border-black/12 bg-surface-sidebar px-3 py-1.5 text-[11px] text-text-primary shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-surface-hover dark:border-white/45 dark:bg-surface-sidebar/70 dark:text-text-muted dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)] dark:hover:bg-surface-hover",
                      recordingAction === action &&
                        "bg-surface-active text-text-primary shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
                    )}
                    onClick={() =>
                      setRecordingAction((current) =>
                        current === action ? null : action,
                      )
                    }
                  >
                    {recordingAction === action ? "Press keys" : "Record"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-border/75 mt-8 border-t pt-5">
          <p className="mb-3 text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Application
          </p>
          <div className="grid gap-y-2 text-[12px] sm:grid-cols-[140px_1fr] sm:items-center">
            <p className="text-text-muted">Version</p>
            <p className="break-all text-text-primary">{appVersion}</p>

            <p className="text-text-muted">OS</p>
            <p className="wrap-break-word text-text-primary">{osSummary}</p>

            {/* <p className="text-text-muted">GitHub</p>
            <p className="text-text-muted">
              <a
                className="text-text-primary underline underline-offset-3"
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                {githubUrl}
              </a>
            </p> */}

            <p className="text-text-muted">About</p>
            <p className="wrap-break-word text-text-primary">{aboutLabel}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

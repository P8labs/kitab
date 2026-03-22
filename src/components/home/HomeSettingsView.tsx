import { Add01Icon, ShutDownIcon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useState } from "react";

import { HIcon } from "@/components/ui/hicon";
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
  githubUrl: string;
  aboutLabel: string;
  onCloseCurrentVault: () => void;
  onGoToOnboard: () => void;
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
  githubUrl,
  aboutLabel,
  onCloseCurrentVault,
  onGoToOnboard,
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
    <div className="flex flex-1 justify-center overflow-auto px-6 py-8">
      <div className="w-full max-w-4xl">
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

        <section className="border-border/80 border-t pt-5">
          <p className="mb-3 text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Appearance
          </p>
          <div className="flex items-center gap-2">
            {themeModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "h-9 rounded-full px-4 text-[12px] capitalize transition-colors",
                  themeMode === mode
                    ? "bg-surface-active text-text-primary"
                    : "bg-surface-sidebar text-text-muted hover:bg-surface-hover",
                )}
                onClick={() => setThemeMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        <section className="border-border/80 mt-8 border-t pt-5">
          <div className="mb-4 flex items-start justify-between gap-3">
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
              className="rounded-full bg-surface-sidebar px-3 py-1.5 text-[11px] text-text-muted hover:bg-surface-hover"
              onClick={onShortcutReset}
            >
              Reset defaults
            </button>
          </div>

          <div className="space-y-1">
            {shortcutActions.map((action) => (
              <div
                key={action}
                className="flex items-center justify-between gap-3 rounded-[8px] px-2 py-2 hover:bg-surface-sidebar"
              >
                <div>
                  <p className="text-[12px] font-medium text-text-primary">
                    {shortcutLabels[action]}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Default {defaultShortcuts[action]}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="min-w-24 rounded-full bg-surface-panel px-3 py-1 text-center text-[11px] text-text-primary">
                    {shortcuts[action]}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full bg-surface-sidebar px-3 py-1.5 text-[11px] text-text-muted hover:bg-surface-hover",
                      recordingAction === action &&
                        "bg-surface-active text-text-primary",
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

        <section className="border-border/80 mt-8 border-t pt-5">
          <p className="mb-3 text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Application
          </p>
          <div className="grid gap-y-2 text-[12px] sm:grid-cols-[140px_1fr] sm:items-center">
            <p className="text-text-muted">Version</p>
            <p className="text-text-primary">{appVersion}</p>

            <p className="text-text-muted">OS</p>
            <p className="text-text-primary">{osSummary}</p>

            <p className="text-text-muted">GitHub</p>
            <p className="text-text-muted">
              <a
                className="text-text-primary underline underline-offset-3"
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                {githubUrl}
              </a>
            </p>

            <p className="text-text-muted">About</p>
            <p className="text-text-primary">{aboutLabel}</p>
          </div>
        </section>

        <section className="border-border/80 mt-8 border-t pt-5">
          <p className="mb-3 text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Vault management
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full bg-surface-sidebar px-4 text-left text-[12px] text-text-muted hover:bg-surface-hover"
              onClick={onCloseCurrentVault}
            >
              <HIcon icon={ShutDownIcon} size={16} />
              Close current vault
            </button>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full bg-surface-sidebar px-4 text-left text-[12px] text-text-muted hover:bg-surface-hover"
              onClick={onGoToOnboard}
            >
              <HIcon icon={Add01Icon} size={16} />
              Open or create another vault
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

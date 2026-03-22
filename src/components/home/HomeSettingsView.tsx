import { Add01Icon, ShutDownIcon } from "@hugeicons/core-free-icons";

import { HIcon } from "@/components/ui/hicon";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/components/home/types";

type HomeSettingsViewProps = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  onCloseCurrentVault: () => void;
  onGoToOnboard: () => void;
};

const themeModes: ThemeMode[] = ["light", "dark"];

export function HomeSettingsView({
  themeMode,
  setThemeMode,
  onCloseCurrentVault,
  onGoToOnboard,
}: HomeSettingsViewProps) {
  return (
    <div className="flex flex-1 items-start justify-center overflow-auto p-6">
      <div className="border-border w-full max-w-3xl space-y-3 rounded-[6px] border bg-surface-sidebar p-4">
        <div>
          <p className="text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Settings
          </p>
          <h2 className="text-[18px] font-semibold text-text-primary">
            Vault management
          </h2>
          <p className="text-[12px] text-text-muted">
            Close this vault or switch to another one from onboarding.
          </p>
        </div>

        <div className="border-border rounded-[6px] border bg-surface-panel p-3">
          <p className="mb-2 text-[12px] font-medium text-text-primary">
            Appearance
          </p>
          <div className="flex items-center gap-2">
            {themeModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "border-border h-9 rounded-[6px] border px-3 text-[12px] capitalize transition-colors",
                  themeMode === mode
                    ? "bg-surface-active text-text-primary"
                    : "text-text-muted hover:bg-surface-hover",
                )}
                onClick={() => setThemeMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="border-border flex h-10 items-center gap-2 rounded-[5px] border px-3 text-left text-[12px] text-text-muted hover:bg-surface-hover"
            onClick={onCloseCurrentVault}
          >
            <HIcon icon={ShutDownIcon} size={16} />
            Close current vault
          </button>
          <button
            type="button"
            className="border-border flex h-10 items-center gap-2 rounded-[5px] border px-3 text-left text-[12px] text-text-muted hover:bg-surface-hover"
            onClick={onGoToOnboard}
          >
            <HIcon icon={Add01Icon} size={16} />
            Open or create another vault
          </button>
        </div>
      </div>
    </div>
  );
}

import { invoke } from "@tauri-apps/api/core";
import {
  Cancel01Icon,
  MinusSignIcon,
  SquareIcon,
} from "@hugeicons/core-free-icons";
import { HIcon } from "@/components/ui/hicon";
import { cn } from "@/lib/utils";

type TitlebarProps = {
  title: string;
  className?: string;
  compact?: boolean;
};

export function Titlebar({ title, className, compact = false }: TitlebarProps) {
  const onAction = async (action: "min" | "max" | "close") => {
    await invoke("handle_window_action", { action });
  };

  return (
    <header
      className={cn(
        "flex h-9 items-center border-b border-border bg-surface-sidebar text-[12px] text-text-muted",
        compact && "h-8",
        className,
      )}
    >
      <div className="w-14" />
      <div
        data-tauri-drag-region
        className="flex h-full flex-1 items-center justify-center px-3 tracking-[0.02em]"
      >
        <span className="truncate text-[11px] font-medium text-(--text-primary)/85">
          {title}
        </span>
      </div>
      <div className="flex h-full items-stretch">
        <button
          type="button"
          aria-label="Minimize"
          className="titlebar-action"
          onClick={() => onAction("min")}
        >
          <HIcon icon={MinusSignIcon} size={14} />
        </button>
        <button
          type="button"
          aria-label="Maximize"
          className="titlebar-action"
          onClick={() => onAction("max")}
        >
          <HIcon icon={SquareIcon} size={14} />
        </button>
        <button
          type="button"
          aria-label="Close"
          className="titlebar-action titlebar-action-close"
          onClick={() => onAction("close")}
        >
          <HIcon icon={Cancel01Icon} size={14} />
        </button>
      </div>
    </header>
  );
}

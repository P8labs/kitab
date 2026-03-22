import { invoke } from "@tauri-apps/api/core";
import {
  RiCheckboxBlankLine,
  RiCloseLine,
  RiSubtractLine,
} from "@remixicon/react";
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
        "flex h-9 items-center border-b border-border bg-[var(--surface-sidebar)] text-[12px] text-[var(--text-muted)]",
        compact && "h-8",
        className,
      )}
    >
      <div className="w-14" />
      <div
        data-tauri-drag-region
        className="flex h-full flex-1 items-center justify-center px-3 tracking-[0.02em]"
      >
        <span className="truncate text-[11px] font-medium text-[var(--text-primary)]/85">
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
          <RiSubtractLine className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Maximize"
          className="titlebar-action"
          onClick={() => onAction("max")}
        >
          <RiCheckboxBlankLine className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Close"
          className="titlebar-action titlebar-action-close"
          onClick={() => onAction("close")}
        >
          <RiCloseLine className="size-3.5" />
        </button>
      </div>
    </header>
  );
}

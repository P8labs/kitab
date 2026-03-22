import type { BottomTab } from "@/components/home/types";

type HomeBottomContentProps = {
  activeFile: string | null;
  bottomTab: BottomTab;
  headings: Array<{ level: number; text: string }>;
  backlinks: string[];
  currentContent: string;
};

export function HomeBottomContent({
  activeFile,
  bottomTab,
  headings,
  backlinks,
  currentContent,
}: HomeBottomContentProps) {
  if (!activeFile) {
    return (
      <p className="text-[12px] text-text-muted">
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
            className="truncate rounded-[4px] px-1.5 py-1 text-[12px] text-text-muted hover:bg-surface-hover"
            style={{ paddingLeft: 6 + (heading.level - 1) * 10 }}
          >
            {heading.text}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-[12px] text-text-muted">No headings</p>
    );
  }

  if (bottomTab === "backlinks") {
    return backlinks.length ? (
      <div className="space-y-0.5">
        {backlinks.map((link) => (
          <div
            key={link}
            className="truncate rounded-[4px] px-1.5 py-1 text-[12px] text-text-muted hover:bg-surface-hover"
          >
            {link}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-[12px] text-text-muted">No backlinks</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 text-[12px] text-text-muted">
      <div className="rounded-[4px] bg-surface-hover px-2 py-1.5">
        <p>Words</p>
        <p className="mt-0.5 text-[13px] text-text-primary">
          {currentContent.trim().split(/\s+/).filter(Boolean).length}
        </p>
      </div>
      <div className="rounded-[4px] bg-surface-hover px-2 py-1.5">
        <p>Characters</p>
        <p className="mt-0.5 text-[13px] text-text-primary">
          {currentContent.length}
        </p>
      </div>
      <div className="rounded-[4px] bg-surface-hover px-2 py-1.5">
        <p>Lines</p>
        <p className="mt-0.5 text-[13px] text-text-primary">
          {currentContent.split("\n").length}
        </p>
      </div>
    </div>
  );
}

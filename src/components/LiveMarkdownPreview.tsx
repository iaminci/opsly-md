"use client";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { HOME_MARKDOWN_PREVIEW } from "@/lib/sample-document";
import { cn } from "@/lib/utils";

export function LiveMarkdownPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-base border-2 border-border bg-card shadow-shadow",
        className
      )}
    >
      <div className="flex h-8 items-center gap-2 border-b-2 border-border bg-secondary-background px-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full border border-border bg-muted/40" />
          <span className="size-2.5 rounded-full border border-border bg-muted/40" />
          <span className="size-2.5 rounded-full border border-border bg-muted/40" />
        </div>
        <span className="ml-2 font-heading text-[10px] font-medium uppercase tracking-wider text-muted">
          Live Markdown Preview
        </span>
      </div>
      <div className="relative aspect-[16/9] min-h-[220px] overflow-hidden bg-background">
        <div className="h-full overflow-hidden px-4 py-3 sm:px-5 sm:py-4">
          <MarkdownRenderer content={HOME_MARKDOWN_PREVIEW} />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background via-background/80 to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}

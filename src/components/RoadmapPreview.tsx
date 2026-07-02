"use client";

import { ChevronRight, FileText, Layers, Search } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { HeaderLogo } from "@/components/HeaderLogo";
import { getRoadmapMarkdown } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

export function RoadmapPreview({ className }: { className?: string }) {
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
        <HeaderLogo className="ml-2 h-4 w-auto opacity-80" />
      </div>

      <div className="flex aspect-[16/9] min-h-[220px]">
        <aside
          className="flex w-[140px] shrink-0 flex-col border-r-2 border-border bg-sidebar text-sidebar-foreground"
        >
          <div className="border-b-2 border-border px-2.5 py-2">
            <div className="flex items-center gap-1.5 rounded-base border-2 border-border bg-background px-2 py-1 text-[10px] text-muted">
              <Search className="size-3 shrink-0" />
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-hidden p-2 text-[10px]">
            <div>
              <p className="mb-1 px-1 font-heading text-[9px] uppercase tracking-wider text-muted">
                Vault
              </p>
              <div className="space-y-0.5">
                {["Inbox", "Projects", "Areas", "Resources", "Archive"].map(
                  (name, i) => (
                    <div
                      key={name}
                      className={cn(
                        "flex items-center gap-1 rounded-base px-1.5 py-0.5",
                        i === 1 &&
                          "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      )}
                    >
                      <ChevronRight className="size-2.5 shrink-0 opacity-60" />
                      <Layers className="size-2.5 shrink-0 text-primary" />
                      <span className="truncate">{name}</span>
                    </div>
                  )
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 px-1 font-heading text-[9px] uppercase tracking-wider text-muted">
                Notes
              </p>
              <div className="space-y-0.5">
                {[
                  { title: "Roadmap", active: true },
                  { title: "MCP Architecture", active: false },
                  { title: "Weekly Review", active: false },
                ].map(({ title, active }) => (
                  <div
                    key={title}
                    className={cn(
                      "flex items-center gap-1 rounded-base px-1.5 py-0.5",
                      active &&
                        "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    )}
                  >
                    <FileText className="size-2.5 shrink-0 text-primary" />
                    <span className="truncate">{title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="relative min-w-0 flex-1 overflow-hidden bg-background">
          <div className="h-full overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
            <div
              className={cn(
                "[&_.prose]:max-w-none",
                "[&_.prose_h1]:!mb-4 [&_.prose_h1]:!mt-0 [&_.prose_h1]:!text-lg [&_.prose_h1]:!leading-tight",
                "[&_.prose_h2]:!mb-3 [&_.prose_h2]:!mt-6 [&_.prose_h2]:!text-sm [&_.prose_h2]:!leading-snug [&_.prose_h2]:first:!mt-0",
                "[&_.prose_p]:!my-2 [&_.prose_p]:!text-[11px] [&_.prose_p]:!leading-relaxed",
                "[&_.prose_ul]:!my-2 [&_.prose_ul]:!text-[11px] [&_.prose_ul]:!leading-relaxed",
                "[&_.prose_li]:!my-0.5 [&_.prose_li]:!text-[11px]",
                "[&_.prose_input]:!size-3"
              )}
            >
              <MarkdownRenderer content={getRoadmapMarkdown()} />
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background via-background/80 to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

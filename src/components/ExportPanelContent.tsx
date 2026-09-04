"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { feedbackPanelMaxHeightClassName } from "@/components/Feedback";
import { cn } from "@/lib/utils";

export type ExportMode = "plain" | "encrypted";

const exportActionButtonClassName = cn(
  "h-9 w-full min-w-0 justify-center rounded-md border-2 border-border text-primary shadow-none hover:border-border hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0 hover:translate-y-0"
);

export interface ExportPanelContentProps {
  workspaces: { id: string; name: string }[];
  selectedIds: Set<string>;
  onToggleWorkspace: (id: string) => void;
  onToggleSelectAll: () => void;
  onExport: (mode: ExportMode) => void;
  onBack: () => void;
}

function ExportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <h3 className="text-xs font-heading uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ExportPanelContent({
  workspaces,
  selectedIds,
  onToggleWorkspace,
  onToggleSelectAll,
  onExport,
  onBack,
}: ExportPanelContentProps) {
  const exportCount = selectedIds.size;

  return (
    <div className={cn("native-scrollbar overflow-y-auto", feedbackPanelMaxHeightClassName)}>
      <div className="flex flex-col gap-5 px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          Back to settings
        </button>
        <div className="border-t border-border/50" aria-hidden />

        <ExportSection title="Workspaces">
          <div className="overflow-hidden rounded-md border-2 border-border">
            <div className="bg-sidebar-accent/50 p-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent">
                <Checkbox
                  checked={
                    workspaces.length > 0 && selectedIds.size === workspaces.length
                  }
                  onCheckedChange={onToggleSelectAll}
                />
                <span className="text-sm font-medium">Select all</span>
              </label>
            </div>
            <div className="max-h-[min(16rem,40vh)] overflow-y-auto border-t-2 border-border p-1 native-scrollbar">
              <div className="flex flex-col gap-1">
                {workspaces.map((ws) => (
                  <label
                    key={ws.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent"
                  >
                    <Checkbox
                      checked={selectedIds.has(ws.id)}
                      onCheckedChange={() => onToggleWorkspace(ws.id)}
                    />
                    <span className="truncate text-sm">{ws.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </ExportSection>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={exportActionButtonClassName}
            onClick={() => onExport("plain")}
            disabled={exportCount === 0}
          >
            Without Encrypted
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={exportActionButtonClassName}
            onClick={() => onExport("encrypted")}
            disabled={exportCount === 0}
          >
            Encrypted
          </Button>
        </div>
      </div>
    </div>
  );
}

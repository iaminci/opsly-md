"use client";

import { useEffect, useMemo, useState } from "react";
import type { Folder } from "@/types/workspace";
import {
  workspaceNeutralChipClassName,
  workspaceSwitcherDropdownContentClassName,
} from "@/components/WorkspaceSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useWorkspaceTree } from "@/context/WorkspaceTreeContext";

export function folderPathLabel(folder: Folder, allInWorkspace: Folder[]): string {
  const byId = new Map(allInWorkspace.map((f) => [f.id, f]));
  const parts: string[] = [];
  let f: Folder | undefined = folder;
  const seen = new Set<string>();
  while (f && !seen.has(f.id)) {
    seen.add(f.id);
    parts.unshift(f.name);
    f = f.parentFolderId ? byId.get(f.parentFolderId) : undefined;
  }
  return parts.join(" / ");
}

type InlineLocationSelectorsProps = {
  idPrefix: string;
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: (v: string) => void;
  selectedFolderId: string | null;
  setSelectedFolderId: (v: string | null) => void;
  hideWorkspaceSelector?: boolean;
  /** Flat bordered controls matching Settings modal actions (no hard shadow). */
  variant?: "workspace" | "settings";
  /** Smaller labels and triggers (h-8, text-xs). */
  compact?: boolean;
  /** Render workspace/folder as siblings for parent grid layouts. */
  layout?: "grid" | "split";
};

const settingsSelectTriggerClassName =
  "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border-2 border-border bg-background px-3 text-left text-sm font-medium text-foreground shadow-none transition-colors hover:border-border hover:bg-sidebar-accent hover:translate-x-0 hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const compactSelectTriggerClassName =
  "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border-2 border-border bg-background px-3 text-left text-sm font-medium text-foreground shadow-none transition-colors hover:border-border hover:bg-sidebar-accent hover:translate-x-0 hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function InlineLocationSelectors({
  idPrefix,
  selectedWorkspaceId,
  setSelectedWorkspaceId,
  selectedFolderId,
  setSelectedFolderId,
  hideWorkspaceSelector = false,
  variant = "workspace",
  compact = false,
  layout = "grid",
}: InlineLocationSelectorsProps) {
  const { sortedWorkspaces, getFoldersInWorkspace } = useWorkspaceTree();
  const [openMenu, setOpenMenu] = useState<"workspace" | "folder" | null>(null);

  const folders = useMemo(
    () => getFoldersInWorkspace(selectedWorkspaceId),
    [getFoldersInWorkspace, selectedWorkspaceId]
  );

  useEffect(() => {
    if (sortedWorkspaces.length === 0) return;
    if (sortedWorkspaces.some((w) => w.id === selectedWorkspaceId)) return;
    setSelectedWorkspaceId(sortedWorkspaces[0]!.id);
    setSelectedFolderId(null);
  }, [
    sortedWorkspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    setSelectedFolderId,
  ]);

  useEffect(() => {
    if (selectedFolderId === null) return;
    if (folders.some((f) => f.id === selectedFolderId)) return;
    setSelectedFolderId(null);
  }, [selectedFolderId, folders, setSelectedFolderId]);

  const folderOptions = useMemo(
    () =>
      [...folders]
        .map((f) => ({
          folder: f,
          label: folderPathLabel(f, folders),
        }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        ),
    [folders]
  );

  const workspaceTriggerLabel = useMemo(() => {
    if (!sortedWorkspaces.length) return "…";
    return (
      sortedWorkspaces.find((w) => w.id === selectedWorkspaceId)?.name ?? "…"
    );
  }, [sortedWorkspaces, selectedWorkspaceId]);

  const folderTriggerLabel = useMemo(() => {
    if (selectedFolderId === null) return "None (workspace root)";
    return (
      folderOptions.find((x) => x.folder.id === selectedFolderId)?.label ??
      "None (workspace root)"
    );
  }, [selectedFolderId, folderOptions]);

  const triggerClassName =
    variant === "settings"
      ? compact
        ? compactSelectTriggerClassName
        : settingsSelectTriggerClassName
      : cn(
          workspaceNeutralChipClassName,
          "flex w-full min-w-0 items-center gap-2 px-3 text-left",
          compact && "h-9 gap-2 px-3 text-sm"
        );

  const labelClassName = "block text-sm font-medium text-foreground";

  const fieldGapClassName = "gap-1";

  const chevronClassName = "size-4 shrink-0";

  const workspaceField = (
      <div className={cn("flex min-w-0 flex-col", fieldGapClassName)}>
        <label
          htmlFor={`${idPrefix}-workspace`}
          className={labelClassName}
        >
          Workspace
        </label>
        <DropdownMenu
          modal={false}
          open={openMenu === "workspace"}
          onOpenChange={(open) => setOpenMenu(open ? "workspace" : null)}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              id={`${idPrefix}-workspace`}
              className={triggerClassName}
            >
              <span className="min-w-0 flex-1 truncate">{workspaceTriggerLabel}</span>
              <ChevronDown className={chevronClassName} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className={workspaceSwitcherDropdownContentClassName}
          >
            <div className="no-scrollbar max-h-[min(50vh,16rem)] w-full overflow-y-auto overflow-x-hidden">
              <div className="p-1">
                {sortedWorkspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => {
                      setSelectedWorkspaceId(ws.id);
                      setSelectedFolderId(null);
                      setOpenMenu(null);
                    }}
                    className={cn(
                      "cursor-pointer",
                      selectedWorkspaceId === ws.id &&
                        "bg-sidebar-accent font-semibold text-primary"
                    )}
                  >
                    <span className="truncate">{ws.name}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
  );

  const folderField = (
      <div className={cn("flex min-w-0 flex-col", fieldGapClassName)}>
        <label
          htmlFor={`${idPrefix}-folder`}
          className={labelClassName}
        >
          Folder
        </label>
        <DropdownMenu
          modal={false}
          open={openMenu === "folder"}
          onOpenChange={(open) => setOpenMenu(open ? "folder" : null)}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              id={`${idPrefix}-folder`}
              className={triggerClassName}
            >
              <span className="min-w-0 flex-1 truncate">{folderTriggerLabel}</span>
              <ChevronDown className={chevronClassName} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className={workspaceSwitcherDropdownContentClassName}
          >
            <div className="no-scrollbar max-h-[min(50vh,16rem)] w-full overflow-y-auto overflow-x-hidden">
              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedFolderId(null);
                    setOpenMenu(null);
                  }}
                  className={cn(
                    "cursor-pointer",
                    selectedFolderId === null &&
                      "bg-sidebar-accent font-semibold text-primary"
                  )}
                >
                  <span className="truncate">None (workspace root)</span>
                </DropdownMenuItem>
                {folderOptions.map(({ folder, label }) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setOpenMenu(null);
                    }}
                    className={cn(
                      "cursor-pointer",
                      selectedFolderId === folder.id &&
                        "bg-sidebar-accent font-semibold text-primary"
                    )}
                  >
                    <span className="truncate">{label}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
  );

  if (layout === "split") {
    return (
      <>
        {!hideWorkspaceSelector ? workspaceField : null}
        {folderField}
      </>
    );
  }

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 sm:items-end",
        hideWorkspaceSelector ? "sm:grid-cols-1" : "sm:grid-cols-2",
        compact ? "gap-2" : "gap-3"
      )}
    >
      {!hideWorkspaceSelector ? workspaceField : null}
      {folderField}
    </div>
  );
}

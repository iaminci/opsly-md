"use client";

import type { Workspace } from "@/types/workspace";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  FilePlus,
  FolderPlus,
  Pencil,
  Plus,
  Upload,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { InlineTreeCreateRow } from "@/components/InlineTreeCreateRow";
import type { PendingTreeCreate, PendingTreeRename } from "@/components/WorkspaceTree";
import { TREE_DRAG_TARGET_PILL } from "@/components/WorkspaceTree";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Native scrollbar aligned with TOC / `ScrollArea` thumb (Radix scroll area breaks inside menus). */
const workspaceSwitcherScrollbarClassName = cn(
  "overflow-y-auto overflow-x-hidden native-scrollbar-transparent-track"
);

const workspaceSwitcherDropdownMaxHeightClassName =
  "max-h-[min(50vh,16rem)]";

export const workspaceTabBaseClassName =
  "!h-9 !min-h-9 !rounded-[5px] !border-2 !border-border !font-heading !font-bold !shadow-shadow !outline-0 transition-[transform,box-shadow] hover:!translate-x-boxShadowX hover:!translate-y-boxShadowY hover:!shadow-none hover:!outline-0 focus-visible:!outline-0 focus-visible:!shadow-shadow";

const workspaceControlChromeClassName =
  "rounded-md border-2 border-border bg-background shadow-none transition-colors hover:border-border hover:bg-sidebar-accent hover:translate-x-0 hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export const workspaceDropdownTriggerClassName = cn(
  "flex h-9 min-h-9 w-full min-w-0 items-center gap-2 px-3 text-left text-sm font-medium text-foreground",
  workspaceControlChromeClassName
);

export const workspaceIconActionClassName = cn(
  "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center p-0 text-muted-foreground hover:text-primary",
  workspaceControlChromeClassName
);

/** (+) “New workspace” and single-workspace ⋯ — same chrome as tabs, neutral surface. */
export const workspaceNeutralChipClassName = cn(
  workspaceTabBaseClassName,
  "!bg-background !text-foreground hover:!bg-background hover:!text-foreground focus-visible:!bg-background focus-visible:!text-foreground"
);

/** Single-workspace view: wide name + ⋯ as two matching “cards” (white fill, black border, hard shadow). */
export const workspacePairTabClassName = cn(
  workspaceTabBaseClassName,
  "!bg-background !text-foreground focus-visible:!bg-primary"
);

/** Workspace switcher dropdown panel (inline create/rename lives here). */
export const WORKSPACE_SWITCHER_DROPDOWN_SELECTOR =
  '[data-workspace-switcher-dropdown="true"]';

/** List panel under the workspace switcher trigger — width set from the action row. */
export const workspaceSwitcherDropdownContentClassName =
  "w-full min-w-0 max-w-none rounded-md border-2 border-border bg-popover p-0 font-heading text-popover-foreground shadow-none";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  selectedId: string | null;
  onSelect: (workspaceId: string | null) => void;
  onAddWorkspace?: () => void;
  onCreateFile: () => void;
  onUploadFile: () => void;
  onCreateFolder?: () => void;
  onRenameWorkspace?: (
    id: string,
    name: string,
    inlineTarget?: "tree" | "switcher-dropdown"
  ) => void;
  /** True while the selected workspace root is the drag drop target (single-workspace view). */
  dragTargetActive?: boolean;
  pendingTreeCreate?: PendingTreeCreate | null;
  onPendingTreeCreateSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeCreateCancel?: () => void;
  pendingTreeRename?: PendingTreeRename | null;
  onPendingTreeRenameSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeRenameCancel?: () => void;
}

export function WorkspaceSwitcher({
  workspaces,
  selectedId,
  onSelect,
  onAddWorkspace,
  onCreateFile,
  onUploadFile,
  onCreateFolder,
  onRenameWorkspace,
  dragTargetActive = false,
  pendingTreeCreate = null,
  onPendingTreeCreateSubmit,
  onPendingTreeCreateCancel,
  pendingTreeRename = null,
  onPendingTreeRenameSubmit,
  onPendingTreeRenameCancel,
}: WorkspaceSwitcherProps) {
  const skipCloseAutoFocusRef = useRef(false);
  const menuRowRef = useRef<HTMLUListElement>(null);
  const [switcherMenuOpen, setSwitcherMenuOpen] = useState(false);
  const [switcherDropdownWidth, setSwitcherDropdownWidth] = useState<number>();

  const updateSwitcherDropdownWidth = useCallback(() => {
    const row = menuRowRef.current;
    if (!row) return;
    const items = row.querySelectorAll('[data-sidebar="menu-item"]');
    const actionItemCount = onCreateFolder ? 4 : 3;
    let width = 0;
    for (let i = 0; i < actionItemCount && i < items.length; i++) {
      if (i > 0) width += 6;
      width += (items[i] as HTMLElement).getBoundingClientRect().width;
    }
    if (width > 0) setSwitcherDropdownWidth(width);
  }, []);

  const runInlineCreateAction = useCallback((action: () => void) => {
    skipCloseAutoFocusRef.current = true;
    action();
  }, []);
  const handleDropdownCloseAutoFocus = useCallback((e: Event) => {
    if (!skipCloseAutoFocusRef.current) return;
    e.preventDefault();
    skipCloseAutoFocusRef.current = false;
  }, []);

  const selected = selectedId
    ? workspaces.find((w) => w.id === selectedId)
    : null;
  const label = selected ? selected.name : "All Workspaces";
  const showPendingWorkspaceCreate =
    pendingTreeCreate?.type === "workspace" &&
    pendingTreeCreate.inlineTarget === "switcher-dropdown";
  const hasDropdownInlineEdit =
    showPendingWorkspaceCreate ||
    (pendingTreeRename?.type === "workspace" &&
      pendingTreeRename.inlineTarget === "switcher-dropdown");
  const showCreateFolderButton = Boolean(onCreateFolder);

  useEffect(() => {
    if (hasDropdownInlineEdit) setSwitcherMenuOpen(true);
  }, [hasDropdownInlineEdit]);

  useEffect(() => {
    updateSwitcherDropdownWidth();
    const row = menuRowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(updateSwitcherDropdownWidth);
    observer.observe(row);
    return () => observer.disconnect();
  }, [updateSwitcherDropdownWidth, onCreateFolder]);

  const handleWorkspaceRename = useCallback(
    (workspaceId: string, workspaceName: string) => {
      runInlineCreateAction(() =>
        onRenameWorkspace?.(workspaceId, workspaceName, "switcher-dropdown")
      );
    },
    [onRenameWorkspace, runInlineCreateAction]
  );

  const handleNewWorkspace = useCallback(() => {
    runInlineCreateAction(() => onAddWorkspace?.());
  }, [onAddWorkspace, runInlineCreateAction]);

  const workspaceSwitcherListBody = (
    <>
      <DropdownMenuItem
        onClick={() => onSelect(null)}
        className={cn(
          "w-full",
          !selectedId && "bg-sidebar-accent font-semibold text-primary"
        )}
      >
        <span className="min-w-0 flex-1 whitespace-nowrap">All Workspaces</span>
      </DropdownMenuItem>
      {workspaces.map((ws) => {
        const isRenamingInDropdown =
          pendingTreeRename?.type === "workspace" &&
          pendingTreeRename.inlineTarget === "switcher-dropdown" &&
          pendingTreeRename.id === ws.id;

        if (
          isRenamingInDropdown &&
          onPendingTreeRenameSubmit &&
          onPendingTreeRenameCancel
        ) {
          return (
            <div
              key={ws.id}
              className="px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <InlineTreeCreateRow
                type="folder"
                showIcon={false}
                rename
                initialValue={pendingTreeRename.initialName}
                onSubmit={onPendingTreeRenameSubmit}
                onCancel={onPendingTreeRenameCancel}
              />
            </div>
          );
        }

        return (
        <DropdownMenuItem
          key={ws.id}
          onClick={() => onSelect(ws.id)}
          className={cn(
            "group/workspace-row w-full [&[data-highlighted]_button]:opacity-100",
            selectedId === ws.id &&
              "bg-sidebar-accent font-semibold text-primary"
          )}
        >
          <span className="min-w-0 flex-1 truncate whitespace-nowrap">
            {ws.name}
          </span>
          {onRenameWorkspace ? (
            <button
              type="button"
              aria-label={`Rename ${ws.name}`}
              className={cn(
                "pointer-events-auto ml-1 inline-flex size-7 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground opacity-0 transition-opacity",
                "hover:bg-sidebar-accent hover:text-primary",
                "group-hover/workspace-row:opacity-100 group-focus-within/workspace-row:opacity-100"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleWorkspaceRename(ws.id, ws.name);
              }}
            >
              <Pencil className="size-3.5 shrink-0" />
            </button>
          ) : null}
        </DropdownMenuItem>
        );
      })}
    </>
  );

  return (
    <SidebarMenu ref={menuRowRef} className="flex-row items-center gap-1.5">
      <SidebarMenuItem className="min-w-0 flex-1">
        <DropdownMenu
          open={switcherMenuOpen}
          onOpenChange={(open) => {
            if (!open && hasDropdownInlineEdit) return;
            setSwitcherMenuOpen(open);
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                workspaceDropdownTriggerClassName,
                dragTargetActive &&
                  cn(
                    "!border-[var(--tree-drag-target-border)] !bg-[var(--tree-drag-target-bg)] !text-[var(--tree-drag-target-fg)] hover:!bg-[var(--tree-drag-target-bg)]",
                    TREE_DRAG_TARGET_PILL
                  )
              )}
            >
              <span className="min-w-0 flex-1 truncate font-heading font-semibold">
                {label}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            style={
              switcherDropdownWidth
                ? { width: switcherDropdownWidth }
                : undefined
            }
            className={workspaceSwitcherDropdownContentClassName}
            onCloseAutoFocus={handleDropdownCloseAutoFocus}
            data-workspace-switcher-dropdown="true"
          >
            {onAddWorkspace ? (
              <div
                className={cn(
                  "flex w-full min-h-0 flex-col overflow-hidden",
                  workspaceSwitcherDropdownMaxHeightClassName
                )}
              >
                <div
                  className={cn(
                    "min-h-0 flex-1 pr-1",
                    workspaceSwitcherScrollbarClassName
                  )}
                >
                  <div className="p-1">{workspaceSwitcherListBody}</div>
                </div>
                <div className="shrink-0 border-t-2 border-border p-1">
                  {showPendingWorkspaceCreate &&
                  onPendingTreeCreateSubmit &&
                  onPendingTreeCreateCancel ? (
                    <div
                      className="px-0 py-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <InlineTreeCreateRow
                        type="folder"
                        showIcon={false}
                        initialValue="New Workspace"
                        onSubmit={onPendingTreeCreateSubmit}
                        onCancel={onPendingTreeCreateCancel}
                      />
                    </div>
                  ) : (
                    <DropdownMenuItem
                      onClick={handleNewWorkspace}
                      className="cursor-pointer"
                    >
                      <Plus className="size-4 shrink-0" />
                      <span className="whitespace-nowrap">New Workspace</span>
                    </DropdownMenuItem>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  workspaceSwitcherDropdownMaxHeightClassName,
                  "w-full pr-1",
                  workspaceSwitcherScrollbarClassName
                )}
              >
                <div className="p-1">{workspaceSwitcherListBody}</div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {showCreateFolderButton ? (
        <SidebarMenuItem className="w-auto shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={workspaceIconActionClassName}
                aria-label="Create folder"
                onClick={onCreateFolder}
              >
                <FolderPlus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Create folder</TooltipContent>
          </Tooltip>
        </SidebarMenuItem>
      ) : null}
      <SidebarMenuItem className="w-auto shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={workspaceIconActionClassName}
              aria-label="Upload file"
              onClick={onUploadFile}
            >
              <Upload className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Upload file</TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
      <SidebarMenuItem className="w-auto shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={workspaceIconActionClassName}
              aria-label="Create file"
              onClick={onCreateFile}
            >
              <FilePlus className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Create file</TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

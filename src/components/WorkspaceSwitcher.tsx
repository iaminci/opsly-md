"use client";

import type { Workspace } from "@/types/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  FileBraces,
  FilePlus,
  FolderIcon,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { TREE_DRAG_TARGET_PILL } from "@/components/WorkspaceTree";
import { Button } from "./ui/button";
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

const workspaceTabAllClassName = cn(
  workspaceTabBaseClassName,
  "!bg-background !text-foreground hover:!bg-background hover:!text-foreground"
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

/** List panel under the workspace switcher trigger (and inline Create Markdown). */
export const workspaceSwitcherDropdownContentClassName =
  "w-[var(--radix-popper-anchor-width)] min-w-0 max-w-[var(--radix-popper-anchor-width)] rounded-[5px] border-2 border-sidebar-border bg-popover p-0 font-heading text-popover-foreground shadow-md";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  selectedId: string | null;
  onSelect: (workspaceId: string | null) => void;
  onAddWorkspace?: () => void;
  /**
   * In “All Workspaces” view, the (+) chip menu: Create File / Upload File.
   * “New Workspace” remains in the workspace dropdown.
   */
  onQuickCreateMarkdown?: () => void;
  onQuickUploadFile?: () => void;
  /** When a workspace is selected, actions for that workspace (⋯ menu). */
  onWorkspaceMenuOpenChange?: (open: boolean) => void;
  onAddFolder?: (workspaceId: string, parentFolderId: string | null) => void;
  onUploadFile?: (workspaceId: string, folderId: string | null) => void;
  onCreateFile?: (workspaceId: string, folderId: string | null) => void;
  onRenameWorkspace?: (id: string, name: string) => void;
  /** True while the selected workspace root is the drag drop target (single-workspace view). */
  dragTargetActive?: boolean;
}

export function WorkspaceSwitcher({
  workspaces,
  selectedId,
  onSelect,
  onAddWorkspace,
  onQuickCreateMarkdown,
  onQuickUploadFile,
  onWorkspaceMenuOpenChange,
  onAddFolder,
  onUploadFile,
  onCreateFile,
  onRenameWorkspace,
  dragTargetActive = false,
}: WorkspaceSwitcherProps) {
  const selected = selectedId
    ? workspaces.find((w) => w.id === selectedId)
    : null;
  const label = selected ? selected.name : "All Workspaces";
  const isAllWorkspaces = selectedId === null;
  const workspaceActionsAvailable =
    Boolean(selected) &&
    onAddFolder &&
    onUploadFile &&
    onCreateFile &&
    onRenameWorkspace;

  const workspaceSwitcherListBody = (
    <>
      <DropdownMenuItem
        onClick={() => onSelect(null)}
        className={cn(
          !selectedId &&
            "bg-sidebar-accent font-semibold text-primary"
        )}
      >
        <span className="truncate">All Workspaces</span>
      </DropdownMenuItem>
      {workspaces.map((ws) => (
        <DropdownMenuItem
          key={ws.id}
          onClick={() => onSelect(ws.id)}
          className={cn(
            selectedId === ws.id &&
              "bg-sidebar-accent font-semibold text-primary"
          )}
        >
          <span className="truncate">{ws.name}</span>
        </DropdownMenuItem>
      ))}
    </>
  );

  return (
    <SidebarMenu
      className={cn("flex-row", isAllWorkspaces ? "gap-2" : "gap-2.5")}
    >
      <SidebarMenuItem className="min-w-0 flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isAllWorkspaces ? (
              <button
                type="button"
                className={cn(
                  workspaceTabAllClassName,
                  "flex w-full min-w-0 items-center gap-2 px-3 text-left"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <ChevronDown className="ml-auto size-4 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                className={cn(
                  workspacePairTabClassName,
                  "flex w-full min-w-0 items-center gap-2 px-3 text-left",
                  dragTargetActive &&
                    cn(
                      "!border-2 !border-[var(--tree-drag-target-border)] !shadow-none hover:!translate-x-0 hover:!translate-y-0",
                      TREE_DRAG_TARGET_PILL
                    )
                )}
              >
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <ChevronDown className="size-4 shrink-0" />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className={workspaceSwitcherDropdownContentClassName}
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
                  <DropdownMenuItem
                    onClick={() => onAddWorkspace()}
                    className="cursor-pointer"
                  >
                    <Plus className="size-4 shrink-0" />
                    <span className="truncate">New Workspace</span>
                  </DropdownMenuItem>
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
      {onQuickCreateMarkdown && onQuickUploadFile && selectedId === null ? (
        <SidebarMenuItem className="w-auto shrink-0">
          <DropdownMenu
            onOpenChange={(open) => {
              onWorkspaceMenuOpenChange?.(open);
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="Create or upload file"
                    className={cn(
                      workspaceNeutralChipClassName,
                      "inline-flex w-9 min-w-9 shrink-0 items-center justify-center px-0"
                    )}
                  >
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                Create or upload file
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="min-w-0 w-max whitespace-nowrap rounded-[5px] border-2 border-sidebar-border bg-popover p-1 font-heading text-popover-foreground shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={onQuickCreateMarkdown}>
                <FilePlus className="mr-2 size-4" />
                Create File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onQuickUploadFile}>
                <FileBraces className="mr-2 size-4" />
                Upload File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      ) : null}
      {workspaceActionsAvailable && selected && selectedId ? (
        <SidebarMenuItem className="w-auto shrink-0">
          <DropdownMenu
            onOpenChange={(open) => {
              onWorkspaceMenuOpenChange?.(open);
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="Workspace actions"
                    className={cn(
                      workspaceNeutralChipClassName,
                      "inline-flex w-9 min-w-9 shrink-0 items-center justify-center px-0"
                    )}
                  >
                    <MoreHorizontal className="size-4 shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                Workspace actions
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="min-w-0 w-max whitespace-nowrap rounded-[5px] border-2 border-sidebar-border bg-popover p-1 font-heading text-popover-foreground shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() => onCreateFile(selectedId, null)}
              >
                <FilePlus className="mr-2 size-4" />
                Create File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUploadFile(selectedId, null)}
              >
                <FileBraces className="mr-2 size-4" />
                Upload File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAddFolder(selectedId, null)}
              >
                <FolderIcon className="mr-2 size-4" />
                Create Folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRenameWorkspace(selectedId, selected.name)}
              >
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      ) : null}
    </SidebarMenu>
  );
}

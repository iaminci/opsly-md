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
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const workspaceTabBaseClassName =
  "!h-9 !min-h-9 !rounded-[5px] !border-2 !border-border !font-heading !font-bold !shadow-shadow !outline-0 transition-[transform,box-shadow] hover:!translate-x-[2px] hover:!translate-y-[2px] hover:!shadow-shadow hover:!outline-0 focus-visible:!outline-0 focus-visible:!shadow-shadow";

const workspaceTabAllClassName = cn(
  workspaceTabBaseClassName,
  "!bg-primary/90 !text-background hover:!bg-primary/90 hover:!text-primary-foreground focus-visible:!bg-primary/90"
);

/** (+) “New workspace” and single-workspace ⋯ — same chrome as tabs, neutral surface. */
const workspaceNeutralChipClassName = cn(
  workspaceTabBaseClassName,
  "!bg-background !text-foreground hover:!bg-background hover:!text-foreground focus-visible:!bg-background focus-visible:!text-foreground"
);

/** Single-workspace view: wide name + ⋯ as two matching “cards” (white fill, black border, hard shadow). */
const workspacePairTabClassName = cn(
  workspaceTabBaseClassName,
  "!bg-primary/90 !text-background hover:!bg-primary/90 hover:!text-primary-foreground focus-visible:!bg-primary/90"
);

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  selectedId: string | null;
  onSelect: (workspaceId: string | null) => void;
  onAddWorkspace?: () => void;
  /** When a workspace is selected, actions for that workspace (⋯ menu). */
  onWorkspaceMenuOpenChange?: (open: boolean) => void;
  onAddFolder?: (workspaceId: string, parentFolderId: string | null) => void;
  onUploadFile?: (workspaceId: string, folderId: string | null) => void;
  onCreateFile?: (workspaceId: string, folderId: string | null) => void;
  onRenameWorkspace?: (id: string, name: string) => void;
}

export function WorkspaceSwitcher({
  workspaces,
  selectedId,
  onSelect,
  onAddWorkspace,
  onWorkspaceMenuOpenChange,
  onAddFolder,
  onUploadFile,
  onCreateFile,
  onRenameWorkspace,
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

  return (
    <SidebarMenu
      className={cn("flex-row", isAllWorkspaces ? "gap-2" : "gap-2.5")}
    >
      <SidebarMenuItem className="min-w-0 flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isAllWorkspaces ? (
              <SidebarMenuButton
                isActive
                className={workspaceTabAllClassName}
              >
                <span className="truncate">{label}</span>
                <ChevronDown className="ml-auto size-4 shrink-0" />
              </SidebarMenuButton>
            ) : (
              <button
                type="button"
                className={cn(
                  workspacePairTabClassName,
                  "flex w-full min-w-0 items-center gap-2 px-3 text-left"
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
            className="w-[var(--radix-popper-anchor-width)] min-w-0 max-w-[var(--radix-popper-anchor-width)] rounded-[5px] border-2 border-sidebar-border bg-background p-0 font-heading text-foreground shadow-md"
          >
            <div className="no-scrollbar max-h-[min(50vh,16rem)] w-full overflow-y-auto overflow-x-hidden">
              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => onSelect(null)}
                  className={cn(
                    !selectedId &&
                      "bg-primary/70 border-border-2 font-semibold text-background"
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
                        "bg-primary/90 font-semibold text-sidebar-accent-foreground"
                    )}
                  >
                    <span className="truncate">{ws.name}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {onAddWorkspace && selectedId === null ? (
        <SidebarMenuItem className="w-auto shrink-0">
          <Button
            variant="ghost"
            title="New workspace"
            aria-label="New workspace"
            onClick={onAddWorkspace}
            className={cn(
              workspaceNeutralChipClassName,
              "inline-flex w-9 min-w-9 shrink-0 items-center justify-center px-0"
            )}
          >
            <Plus className="size-4 shrink-0 text-primary" />
          </Button>
        </SidebarMenuItem>
      ) : null}
      {workspaceActionsAvailable && selected && selectedId ? (
        <SidebarMenuItem className="w-auto shrink-0">
          <DropdownMenu
            onOpenChange={(open) => {
              onWorkspaceMenuOpenChange?.(open);
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                title="Workspace actions"
                aria-label="Workspace actions"
                className={cn(
                  workspaceNeutralChipClassName,
                  "inline-flex w-9 min-w-9 shrink-0 items-center justify-center px-0"
                )}
              >
                <MoreHorizontal className="size-4 shrink-0 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="min-w-0 w-max whitespace-nowrap rounded-[5px] border-2 border-sidebar-border bg-background p-1 font-heading text-foreground shadow-md"
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

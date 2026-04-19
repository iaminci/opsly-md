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
  FileIcon,
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

const workspaceTabBaseClassName =
  "!h-9 !min-h-9 !rounded-[5px] !border-2 !border-border !font-heading !font-bold !shadow-shadow !outline-0 transition-[transform,box-shadow] hover:!translate-x-[2px] hover:!translate-y-[2px] hover:!shadow-shadow hover:!outline-0 focus-visible:!outline-0 focus-visible:!shadow-shadow";

const workspaceTabAllClassName = cn(
  workspaceTabBaseClassName,
  "!bg-sidebar-primary/75 !text-white hover:!bg-sidebar-primary/75 hover:!text-sidebar-primary-foreground focus-visible:!bg-sidebar-primary/75"
);

/** Single-workspace view: wide name + ⋯ as two matching “cards” (white fill, black border, hard shadow). */
const workspacePairTabClassName = cn(
  workspaceTabBaseClassName,
  "!bg-sidebar-primary/75 !text-white hover:!bg-sidebar-primary/75 hover:!text-sidebar-primary-foreground focus-visible:!bg-sidebar-primary/75"
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
  onRenameWorkspace,
}: WorkspaceSwitcherProps) {
  const selected = selectedId
    ? workspaces.find((w) => w.id === selectedId)
    : null;
  const label = selected ? selected.name : "All Workspaces";
  const isAllWorkspaces = selectedId === null;
  const workspaceActionsAvailable =
    Boolean(selected) && onAddFolder && onUploadFile && onRenameWorkspace;

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
            className="w-[var(--radix-popper-anchor-width)] min-w-0 max-w-[var(--radix-popper-anchor-width)] rounded-[5px] border-2 border-sidebar-border bg-sidebar p-0 font-heading shadow-md"
          >
            <div className="no-scrollbar max-h-[min(50vh,16rem)] w-full overflow-y-auto overflow-x-hidden">
              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => onSelect(null)}
                  className={cn(
                    !selectedId &&
                      "bg-primary/35 font-semibold text-sidebar-accent-foreground"
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
                        "bg-primary/35 font-semibold text-sidebar-accent-foreground"
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
          <button
            type="button"
            title="New workspace"
            aria-label="New workspace"
            onClick={onAddWorkspace}
            className={cn(
              workspaceTabAllClassName,
              "inline-flex w-9 min-w-9 shrink-0 items-center justify-center px-0"
            )}
          >
            <Plus className="size-4 shrink-0" />
          </button>
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
              <button
                type="button"
                title="Workspace actions"
                aria-label="Workspace actions"
                className={cn(
                  workspacePairTabClassName,
                  "inline-flex w-9 min-w-9 shrink-0 items-center justify-center px-0 hover:!bg-destructive/20 hover:!text-destructive"
                )}
              >
                <MoreHorizontal className="size-4 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="min-w-0 w-max whitespace-nowrap rounded-[5px] border-2 border-sidebar-border bg-sidebar p-1 font-heading shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() => onAddFolder(selectedId, null)}
              >
                <FolderIcon className="mr-2 size-4" />
                Add folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUploadFile(selectedId, null)}
              >
                <FileIcon className="mr-2 size-4" />
                Upload file
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

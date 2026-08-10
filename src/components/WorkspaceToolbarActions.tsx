"use client";

import { FilePlus, FolderPlus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { workspaceIconActionClassName } from "@/components/WorkspaceSwitcher";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MultiSelectToolbarInfo } from "@/components/MultiSelectToolbarInfo";

export const workspaceToolbarActionRowClassName =
  "flex w-full flex-row items-center justify-between";

interface WorkspaceToolbarActionsProps {
  onCreateFile: () => void;
  onUploadFile: () => void;
  onCreateFolder?: () => void;
  className?: string;
}

export function WorkspaceToolbarActions({
  onCreateFile,
  onUploadFile,
  onCreateFolder,
  className,
}: WorkspaceToolbarActionsProps) {
  return (
    <SidebarMenu className={cn(workspaceToolbarActionRowClassName, className)}>
      <SidebarMenuItem className="w-auto shrink-0">
        <div className="flex items-center gap-2.5">
          {onCreateFolder ? (
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
          ) : null}
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
        </div>
      </SidebarMenuItem>
      <MultiSelectToolbarInfo />
    </SidebarMenu>
  );
}

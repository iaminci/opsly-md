"use client";

import { FilePlus, FolderPlus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  workspaceDropdownTriggerClassName,
  workspaceIconActionClassName,
} from "@/components/WorkspaceSwitcher";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkspaceActionBarProps {
  label?: string;
  onCreateFile: () => void;
  onUploadFile: () => void;
  onCreateFolder: () => void;
  className?: string;
}

export function WorkspaceActionBar({
  label = "Default",
  onCreateFile,
  onUploadFile,
  onCreateFolder,
  className,
}: WorkspaceActionBarProps) {
  return (
    <SidebarMenu className={cn("flex-row items-center gap-1.5", className)}>
      <SidebarMenuItem className="min-w-0 flex-1">
        <div
          className={cn(workspaceDropdownTriggerClassName, "cursor-default")}
          aria-label={`Workspace: ${label}`}
        >
          <span className="min-w-0 flex-1 truncate font-heading font-semibold">
            {label}
          </span>
        </div>
      </SidebarMenuItem>
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

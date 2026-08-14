"use client";

import { useState } from "react";
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
import { Search, type SearchMatchNavigation } from "@/components/Search";
import type { Document } from "@/types/document";

export const workspaceToolbarActionRowClassName =
  "flex w-full flex-row items-center";

const toolbarDividerClassName =
  "h-5 w-0 shrink-0 self-center border-l-2 border-muted-foreground";

interface WorkspaceToolbarSearchProps {
  documents: Document[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (doc: Document) => void;
  matchNavigation?: SearchMatchNavigation | null;
}

interface WorkspaceToolbarActionsProps {
  onCreateFile: () => void;
  onUploadFile: () => void;
  onCreateFolder?: () => void;
  className?: string;
  search?: WorkspaceToolbarSearchProps;
}

export function WorkspaceToolbarActions({
  onCreateFile,
  onUploadFile,
  onCreateFolder,
  className,
  search,
}: WorkspaceToolbarActionsProps) {
  const [searchExpanded, setSearchExpanded] = useState(
    () => (search?.query.trim().length ?? 0) > 0
  );

  const actionButtons = (
    <>
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
    </>
  );

  return (
    <SidebarMenu className={cn(workspaceToolbarActionRowClassName, className)}>
      <SidebarMenuItem
        className={cn("w-auto shrink-0", searchExpanded && "min-w-0 flex-1")}
      >
        <div
          className={cn(
            "flex items-center gap-2.5",
            searchExpanded && "min-w-0 w-full"
          )}
        >
          {search ? (
            <Search
              variant="toolbar"
              expanded={searchExpanded}
              onExpandedChange={setSearchExpanded}
              documents={search.documents}
              query={search.query}
              onQueryChange={search.onQueryChange}
              onSelect={search.onSelect}
              matchNavigation={search.matchNavigation}
            />
          ) : null}
          {search && !searchExpanded ? (
            <div className={toolbarDividerClassName} aria-hidden />
          ) : null}
          {!search && !searchExpanded ? actionButtons : null}
        </div>
      </SidebarMenuItem>
      {search && !searchExpanded ? (
        <SidebarMenuItem className="min-w-0 flex-1">
          <div className="flex items-center justify-center gap-2.5">
            {actionButtons}
          </div>
        </SidebarMenuItem>
      ) : null}
      {!searchExpanded ? <MultiSelectToolbarInfo /> : null}
    </SidebarMenu>
  );
}

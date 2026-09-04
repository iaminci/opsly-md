"use client";

import { useState } from "react";
import {
  FilePlus,
  FolderPlus,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
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

const sidebarToolbarButtonClassName = cn(
  "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-primary shadow-none transition-colors",
  "hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
);

const toolbarDividerClassName =
  "h-5 w-0 shrink-0 self-center border-l-2 border-muted-foreground";

function CollapseAllIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
      strokeLinejoin="round"
      paintOrder="stroke fill"
      aria-hidden="true"
    >
      <path d="M9 9H4v1h5V9z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 3l1-1h7l1 1v7l-1 1h-2v2l-1 1H3l-1-1V6l1-1h2V3zm1 2h4l1 1v4h2V3H6v2zm4 1H3v7h7V6z"
      />
    </svg>
  );
}

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
  onCollapseTree?: () => void;
}

export function WorkspaceToolbarActions({
  onCreateFile,
  onUploadFile,
  onCreateFolder,
  className,
  search,
  onCollapseTree,
}: WorkspaceToolbarActionsProps) {
  const [searchExpanded, setSearchExpanded] = useState(
    () => (search?.query.trim().length ?? 0) > 0
  );

  const actionButtons = (
    <>
      {onCollapseTree ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={sidebarToolbarButtonClassName}
              aria-label="Collapse all folders and workspaces"
              onClick={onCollapseTree}
            >
              <CollapseAllIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Collapse all</TooltipContent>
        </Tooltip>
      ) : null}
      {onCreateFolder ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={sidebarToolbarButtonClassName}
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
            className={sidebarToolbarButtonClassName}
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
            className={sidebarToolbarButtonClassName}
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

"use client";

import { cn } from "@/lib/utils";
import { WorkspaceToolbarActions } from "@/components/WorkspaceToolbarActions";
import type { SearchMatchNavigation } from "@/components/Search";
import type { Document } from "@/types/document";

interface WorkspaceActionBarProps {
  onCreateFile: () => void;
  onUploadFile: () => void;
  onCreateFolder: () => void;
  className?: string;
  search?: {
    documents: Document[];
    query: string;
    onQueryChange: (query: string) => void;
    onSelect: (doc: Document) => void;
    matchNavigation?: SearchMatchNavigation | null;
  };
}

export function WorkspaceActionBar({
  onCreateFile,
  onUploadFile,
  onCreateFolder,
  className,
  search,
}: WorkspaceActionBarProps) {
  return (
    <WorkspaceToolbarActions
      className={className}
      onCreateFile={onCreateFile}
      onUploadFile={onUploadFile}
      onCreateFolder={onCreateFolder}
      search={search}
    />
  );
}

"use client";

import { cn } from "@/lib/utils";
import { WorkspaceToolbarActions } from "@/components/WorkspaceToolbarActions";

interface WorkspaceActionBarProps {
  onCreateFile: () => void;
  onUploadFile: () => void;
  onCreateFolder: () => void;
  className?: string;
}

export function WorkspaceActionBar({
  onCreateFile,
  onUploadFile,
  onCreateFolder,
  className,
}: WorkspaceActionBarProps) {
  return (
    <WorkspaceToolbarActions
      className={className}
      onCreateFile={onCreateFile}
      onUploadFile={onUploadFile}
      onCreateFolder={onCreateFolder}
    />
  );
}

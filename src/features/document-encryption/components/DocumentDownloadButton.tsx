"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { workspaceToolbarTextActionClassName } from "@/components/WorkspaceSwitcher";

export interface DocumentDownloadButtonProps {
  isEncryptedAtRest: boolean;
  isLocked: boolean;
  onDownloadPlain: () => void;
  onDownloadEncrypted: () => void;
  onExportMarkdown: () => void;
  className?: string;
}

export function DocumentDownloadButton({
  isEncryptedAtRest,
  isLocked,
  onDownloadPlain,
  onDownloadEncrypted,
  onExportMarkdown,
  className,
}: DocumentDownloadButtonProps) {
  if (!isEncryptedAtRest) {
    return (
      <button
        type="button"
        className={cn(workspaceToolbarTextActionClassName, className)}
        onClick={onDownloadPlain}
      >
        Download
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(workspaceToolbarTextActionClassName, className)}
        >
          Download
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={12}
        collisionPadding={8}
        className="min-w-[14rem]"
      >
        <DropdownMenuItem onClick={onDownloadEncrypted}>
          <div className="flex flex-col gap-0.5">
            <span>Download Encrypted (.opsly)</span>
            <span className="text-xs text-muted-foreground">
              Recommended — preserves encryption
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExportMarkdown}>
          <div className="flex flex-col gap-0.5">
            <span>Export Markdown (.md)</span>
            <span className="text-xs text-muted-foreground">
              {isLocked
                ? "Unlock the document first"
                : "Decrypted plain-text copy"}
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

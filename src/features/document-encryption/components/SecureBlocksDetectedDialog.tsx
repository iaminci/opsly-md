"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  workspaceIconActionClassName,
  workspaceToolbarTextActionClassName,
} from "@/components/WorkspaceSwitcher";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SecureBlocksDetectedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEncrypt: () => void;
  onSaveWithoutEncryption: () => void;
  onCancel: () => void;
}

export function SecureBlocksDetectedDialog({
  open,
  onOpenChange,
  onEncrypt,
  onSaveWithoutEncryption,
  onCancel,
}: SecureBlocksDetectedDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <button
          type="button"
          className={cn("absolute right-4 top-4", workspaceIconActionClassName)}
          onClick={onCancel}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <AlertDialogHeader>
          <AlertDialogTitle className="pr-10">Secure blocks detected</AlertDialogTitle>
          <AlertDialogDescription>
            This document contains secure blocks.
            <br />
            <br />
            Without encryption, their contents will be stored as plain text in
            your browser.
            <br />
            <br />
            Would you like to encrypt this document?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-end">
          <button
            type="button"
            className={workspaceToolbarTextActionClassName}
            onClick={onSaveWithoutEncryption}
          >
            Without Encrypt
          </button>
          <button
            type="button"
            className={workspaceToolbarTextActionClassName}
            onClick={onEncrypt}
          >
            Encrypt
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

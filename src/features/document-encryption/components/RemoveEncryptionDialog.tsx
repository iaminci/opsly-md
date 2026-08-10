"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface RemoveEncryptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  submitting?: boolean;
}

export function RemoveEncryptionDialog({
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
}: RemoveEncryptionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove encryption?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently decrypt the document and store it as plain
            Markdown. The encrypted protection will be removed and cannot be
            undone without encrypting again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "border-2 text-destructive hover:!bg-destructive hover:!text-black"
            )}
            disabled={submitting}
            onClick={onConfirm}
          >
            {submitting ? "Removing…" : "Remove Encryption"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

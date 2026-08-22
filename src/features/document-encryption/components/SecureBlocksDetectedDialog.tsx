"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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
        <AlertDialogHeader>
          <AlertDialogTitle>Secure blocks detected</AlertDialogTitle>
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
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel type="button" onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="neutral"
            className="bg-background"
            onClick={onSaveWithoutEncryption}
          >
            Save Without Encryption
          </Button>
          <Button
            type="button"
            variant="neutral"
            className="bg-background hover:bg-main hover:text-main-foreground"
            onClick={onEncrypt}
          >
            Encrypt
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

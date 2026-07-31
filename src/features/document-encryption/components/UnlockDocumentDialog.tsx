"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validatePassphraseForUnlock } from "../passphrase-validation";

interface UnlockDocumentDialogProps {
  open: boolean;
  documentTitle?: string;
  onOpenChange: (open: boolean) => void;
  onUnlock: (passphrase: string) => void | Promise<void>;
  onCancel: () => void;
}

export function UnlockDocumentDialog({
  open,
  documentTitle,
  onOpenChange,
  onUnlock,
  onCancel,
}: UnlockDocumentDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPassphrase("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePassphraseForUnlock(passphrase);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid passphrase.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onUnlock(passphrase);
    } catch {
      setError("Incorrect passphrase. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md shadow-xl ring-1 ring-border/50">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Unlock document
            </DialogTitle>
            <DialogDescription>
              {documentTitle ? (
                <>
                  <span className="font-medium text-foreground">
                    {documentTitle}
                  </span>{" "}
                  is encrypted. Enter your passphrase to view and edit it.
                </>
              ) : (
                "This document is encrypted. Enter your passphrase to view and edit it."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label htmlFor="unlock-passphrase" className="text-sm font-medium">
              Passphrase
            </label>
            <Input
              id="unlock-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              className="bg-background"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!passphrase || submitting}
              className={cn(
                "bg-background text-foreground hover:bg-main hover:text-black"
              )}
            >
              {submitting ? "Unlocking…" : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

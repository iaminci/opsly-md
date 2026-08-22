"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
import { validatePassphraseMatch } from "../passphrase-validation";

interface SetPassphraseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (passphrase: string) => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  description?: React.ReactNode;
  submitLabel?: string;
  submittingLabel?: string;
}

function PassphraseField({
  id,
  label,
  value,
  onChange,
  showPassphrase,
  onToggleVisibility,
  autoComplete,
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassphrase: boolean;
  onToggleVisibility: () => void;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={showPassphrase ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
        >
          {showPassphrase ? (
            <EyeOff className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          ) : (
            <Eye className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export function SetPassphraseDialog({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
  title = "Encrypt",
  description = (
    <>
      Choose a passphrase to encrypt this document. You will need it to unlock
      the document later.
    </>
  ),
  submitLabel = "Encrypt & Save",
  submittingLabel = "Encrypting…",
}: SetPassphraseDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirmPassphrase, setShowConfirmPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPassphrase("");
      setConfirmPassphrase("");
      setShowPassphrase(false);
      setShowConfirmPassphrase(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePassphraseMatch(passphrase, confirmPassphrase);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid passphrase.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(passphrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to encrypt document.");
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
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PassphraseField
              id="set-passphrase"
              label="Passphrase"
              value={passphrase}
              onChange={(value) => {
                setPassphrase(value);
                setError(null);
              }}
              showPassphrase={showPassphrase}
              onToggleVisibility={() => setShowPassphrase((current) => !current)}
              autoComplete="new-password"
              autoFocus
            />
            <PassphraseField
              id="confirm-passphrase"
              label="Confirm passphrase"
              value={confirmPassphrase}
              onChange={(value) => {
                setConfirmPassphrase(value);
                setError(null);
              }}
              showPassphrase={showConfirmPassphrase}
              onToggleVisibility={() =>
                setShowConfirmPassphrase((current) => !current)
              }
              autoComplete="new-password"
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
              disabled={!passphrase || !confirmPassphrase || submitting}
              className={cn(
                "bg-background text-foreground hover:bg-main hover:text-main-foreground"
              )}
            >
              {submitting ? submittingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

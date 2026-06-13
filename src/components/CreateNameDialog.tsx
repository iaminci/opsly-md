"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CreateNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  /** Merged onto the top-right close (X) control. */
  closeButtonClassName?: string;
  onSubmit: (name: string) => void | Promise<void>;
}

export function CreateNameDialog({
  open,
  onOpenChange,
  title,
  placeholder = "Name",
  defaultValue = "",
  submitLabel = "Create",
  closeButtonClassName,
  onSubmit,
}: CreateNameDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
    }
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const dirty =
      value.trim() !== (defaultValue ?? "").trim();
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, value, defaultValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md shadow-xl ring-1 ring-border/50"
        closeButtonClassName={closeButtonClassName}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder={placeholder}
              className={cn(
                "h-10 rounded-md border-border",
                "ring-0 ring-foreground ring-offset-0",
                error && "border-border ring-border",
              )}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => onOpenChange(false)}
              className="bg-background"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!value.trim()}
              className={cn(
                "bg-background text-foreground hover:bg-main"
              )}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

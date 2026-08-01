"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validatePassphraseForUnlock } from "../passphrase-validation";

interface EncryptedDocumentPlaceholderProps {
  documentTitle: string;
  onUnlock: (passphrase: string) => void | Promise<void>;
  focusRequest?: number;
}

export function EncryptedDocumentPlaceholder({
  documentTitle,
  onUnlock,
  focusRequest = 0,
}: EncryptedDocumentPlaceholderProps) {
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusRequest > 0) {
      inputRef.current?.focus();
    }
  }, [focusRequest]);

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
    <div className="flex min-h-[calc(100svh-14rem)] -translate-y-80 items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-lg border-2 border-border bg-violet-50 px-8 py-8 text-center">
        <p className="mx-auto mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
          <Lock className="size-3.5 shrink-0 text-violet-600" aria-hidden />
          <span className="truncate font-medium text-foreground">
            {documentTitle} is Encrypted
          </span>
        </p>

        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          Enter passphrase to decrypt the content for viewing and editing.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
          Decrypted content exists only in memory until the document is locked or
          the tab is closed.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-6 max-w-md space-y-4 text-left"
        >
          <div className="space-y-2">
            <label htmlFor="unlock-passphrase" className="text-sm font-medium">
              Passphrase
            </label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="unlock-passphrase"
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  setError(null);
                }}
                autoComplete="current-password"
                autoFocus
                className="bg-background pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label={
                  showPassphrase ? "Hide passphrase" : "Show passphrase"
                }
              >
                {showPassphrase ? (
                  <EyeOff
                    className="size-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                ) : (
                  <Eye
                    className="size-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                )}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={!passphrase || submitting}
              className={cn(
                "bg-background text-foreground hover:bg-main hover:text-black"
              )}
            >
              <LockOpen aria-hidden />
              {submitting ? "Unlocking…" : "Unlock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

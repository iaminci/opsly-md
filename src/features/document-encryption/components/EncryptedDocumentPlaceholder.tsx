"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="flex min-h-[calc(100dvh-14rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-xl border border-border-subtle bg-surface-raised px-6 py-7 text-left shadow-shadow sm:px-8 sm:py-8">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Lock className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-6 text-foreground">
              {documentTitle} is encrypted
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Enter your passphrase to view and edit this document.
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-lg bg-surface-nested px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          Decrypted content exists only in memory until the document is locked or
          the tab is closed.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
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
                className="bg-input pr-10"
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
              className="min-w-28"
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

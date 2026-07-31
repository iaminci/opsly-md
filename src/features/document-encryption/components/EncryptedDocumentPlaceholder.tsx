"use client";

import { Lock } from "lucide-react";

interface EncryptedDocumentPlaceholderProps {
  documentTitle: string;
  onUnlockRequest?: () => void;
}

export function EncryptedDocumentPlaceholder({
  documentTitle,
  onUnlockRequest,
}: EncryptedDocumentPlaceholderProps) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Lock className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-2">
        <p className="text-base font-medium text-foreground">
          {documentTitle} is encrypted
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          Enter your passphrase to decrypt and view this document. Decrypted
          content stays in memory only until you save.
        </p>
      </div>
      {onUnlockRequest && (
        <button
          type="button"
          onClick={onUnlockRequest}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Enter passphrase
        </button>
      )}
    </div>
  );
}

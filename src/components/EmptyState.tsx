"use client";

import { AlertTriangleIcon, FileTextIcon, ShieldIcon } from "lucide-react";
import { EncryptionSpecsList } from "@/features/document-encryption/components/EncryptionSpecsList";

function InfoCallout({
  icon: Icon,
  iconClassName,
  title,
  className,
  children,
}: {
  icon: typeof AlertTriangleIcon;
  iconClassName: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-md border-2 border-border px-4 py-3 text-sm text-foreground text-left ${className ?? ""}`}
    >
      <Icon className={`mt-0.5 size-6 shrink-0 ${iconClassName}`} aria-hidden />
      <div className="min-w-0 space-y-1.5">
        {title ? (
          <p className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
        ) : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ hasDocuments = false }: { hasDocuments?: boolean }) {
  return (
    <div className="flex min-h-[calc(100svh-14rem)] items-center justify-center">
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 text-left">
        <InfoCallout
          icon={FileTextIcon}
          iconClassName="text-sky-600 dark:text-sky-400"
          className="bg-sky-50 dark:bg-sky-950/45"
        >
          {hasDocuments ? (
            <>
              <span className="font-semibold">No document open.</span> Use the sidebar to open one,
              or create markdown / upload a file.
            </>
          ) : (
            <>
              <span className="font-semibold">No documents yet.</span> Use the &apos;+&apos; button in
              the sidebar to paste markdown or upload a file.
            </>
          )}
        </InfoCallout>
        <InfoCallout
          icon={AlertTriangleIcon}
          iconClassName="text-amber-500 dark:text-amber-400"
          className="bg-amber-50 dark:bg-amber-950/40"
        >
          <span className="font-semibold text-destructive">
            All documents are stored locally in this browser.
          </span>{" "}
          Clearing browser data may remove your documents. Export your workspace regularly to keep a
          backup.
        </InfoCallout>
        <InfoCallout
          icon={ShieldIcon}
          iconClassName="text-violet-600 dark:text-violet-400"
          title="Document encryption"
          className="bg-violet-50 dark:bg-violet-950/40"
        >
          <p>
            <span className="font-semibold">Encrypt sensitive documents</span> with a passphrase from
            the security menu on any open document.
          </p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li className="flex gap-2">
              <span aria-hidden className="font-semibold text-foreground">
                ·
              </span>
              <span>
                Encrypted files are stored as{" "}
                <code className="rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground dark:bg-input">
                  .opsly
                </code>{" "}
                documents.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="font-semibold text-foreground">
                ·
              </span>
              <span>
                <span className="font-semibold text-foreground">Unlock</span> to decrypt for viewing
                and editing — decrypted content stays in memory only until you{" "}
                <span className="font-semibold text-foreground">Lock</span> the document or close the
                tab.
              </span>
            </li>
          </ul>
          <EncryptionSpecsList />
        </InfoCallout>
      </div>
    </div>
  );
}

"use client";

import { AlertTriangleIcon, FileTextIcon, ShieldIcon } from "lucide-react";
import { EncryptionSpecsList } from "@/features/document-encryption/components/EncryptionSpecsList";

function InfoCallout({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof AlertTriangleIcon;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-raised px-5 py-4 text-left text-sm text-foreground shadow-shadow">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
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
        >
          <span className="font-semibold text-foreground">
            All documents are stored locally in this browser.
          </span>{" "}
          Clearing browser data may remove your documents. Export your workspace regularly to keep a
          backup.
        </InfoCallout>
        <InfoCallout
          icon={ShieldIcon}
          title="Document encryption"
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
                <code className="rounded border border-border-subtle bg-surface-nested px-1 py-0.5 text-xs text-foreground">
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

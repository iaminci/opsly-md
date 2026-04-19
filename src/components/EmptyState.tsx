"use client";

import { AlertTriangleIcon } from "lucide-react";

export function EmptyState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="mb-4 text-muted-foreground">
        No documents yet. Use the sidebar to paste markdown or upload a file.
      </p>
      <div className="flex items-start justify-center gap-3 rounded-md border border-bg-primary/50 bg-amber-50 px-4 py-3 text-sm text-foreground text-left">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">All documents are stored locally in this browser.</span>{" "}
          Clearing browser data may remove your documents. Export your workspace regularly to keep a backup.
        </p>
      </div>
    </div>
  );
}

"use client";

import { Trash2 } from "lucide-react";
import type { Document } from "@/types/document";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getFirstHeading(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].replace(/#+\s*$/, "").trim() : null;
}

interface DocumentListProps {
  documents: Document[];
  currentId: string | null;
  onSelect: (doc: Document) => void;
  onDelete: (id: string) => void;
}

export function DocumentList({
  documents,
  currentId,
  onSelect,
  onDelete,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet. Paste or upload markdown to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {documents.map((doc) => (
        <li key={doc.id} className="group flex items-center gap-1">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={() => onSelect(doc)}
            className={cn(
              "flex-1 justify-start truncate font-normal",
              currentId === doc.id && "bg-accent font-medium"
            )}
          >
            {getFirstHeading(doc.content) ?? doc.title}
          </Button>
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/65"
            aria-label="Delete document"
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}

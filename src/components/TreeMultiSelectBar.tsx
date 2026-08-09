"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, X } from "lucide-react";

interface TreeMultiSelectBarProps {
  selectedCount: number;
  onDelete: () => void;
  onClear: () => void;
  className?: string;
}

export function TreeMultiSelectBar({
  selectedCount,
  onDelete,
  onClear,
  className,
}: TreeMultiSelectBarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 pb-2 pt-1",
        className
      )}
    >
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">
        {selectedCount} selected
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
        disabled={selectedCount === 0}
        onClick={onDelete}
      >
        <Trash2 className="mr-1 size-3.5" />
        Delete
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

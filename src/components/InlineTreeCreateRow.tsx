"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, FileBraces, FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineTreeCreateType = "folder" | "file";

export const INLINE_TREE_EDIT_SELECTOR = '[data-inline-tree-edit="true"]';
/** @deprecated Use {@link INLINE_TREE_EDIT_SELECTOR}. */
export const INLINE_TREE_CREATE_SELECTOR = INLINE_TREE_EDIT_SELECTOR;

interface InlineTreeCreateRowProps {
  type: InlineTreeCreateType;
  showChevron?: boolean;
  showIcon?: boolean;
  rename?: boolean;
  initialValue?: string;
  className?: string;
  inputClassName?: string;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

export function InlineTreeCreateRow({
  type,
  showChevron = false,
  showIcon = true,
  rename = false,
  initialValue = "",
  className,
  inputClassName,
  onSubmit,
  onCancel,
}: InlineTreeCreateRowProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    const focusInput = () => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    };

    focusInput();
    const retryId = window.setTimeout(focusInput, 50);
    return () => window.clearTimeout(retryId);
  }, []);

  const commit = async () => {
    if (submittingRef.current || dismissedRef.current) return;
    const trimmed = value.trim();
    if (!trimmed || (rename && trimmed === initialValue.trim())) {
      dismissedRef.current = true;
      onCancel();
      return;
    }
    submittingRef.current = true;
    try {
      await onSubmit(trimmed);
      dismissedRef.current = true;
    } finally {
      submittingRef.current = false;
    }
  };

  const cancel = () => {
    if (dismissedRef.current || submittingRef.current) return;
    dismissedRef.current = true;
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const input = (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      aria-label={
        rename
          ? type === "folder"
            ? "Rename folder"
            : "Rename file"
          : type === "folder"
            ? "New folder name"
            : "New file name"
      }
      className={cn(
        "box-border min-w-0 w-full max-w-full flex-1 rounded-md border-2 border-primary bg-background px-1.5 py-0.5",
        "text-base font-base leading-snug text-foreground shadow-none outline-none focus-visible:border-primary",
        inputClassName
      )}
    />
  );

  const saveButton = (
    <button
      type="button"
      aria-label="Save"
      onClick={() => void commit()}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-primary"
    >
      <Check className="size-4" aria-hidden />
    </button>
  );

  if (!showIcon) {
    return (
      <div
        data-inline-tree-edit="true"
        className={cn("flex min-w-0 flex-1 items-center gap-1", className)}
      >
        {input}
        {saveButton}
      </div>
    );
  }

  return (
    <div
      data-inline-tree-edit="true"
      className={cn(
        "flex min-h-8 w-full min-w-0 items-center gap-1.5 py-0.5 pl-1 pr-1",
        className
      )}
    >
      {showChevron && type === "folder" ? (
        <ChevronRight
          aria-hidden
          className="size-[1.125rem] shrink-0 text-muted-foreground"
        />
      ) : null}
      {type === "folder" ? (
        <FolderIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      ) : (
        <FileBraces className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      {input}
      {saveButton}
    </div>
  );
}

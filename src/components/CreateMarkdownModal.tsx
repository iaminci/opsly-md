"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilePlus, X } from "lucide-react";
import { InlineLocationSelectors } from "@/components/InlineLocationSelectors";
import { LineNumberedTextarea } from "@/components/LineNumberedTextarea";
import { useWorkspaceTree } from "@/context/WorkspaceTreeContext";

const DEFAULT_NEW_DOCUMENT_TITLE = "Untitled";

function resolveNewDocumentTitle(titleInput: string): string {
  const explicit = titleInput.trim().replace(/\.md$/i, "").trim();
  return explicit || DEFAULT_NEW_DOCUMENT_TITLE;
}

interface CreateMarkdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWorkspaceId: string;
  initialFolderId: string | null;
  hideLocationSelectors?: boolean;
  onCreate: (
    title: string,
    content: string,
    workspaceId: string,
    folderId: string | null
  ) => boolean | void | Promise<boolean | void>;
}

export function CreateMarkdownModal({
  open,
  onOpenChange,
  initialWorkspaceId,
  initialFolderId,
  hideLocationSelectors = false,
  onCreate,
}: CreateMarkdownModalProps) {
  const { sortedWorkspaces, hasSyncedWorkspacesAtLeastOnce } = useWorkspaceTree();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialWorkspaceId);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);
  const [title, setTitle] = useState(DEFAULT_NEW_DOCUMENT_TITLE);
  const [markdown, setMarkdown] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedWorkspaceId(initialWorkspaceId);
    setSelectedFolderId(initialFolderId);
    setTitle(DEFAULT_NEW_DOCUMENT_TITLE);
    setMarkdown("");
    setCreating(false);
  }, [open, initialWorkspaceId, initialFolderId]);

  useEffect(() => {
    if (!open) return;
    const dirty =
      markdown.trim().length > 0 ||
      title.trim() !== DEFAULT_NEW_DOCUMENT_TITLE;
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, markdown, title]);

  const handleSubmit = async () => {
    if (!selectedWorkspaceId) return;
    const trimmed = markdown.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const resolvedTitle = resolveNewDocumentTitle(title);
      const result = await onCreate(
        resolvedTitle,
        trimmed,
        selectedWorkspaceId,
        selectedFolderId
      );
      if (result !== false) {
        onOpenChange(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const preventCloseOnNestedDropdown = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('[data-slot="dropdown-menu-content"]') ||
      target?.closest('[data-slot="dropdown-menu-trigger"]')
    ) {
      event.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[90dvh] max-h-[90dvh] flex-col gap-0 overflow-hidden px-0 !pb-0 pt-0 duration-150 sm:max-w-[min(72rem,calc(100vw-2rem))] data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]"
        overlayClassName="bg-background/20 supports-backdrop-filter:bg-background/10"
        showCloseButton={false}
        onPointerDownOutside={preventCloseOnNestedDropdown}
        onInteractOutside={preventCloseOnNestedDropdown}
        onFocusOutside={preventCloseOnNestedDropdown}
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-4 space-y-0 border-b-2 border-border px-6 py-5">
          <DialogTitle className="flex min-w-0 items-center gap-2.5">
            <FilePlus className="size-4 shrink-0 text-primary" aria-hidden />
            Create Markdown
          </DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="neutral"
              size="icon-sm"
              className="shrink-0 bg-background text-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Close create dialog"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
          <DialogDescription className="sr-only">
            Choose a workspace, folder, filename, and markdown content for a new document
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pt-7">
            {!hasSyncedWorkspacesAtLeastOnce ? (
              <p className="text-sm text-muted-foreground">Loading workspaces…</p>
            ) : sortedWorkspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No workspace available. Add one with “New Workspace” in the workspace menu.
              </p>
            ) : (
              <>
                {!hideLocationSelectors ? (
                  <InlineLocationSelectors
                    idPrefix="create-modal"
                    selectedWorkspaceId={selectedWorkspaceId}
                    setSelectedWorkspaceId={setSelectedWorkspaceId}
                    selectedFolderId={selectedFolderId}
                    setSelectedFolderId={setSelectedFolderId}
                  />
                ) : null}
                <div className="flex shrink-0 flex-col gap-1">
                  <label
                    htmlFor="create-modal-title"
                    className="block text-sm font-medium text-foreground"
                  >
                    Filename
                  </label>
                  <Input
                    id="create-modal-title"
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter title..."
                    className="font-mono text-sm"
                    autoComplete="off"
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1">
                  <label
                    htmlFor="create-modal-body"
                    className="block text-sm font-medium text-foreground"
                  >
                    Markdown
                  </label>
                  <LineNumberedTextarea
                    id="create-modal-body"
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    placeholder="Enter markdown here..."
                    spellCheck={false}
                    className="field-sizing-fixed min-h-[12rem] w-full max-w-full flex-1"
                    textareaClassName="resize-none"
                  />
                </div>
              </>
            )}
          </div>
          {hasSyncedWorkspacesAtLeastOnce && sortedWorkspaces.length > 0 ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-6 pb-6 pt-4 sm:gap-3">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                className="shrink-0 bg-background"
                onClick={() => onOpenChange(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                className="shrink-0 bg-background hover:bg-main hover:text-black"
                onClick={() => void handleSubmit()}
                disabled={!markdown.trim() || !selectedWorkspaceId || creating}
              >
                {creating ? "Creating…" : "Add"}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

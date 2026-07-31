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
import { cn } from "@/lib/utils";

const DEFAULT_NEW_DOCUMENT_TITLE = "Untitled";

const settingsActionButtonClassName =
  "h-9 shrink-0 px-3.5 text-sm rounded-md border-2 border-border text-primary shadow-none hover:border-border hover:bg-primary hover:text-black hover:translate-x-0 hover:translate-y-0";

const settingsCancelButtonClassName =
  "h-9 shrink-0 px-3.5 text-sm rounded-md border-2 border-border bg-background text-foreground shadow-none hover:border-border hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0 hover:translate-y-0";

const fieldLabelClassName = "block text-sm font-medium text-foreground";

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

  const canCreate =
    hasSyncedWorkspacesAtLeastOnce &&
    sortedWorkspaces.length > 0 &&
    !!markdown.trim() &&
    !!selectedWorkspaceId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[90dvh] max-h-[90dvh] flex-col gap-0 overflow-hidden px-0 !pb-0 pt-0 duration-150 sm:max-w-[min(76rem,calc(100vw-2rem))] data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]"
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
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-md border-2 border-border bg-background text-foreground shadow-none hover:border-border hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0 hover:translate-y-0"
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
          {!hasSyncedWorkspacesAtLeastOnce ? (
            <p className="px-6 pt-7 text-sm text-muted-foreground">
              Loading workspaces…
            </p>
          ) : sortedWorkspaces.length === 0 ? (
            <p className="px-6 pt-7 text-sm text-muted-foreground">
              No workspace available. Add one with “New Workspace” in the workspace menu.
            </p>
          ) : (
            <>
              <div
                className={cn(
                  "grid shrink-0 gap-2 px-6 pt-5",
                  hideLocationSelectors
                    ? "grid-cols-1"
                    : "grid-cols-1 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end"
                )}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor="create-modal-title" className={fieldLabelClassName}>
                    Filename
                  </label>
                  <Input
                    id="create-modal-title"
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled"
                    className="h-9 font-mono text-sm shadow-none"
                    autoComplete="off"
                  />
                </div>

                {!hideLocationSelectors ? (
                  <InlineLocationSelectors
                    idPrefix="create-modal"
                    variant="settings"
                    compact
                    layout="split"
                    selectedWorkspaceId={selectedWorkspaceId}
                    setSelectedWorkspaceId={setSelectedWorkspaceId}
                    selectedFolderId={selectedFolderId}
                    setSelectedFolderId={setSelectedFolderId}
                  />
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col px-6 pb-4 pt-3">
                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                  <label htmlFor="create-modal-body" className={fieldLabelClassName}>
                    Markdown
                  </label>
                  <LineNumberedTextarea
                    id="create-modal-body"
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    placeholder="Write markdown here…"
                    spellCheck={false}
                    className={cn(
                      "field-sizing-fixed min-h-0 w-full max-w-full flex-1",
                      "shadow-none"
                    )}
                    textareaClassName="min-h-[12rem] resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-6 pb-6 pt-4 sm:gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className={settingsCancelButtonClassName}
                  onClick={() => onOpenChange(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={settingsActionButtonClassName}
                  onClick={() => void handleSubmit()}
                  disabled={!canCreate || creating}
                >
                  {creating ? "Creating…" : "Add"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

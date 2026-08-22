"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileBraces, Upload, X } from "lucide-react";
import { InlineLocationSelectors } from "@/components/InlineLocationSelectors";
import { useWorkspaceTree } from "@/context/WorkspaceTreeContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function isAcceptedUploadFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".md") ||
    name.endsWith(".txt") ||
    name.endsWith(".opsly") ||
    name.endsWith(".encrypted.json")
  );
}

function pickUploadFiles(files: FileList | null): {
  accepted: File[];
  rejectedCount: number;
} {
  if (!files?.length) return { accepted: [], rejectedCount: 0 };
  const all = Array.from(files);
  const accepted = all.filter(isAcceptedUploadFile);
  return { accepted, rejectedCount: all.length - accepted.length };
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function mergeSelectedFiles(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map(fileKey));
  const merged = [...existing];
  for (const file of incoming) {
    const key = fileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(file);
  }
  return merged;
}

const settingsActionButtonClassName =
  "w-full min-w-0 justify-center rounded-md border-2 border-border text-primary shadow-none hover:border-border hover:bg-primary hover:text-primary-foreground hover:translate-x-0 hover:translate-y-0";

const settingsCancelButtonClassName =
  "w-full min-w-0 justify-center rounded-md border-2 border-border bg-background text-foreground shadow-none hover:border-border hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0 hover:translate-y-0";

interface UploadFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWorkspaceId: string;
  initialFolderId: string | null;
  hideLocationSelectors?: boolean;
  workspacesEnabled?: boolean;
  onUpload: (
    files: File[],
    workspaceId: string,
    folderId: string | null
  ) =>
    | { uploaded: number; failed: number }
    | void
    | Promise<{ uploaded: number; failed: number } | void>;
}

export function UploadFileModal({
  open,
  onOpenChange,
  initialWorkspaceId,
  initialFolderId,
  hideLocationSelectors = false,
  workspacesEnabled = true,
  onUpload,
}: UploadFileModalProps) {
  const { sortedWorkspaces, hasSyncedWorkspacesAtLeastOnce } = useWorkspaceTree();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialWorkspaceId);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setSelectedWorkspaceId(workspacesEnabled ? initialWorkspaceId : "default");
    setSelectedFolderId(initialFolderId);
    setSelectedFiles([]);
    setUploading(false);
    setDragActive(false);
    dragDepthRef.current = 0;
  }, [open, initialWorkspaceId, initialFolderId, workspacesEnabled]);

  useEffect(() => {
    if (!open) return;
    if (!selectedFiles.length) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, selectedFiles]);

  const addFiles = (files: FileList | null, append = false) => {
    const { accepted, rejectedCount } = pickUploadFiles(files);
    if (rejectedCount > 0) {
      toast.error(
        "File not supported. Only .md, .opsly, and legacy .encrypted.json files can be uploaded."
      );
    }
    if (!accepted.length) return;
    setSelectedFiles((prev) =>
      append ? mergeSelectedFiles(prev, accepted) : accepted
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files, false);
    e.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    addFiles(e.dataTransfer.files, true);
  };

  const handleSubmit = async () => {
    if (!selectedFiles.length || !selectedWorkspaceId) return;
    const validFiles = selectedFiles.filter(isAcceptedUploadFile);
    if (validFiles.length !== selectedFiles.length) {
      toast.error(
        "File not supported. Only .md, .opsly, and legacy .encrypted.json files can be uploaded."
      );
      setSelectedFiles(validFiles);
      return;
    }
    setUploading(true);
    try {
      const result = await onUpload(
        validFiles,
        selectedWorkspaceId,
        selectedFolderId
      );
      if (!result || result.uploaded > 0) {
        onOpenChange(false);
      }
    } finally {
      setUploading(false);
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
        className="gap-0 overflow-hidden px-0 pb-6 pt-0 duration-150 sm:max-w-[31rem] data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]"
        overlayClassName="bg-background/20 supports-backdrop-filter:bg-background/10"
        showCloseButton={false}
        onPointerDownOutside={preventCloseOnNestedDropdown}
        onInteractOutside={preventCloseOnNestedDropdown}
        onFocusOutside={preventCloseOnNestedDropdown}
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b-2 border-border px-6 py-5">
          <DialogTitle className="flex min-w-0 items-center gap-2.5">
            <Upload className="size-4 shrink-0 text-primary" aria-hidden />
            Upload File
          </DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-md border-2 border-border bg-background text-foreground shadow-none hover:border-border hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0 hover:translate-y-0"
              aria-label="Close upload dialog"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
          <DialogDescription className="sr-only">
            Choose a workspace, folder, and one or more .md or .opsly files to upload
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-8 px-6 pt-7">
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
                  idPrefix="upload-modal"
                  variant="settings"
                  hideWorkspaceSelector={!workspacesEnabled}
                  selectedWorkspaceId={selectedWorkspaceId}
                  setSelectedWorkspaceId={setSelectedWorkspaceId}
                  selectedFolderId={selectedFolderId}
                  setSelectedFolderId={setSelectedFolderId}
                />
              ) : null}
              <div>
                <input
                  ref={fileInputRef}
                  id="upload-modal-file"
                  type="file"
                  accept=".md,.txt,.opsly,.encrypted.json"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={cn(
                    "flex min-h-[7.5rem] flex-col items-center justify-center gap-3 rounded-base border-2 border-dashed border-border bg-background px-4 py-5 text-center transition-colors",
                    dragActive && "border-primary bg-primary/5"
                  )}
                >
                  <Upload
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-colors",
                      dragActive && "text-primary"
                    )}
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">
                    {dragActive
                      ? "Drop files to upload"
                      : "Drag and drop .md or .opsly files here"}
                  </p>
                  <div className="flex min-w-0 w-full flex-col items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={settingsActionButtonClassName}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-4 shrink-0" />
                      Choose files
                    </Button>
                    {selectedFiles.length > 0 ? (
                      <div className="flex min-w-0 w-full max-w-full flex-wrap items-center justify-center gap-2">
                        {selectedFiles.map((file) => (
                          <span
                            key={fileKey(file)}
                            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-base border-2 border-border bg-sidebar-accent px-2.5 py-1 text-sm font-semibold text-primary"
                          >
                            <FileBraces className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{file.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No files selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={settingsCancelButtonClassName}
                    onClick={() => onOpenChange(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={settingsActionButtonClassName}
                    onClick={() => void handleSubmit()}
                    disabled={
                      !selectedFiles.length || !selectedWorkspaceId || uploading
                    }
                  >
                    {uploading
                      ? "Uploading…"
                      : selectedFiles.length > 1
                        ? `Upload ${selectedFiles.length} files`
                        : "Upload"}
                  </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

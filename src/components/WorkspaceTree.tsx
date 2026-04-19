"use client";

import { useState, useEffect, useCallback } from "react";
import type { Document } from "@/types/document";
import type { Workspace } from "@/types/workspace";
import type { Folder } from "@/types/workspace";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  FolderIcon,
  Trash2,
  MoreHorizontal,
  Pencil,
  FileBraces,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DRAG_TYPE = "application/x-md-viewer-document";

/** Drop-target highlight for workspace / folder headers (paired with content-area drag state). */
const DRAG_OVER_CLASS =
  "bg-sidebar-accent/45 ring-1 ring-primary/90/60 ring-inset transition-colors duration-150";

/** Workspace name strip (tree rows) — borderless; same fills/hover as folder rows. */
const WORKSPACE_TAB_CORAL_PILL = cn(
  "!flex !h-8 !min-h-8 !min-w-0 !flex-1 !items-center !gap-2 !rounded-md !border-0 !bg-transparent !py-1 !pl-3 !pr-0 !text-left !font-heading !font-bold !text-primary !shadow-none !outline-none !ring-0 !transition-colors hover:!text-destructive focus-visible:!ring-2 focus-visible:!ring-ring"
);

/** Inactive workspace row label (neutral grey — theme `muted-foreground` is tinted red). */
const WORKSPACE_TAB_MUTED_PILL = cn(
  "!flex !h-8 !min-h-8 !min-w-0 !flex-1 !items-center !gap-2 !rounded-md !border-0 !bg-transparent !py-1 !pl-3 !pr-0 !text-left !font-heading !font-normal !text-zinc-600 dark:!text-zinc-400 !shadow-none !outline-none !ring-0 !transition-colors hover:!text-destructive"
);

function useClearDragStateOnDragEnd(setDragOver: (v: boolean) => void) {
  useEffect(() => {
    const clear = () => setDragOver(false);
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, [setDragOver]);
}
const EXPANDED_WORKSPACES_KEY = "md-viewer-expanded-workspaces";
const EXPANDED_FOLDERS_KEY = "md-viewer-expanded-folders";

function isTreeDocumentDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes(DRAG_TYPE);
}

function containsActiveDoc(
  workspaceId: string,
  folderId: string | null,
  currentId: string | null,
  getDocuments: (wsId: string, fId: string | null) => Document[],
  getFolders: (wsId: string, fId: string | null) => Folder[]
): boolean {
  if (!currentId) return false
  const docs = getDocuments(workspaceId, folderId)
  if (docs.some((d) => d.id === currentId)) return true
  const subfolders = getFolders(workspaceId, folderId)
  return subfolders.some((f) =>
    containsActiveDoc(workspaceId, f.id, currentId, getDocuments, getFolders)
  )
}

function getFirstHeading(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].replace(/#+\s*$/, "").trim() : null;
}

interface WorkspaceTreeProps {
  workspaces: Workspace[];
  folders: (workspaceId: string, parentFolderId: string | null) => Folder[];
  documents: (workspaceId: string, folderId: string | null) => Document[];
  currentId: string | null;
  selectedWorkspaceId: string | null;
  /** True while the ⋯ workspace menu in the switcher is open (single-workspace view). */
  workspaceSwitcherMenuOpen?: boolean;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (id: string, title: string) => void;
  onAddWorkspace: () => void;
  onAddFolder: (workspaceId: string, parentFolderId: string | null) => void;
  onAddFile: (workspaceId: string, folderId: string | null) => void;
  onUploadFile: (workspaceId: string, folderId: string | null) => void;
  onMoveDocument: (docId: string, workspaceId: string, folderId: string | null) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDeleteWorkspace: (id: string, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onRenameDocument: (id: string, title: string) => void;
}

export function WorkspaceTree({
  workspaces,
  folders,
  documents,
  currentId,
  selectedWorkspaceId,
  workspaceSwitcherMenuOpen = false,
  onSelectDocument,
  onDeleteDocument,
  onAddWorkspace,
  onAddFolder,
  onAddFile,
  onUploadFile,
  onMoveDocument,
  onRenameWorkspace,
  onDeleteWorkspace,
  onRenameFolder,
  onDeleteFolder,
  onRenameDocument,
}: WorkspaceTreeProps) {
  const workspaceIds = workspaces.map((w) => w.id);

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<string[]>(() => {
    if (typeof window === "undefined" || workspaceIds.length === 0) return workspaceIds;
    try {
      const stored = localStorage.getItem(EXPANDED_WORKSPACES_KEY);
      if (!stored) return workspaceIds;
      const parsed = JSON.parse(stored) as string[];
      const restored = workspaceIds.filter((id) => parsed.includes(id));
      return restored.length > 0 ? restored : workspaceIds;
    } catch {
      return workspaceIds;
    }
  });

  const [expandedFolders, setExpandedFolders] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(EXPANDED_FOLDERS_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const toSave = expandedWorkspaces.filter((id) => workspaceIds.includes(id));
    localStorage.setItem(EXPANDED_WORKSPACES_KEY, JSON.stringify(toSave));
  }, [expandedWorkspaces, workspaceIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify(expandedFolders));
  }, [expandedFolders]);

  const handleWorkspaceValueChange = useCallback(
    (value: string[]) => {
      setExpandedWorkspaces(value);
    },
    []
  );

  const handleExpandedFoldersChange = useCallback(
    (parentFolderId: string | null, childIds: string[], newExpanded: string[]) => {
      setExpandedFolders((prev) => {
        const without = prev.filter((id) => !childIds.includes(id));
        return [...without, ...newExpanded];
      });
    },
    []
  );

  const ensureWorkspaceExpanded = useCallback((workspaceId: string) => {
    setExpandedWorkspaces((prev) =>
      prev.includes(workspaceId) ? prev : [...prev, workspaceId]
    );
  }, []);

  const ensureFolderExpanded = useCallback((folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId) ? prev : [...prev, folderId]
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || workspaceIds.length === 0) return;
    let parsed: string[] = [];
    try {
      const stored = localStorage.getItem(EXPANDED_WORKSPACES_KEY);
      if (stored) parsed = JSON.parse(stored) as string[];
    } catch {
      /* ignore */
    }
    setExpandedWorkspaces((prev) => {
      const restored = workspaceIds.filter((id) => parsed.includes(id));
      const newIds = workspaceIds.filter((id) => !parsed.includes(id));
      if (restored.length > 0 || newIds.length > 0) {
        return [...restored, ...newIds];
      }
      return prev.length > 0 ? prev : workspaceIds;
    });
  }, [workspaceIds.join(",")]);

  const workspaceValue = expandedWorkspaces.filter((id) => workspaceIds.includes(id));

  /** While any workspace/folder/file ⋯ menu is open, hide "active doc" styling elsewhere. */
  const [treeActionMenuOpen, setTreeActionMenuOpen] = useState(false);

  const sectionProps = (ws: Workspace) => ({
    workspace: ws,
    expandedFolders,
    onExpandedFoldersChange: handleExpandedFoldersChange,
    folders: folders(ws.id, null),
    documents: documents(ws.id, null),
    getFolders: folders,
    getDocuments: documents,
    currentId,
    selectedWorkspaceId,
    workspaceSwitcherMenuOpen,
    suppressDocHighlights: treeActionMenuOpen || workspaceSwitcherMenuOpen,
    onTreeMenuOpenChange: setTreeActionMenuOpen,
    onSelectDocument,
    onDeleteDocument,
    onAddFolder,
    onAddFile,
    onUploadFile,
    onMoveDocument,
    onRenameWorkspace,
    onDeleteWorkspace,
    onRenameFolder,
    onDeleteFolder,
    onRenameDocument,
    ensureWorkspaceExpanded,
    ensureFolderExpanded,
  });

  const treeSections = workspaces.map((ws, i) => (
    <WorkspaceSection
      key={ws.id}
      isLastWorkspace={i === workspaces.length - 1}
      {...sectionProps(ws)}
    />
  ));

  if (selectedWorkspaceId) {
    return (
      <div
        key={workspaceIds.join(",")}
        className="flex w-full max-w-full flex-col gap-1"
      >
        {treeSections}
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      key={workspaceIds.join(",")}
      value={workspaceValue}
      onValueChange={handleWorkspaceValueChange}
      className="flex w-full max-w-full flex-col gap-0"
    >
      {treeSections}
    </Accordion>
  );
}

interface WorkspaceSectionProps {
  expandedFolders: string[];
  onExpandedFoldersChange: (parentFolderId: string | null, childIds: string[], newExpanded: string[]) => void;
  workspace: Workspace;
  folders: Folder[];
  documents: Document[];
  getFolders: (workspaceId: string, parentFolderId: string | null) => Folder[];
  getDocuments: (workspaceId: string, folderId: string | null) => Document[];
  currentId: string | null;
  selectedWorkspaceId: string | null;
  workspaceSwitcherMenuOpen: boolean;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (id: string, title: string) => void;
  onAddFolder: (workspaceId: string, parentFolderId: string | null) => void;
  onAddFile: (workspaceId: string, folderId: string | null) => void;
  onUploadFile: (workspaceId: string, folderId: string | null) => void;
  onMoveDocument: (docId: string, workspaceId: string, folderId: string | null) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDeleteWorkspace: (id: string, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onRenameDocument: (id: string, title: string) => void;
  suppressDocHighlights: boolean;
  onTreeMenuOpenChange: (open: boolean) => void;
  ensureWorkspaceExpanded: (workspaceId: string) => void;
  ensureFolderExpanded: (folderId: string) => void;
  /** All-workspaces accordion: extra space below expanded sections (skipped for last item). */
  isLastWorkspace?: boolean;
}

function WorkspaceSection({
  expandedFolders,
  onExpandedFoldersChange,
  workspace,
  folders,
  documents,
  getFolders,
  getDocuments,
  currentId,
  selectedWorkspaceId,
  workspaceSwitcherMenuOpen,
  suppressDocHighlights,
  onTreeMenuOpenChange,
  ensureWorkspaceExpanded,
  ensureFolderExpanded,
  onSelectDocument,
  onDeleteDocument,
  onAddFolder,
  onAddFile,
  onUploadFile,
  onMoveDocument,
  onRenameWorkspace,
  onDeleteWorkspace,
  onRenameFolder,
  onDeleteFolder,
  onRenameDocument,
  isLastWorkspace = false,
}: WorkspaceSectionProps) {
  const [wsDragOver, setWsDragOver] = useState(false);
  const [wsContentDragOver, setWsContentDragOver] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  useClearDragStateOnDragEnd(setWsDragOver);
  useClearDragStateOnDragEnd(setWsContentDragOver);
  const folderIds = folders.map((f) => f.id);

  const workspaceHighlighted = wsDragOver || wsContentDragOver;
  const docActiveInWorkspace =
    !suppressDocHighlights &&
    containsActiveDoc(workspace.id, null, currentId, getDocuments, getFolders);
  const workspaceRowActive =
    docActiveInWorkspace ||
    workspaceMenuOpen ||
    (workspaceSwitcherMenuOpen && selectedWorkspaceId === workspace.id);

  const handleWsDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (isTreeDocumentDrag(e)) {
      ensureWorkspaceExpanded(workspace.id);
    }
    setWsDragOver(true);
  };

  const handleWsDragLeave = (e: React.DragEvent) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setWsDragOver(false);
  };

  const handleWsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWsDragOver(false);
    setWsContentDragOver(false);
    const docId = e.dataTransfer.getData(DRAG_TYPE);
    if (docId) onMoveDocument(docId, workspace.id, null);
  };

  const hasTreeItems = folders.length > 0 || documents.length > 0;
  const hideWorkspaceHeader = selectedWorkspaceId === workspace.id;

  const workspaceTreeInner = (
    <>
      {folders.length > 0 && (
        <Accordion
          type="multiple"
          key={folderIds.join(",")}
          value={folderIds.filter((id) => expandedFolders.includes(id))}
          onValueChange={(v) => onExpandedFoldersChange(null, folderIds, v)}
          className="flex w-full flex-col gap-0"
        >
          {folders.map((folder) => (
            <FolderItem
              expandedFolders={expandedFolders}
              onExpandedFoldersChange={onExpandedFoldersChange}
              key={folder.id}
              folder={folder}
              workspaceId={workspace.id}
              getFolders={getFolders}
              getDocuments={getDocuments}
              currentId={currentId}
              suppressDocHighlights={suppressDocHighlights}
              onTreeMenuOpenChange={onTreeMenuOpenChange}
              ensureWorkspaceExpanded={ensureWorkspaceExpanded}
              ensureFolderExpanded={ensureFolderExpanded}
              onSelectDocument={onSelectDocument}
              onDeleteDocument={onDeleteDocument}
              onAddFolder={onAddFolder}
              onAddFile={onAddFile}
              onUploadFile={onUploadFile}
              onMoveDocument={onMoveDocument}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameDocument={onRenameDocument}
            />
          ))}
        </Accordion>
      )}
      {documents.map((doc) => (
        <FileItem
          key={doc.id}
          doc={doc}
          isActive={currentId === doc.id}
          suppressDocHighlights={suppressDocHighlights}
          onTreeMenuOpenChange={onTreeMenuOpenChange}
          onSelect={() => onSelectDocument(doc)}
          onDelete={() => onDeleteDocument(doc.id, doc.title)}
          onRename={() => onRenameDocument(doc.id, doc.title)}
          onMoveDocument={onMoveDocument}
        />
      ))}
      {hideWorkspaceHeader && !hasTreeItems && (
        <div className="flex min-h-[min(50vh,12rem)] w-full items-center justify-center px-3 py-6">
          <p className="text-center font-mono text-sm text-muted-foreground" aria-live="polite">
            Nothing to show
          </p>
        </div>
      )}
    </>
  );

  const dropAreaClassName = cn(
    "flex flex-col gap-0.5",
    !hideWorkspaceHeader && "ml-2 pl-2",
    hasTreeItems
      ? "border-l-2 border-[color:var(--sidebar-guide)] pb-0.5 pt-0"
      : "min-h-1 py-0.5"
  );

  if (hideWorkspaceHeader) {
    return (
      <div
        className={cn(
          "flex w-full max-w-full flex-col",
          workspaceHighlighted && DRAG_OVER_CLASS
        )}
        onDragOver={handleWsDragOver}
        onDragLeave={handleWsDragLeave}
        onDrop={handleWsDrop}
      >
        <WorkspaceDropArea
          workspaceId={workspace.id}
          folderId={null}
          onDrop={onMoveDocument}
          onDragTargetActiveChange={setWsContentDragOver}
          className={dropAreaClassName}
        >
          {workspaceTreeInner}
        </WorkspaceDropArea>
      </div>
    );
  }

  return (
    <AccordionItem value={workspace.id} className="group">
        <AccordionTrigger
          triggerVariant="section"
          isActive={workspaceRowActive}
          hideTriggerChevron
          className={cn(
            "group/ws hover:no-underline !border-0 !bg-transparent !p-0 !pl-1 !pr-0 !shadow-none hover:!bg-transparent",
            workspaceHighlighted && DRAG_OVER_CLASS
          )}
          onDragOver={handleWsDragOver}
          onDragLeave={handleWsDragLeave}
          onDrop={handleWsDrop}
        >
          <div
            className={
              workspaceRowActive
                ? WORKSPACE_TAB_CORAL_PILL
                : WORKSPACE_TAB_MUTED_PILL
            }
          >
            <Layers className="size-4 shrink-0 text-inherit" />
            <span className="min-w-0 flex-1 truncate text-left font-heading text-lg">
              {workspace.name}
            </span>
            <div className="group/action ml-1 flex h-5 shrink-0 items-center justify-end gap-1">
              <ChevronRight
                aria-hidden
                className={cn(
                  "pointer-events-none size-[1.125rem] shrink-0 transition-transform duration-200",
                  workspaceRowActive
                    ? "text-inherit"
                    : "text-zinc-600 dark:text-zinc-400",
                  "group-data-[state=open]/ws:rotate-90",
                )}
              />
              <div
                className={cn(
                  "flex h-5 w-0 shrink-0 items-center justify-end overflow-hidden opacity-0 transition-[width,opacity] duration-200",
                  "group-hover/ws:w-5 group-hover/ws:opacity-100",
                  "group-focus-within/action:w-5 group-focus-within/action:opacity-100",
                  workspaceMenuOpen && "w-5 opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
              <DropdownMenu
                open={workspaceMenuOpen}
                onOpenChange={(open) => {
                  setWorkspaceMenuOpen(open);
                  onTreeMenuOpenChange(open);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    title="Workspace actions"
                    aria-label="Workspace actions"
                    className={cn(
                      "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-foreground hover:bg-destructive/20 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !workspaceRowActive && "text-zinc-600 dark:text-zinc-400"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") e.preventDefault();
                    }}
                  >
                    <MoreHorizontal className="size-5 shrink-0" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={4}
                  className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-sidebar p-1 font-heading shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => onAddFolder(workspace.id, null)}>
                    <FolderIcon className="mr-2 size-4" />
                    Add folder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUploadFile(workspace.id, null)}>
                    <FileBraces className="mr-2 size-4" />
                    Upload file
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRenameWorkspace(workspace.id, workspace.name)}>
                    <Pencil className="mr-2 size-4" />
                    Rename
                  </DropdownMenuItem>
                  {!selectedWorkspaceId && (
                    <DropdownMenuItem variant="destructive" onClick={() => onDeleteWorkspace(workspace.id, workspace.name)}>
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent
          className={cn(
            isLastWorkspace
              ? "!p-0"
              : "!mt-0 !px-0 !pt-0 group-data-[state=open]:pb-3 group-data-[state=open]:mb-3"
          )}
        >
          <WorkspaceDropArea
            workspaceId={workspace.id}
            folderId={null}
            onDrop={onMoveDocument}
            onDragTargetActiveChange={setWsContentDragOver}
            className={dropAreaClassName}
          >
            {workspaceTreeInner}
          </WorkspaceDropArea>
        </AccordionContent>
    </AccordionItem>
  );
}

function WorkspaceDropArea({
  workspaceId,
  folderId,
  onDrop,
  onDragTargetActiveChange,
  className,
  children,
}: {
  workspaceId: string;
  folderId: string | null;
  onDrop: (docId: string, workspaceId: string, folderId: string | null) => void;
  /** Highlights the workspace/folder header while dragging over this zone (files, subfolders, etc.). */
  onDragTargetActiveChange?: (active: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Do not stopPropagation so outer workspace root still receives bubbled drags over nested folders.
    e.dataTransfer.dropEffect = "move";
    onDragTargetActiveChange?.(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    onDragTargetActiveChange?.(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragTargetActiveChange?.(false);
    const docId = e.dataTransfer.getData(DRAG_TYPE);
    if (docId) onDrop(docId, workspaceId, folderId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn("transition-colors duration-150", className)}
    >
      {children}
    </div>
  );
}

interface FolderItemProps {
  expandedFolders: string[];
  onExpandedFoldersChange: (parentFolderId: string | null, childIds: string[], newExpanded: string[]) => void;
  folder: Folder;
  workspaceId: string;
  getFolders: (workspaceId: string, parentFolderId: string | null) => Folder[];
  getDocuments: (workspaceId: string, folderId: string | null) => Document[];
  currentId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (id: string, title: string) => void;
  onAddFolder: (workspaceId: string, parentFolderId: string | null) => void;
  onAddFile: (workspaceId: string, folderId: string | null) => void;
  onUploadFile: (workspaceId: string, folderId: string | null) => void;
  onMoveDocument: (docId: string, workspaceId: string, folderId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onRenameDocument: (id: string, title: string) => void;
  suppressDocHighlights: boolean;
  onTreeMenuOpenChange: (open: boolean) => void;
  ensureWorkspaceExpanded: (workspaceId: string) => void;
  ensureFolderExpanded: (folderId: string) => void;
}

function FolderItem({
  expandedFolders,
  onExpandedFoldersChange,
  folder,
  workspaceId,
  getFolders,
  getDocuments,
  currentId,
  suppressDocHighlights,
  onTreeMenuOpenChange,
  ensureWorkspaceExpanded,
  ensureFolderExpanded,
  onSelectDocument,
  onDeleteDocument,
  onAddFolder,
  onAddFile,
  onUploadFile,
  onMoveDocument,
  onRenameFolder,
  onDeleteFolder,
  onRenameDocument,
}: FolderItemProps) {
  const subfolders = getFolders(workspaceId, folder.id);
  const docs = getDocuments(workspaceId, folder.id);
  const subfolderIds = subfolders.map((f) => f.id);

  const [folderDragOver, setFolderDragOver] = useState(false);
  const [folderContentDragOver, setFolderContentDragOver] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  useClearDragStateOnDragEnd(setFolderDragOver);
  useClearDragStateOnDragEnd(setFolderContentDragOver);

  const folderHighlighted = folderDragOver || folderContentDragOver;
  const docActiveInFolder =
    !suppressDocHighlights &&
    containsActiveDoc(workspaceId, folder.id, currentId, getDocuments, getFolders);
  const folderRowActive = docActiveInFolder || folderMenuOpen;

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (isTreeDocumentDrag(e)) {
      ensureWorkspaceExpanded(workspaceId);
      ensureFolderExpanded(folder.id);
    }
    setFolderDragOver(true);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setFolderDragOver(false);
  };

  const handleFolderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderDragOver(false);
    setFolderContentDragOver(false);
    const docId = e.dataTransfer.getData(DRAG_TYPE);
    if (docId) onMoveDocument(docId, workspaceId, folder.id);
  };

  const hasNestedItems = subfolders.length > 0 || docs.length > 0;

  return (
    <AccordionItem value={folder.id} variant="nested">
      <AccordionTrigger
        triggerVariant="tree"
        isActive={folderRowActive}
        hideTriggerChevron
        className={cn(
          "group/folder min-h-8 hover:no-underline !border-0 !bg-transparent !p-0 !pl-1 !pr-0 !shadow-none hover:!bg-transparent",
          folderHighlighted && DRAG_OVER_CLASS
        )}
        onDragOver={handleFolderDragOver}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
      >
        <div
          className={cn(
            "flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-[5px] py-0.5 pl-2 pr-0",
            folderRowActive &&
              !folderHighlighted &&
              "text-primary hover:text-destructive",
            !folderRowActive && "text-muted hover:text-destructive"
          )}
        >
          <FolderIcon className="size-4 shrink-0 text-inherit opacity-90 group-hover/folder:text-destructive" />
          <span className="min-w-0 flex-1 truncate text-left font-heading text-base">
            {folder.name}
          </span>
          <div className="group/action ml-1 flex h-5 shrink-0 items-center justify-end gap-1">
            <ChevronRight
              aria-hidden
              className={cn(
                "pointer-events-none size-[1.125rem] shrink-0 text-inherit transition-transform duration-200",
                "group-data-[state=open]/folder:rotate-90",
              )}
            />
            <div
              className={cn(
                "flex h-5 w-0 shrink-0 items-center justify-end overflow-hidden opacity-0 transition-[width,opacity] duration-200",
                "group-hover/folder:w-5 group-hover/folder:opacity-100",
                "group-focus-within/action:w-5 group-focus-within/action:opacity-100",
                folderMenuOpen && "w-5 opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
            <DropdownMenu
              open={folderMenuOpen}
              onOpenChange={(open) => {
                setFolderMenuOpen(open);
                onTreeMenuOpenChange(open);
              }}
            >
              <DropdownMenuTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  title="Folder actions"
                  aria-label="Folder actions"
                  className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-foreground hover:bg-destructive/20 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") e.preventDefault();
                  }}
                >
                  <MoreHorizontal className="size-5 shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-sidebar p-1 font-heading shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => onAddFolder(workspaceId, folder.id)}>
                  <FolderIcon className="mr-2 size-4" />
                  Add folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUploadFile(workspaceId, folder.id)}>
                  <FileBraces className="mr-2 size-4" />
                  Upload file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRenameFolder(folder.id, folder.name)}>
                  <Pencil className="mr-2 size-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => onDeleteFolder(folder.id, folder.name)}>
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="!p-0">
        <WorkspaceDropArea
          workspaceId={workspaceId}
          folderId={folder.id}
          onDrop={onMoveDocument}
          onDragTargetActiveChange={setFolderContentDragOver}
          className={cn(
            "ml-2 flex flex-col gap-0.5 pl-2",
            hasNestedItems
              ? "border-l-2 border-[color:var(--sidebar-guide)] pb-0.5 pt-0"
              : "min-h-1 py-0.5"
          )}
        >
          {subfolders.length > 0 && (
            <Accordion
              type="multiple"
              key={subfolderIds.join(",")}
              value={subfolderIds.filter((id) => expandedFolders.includes(id))}
              onValueChange={(v) => onExpandedFoldersChange(folder.id, subfolderIds, v)}
              className="flex w-full flex-col gap-0.5"
            >
              {subfolders.map((sub) => (
                <FolderItem
                  key={sub.id}
                  expandedFolders={expandedFolders}
                  onExpandedFoldersChange={onExpandedFoldersChange}
                  folder={sub}
                  workspaceId={workspaceId}
                  getFolders={getFolders}
                  getDocuments={getDocuments}
                  currentId={currentId}
                  suppressDocHighlights={suppressDocHighlights}
                  onTreeMenuOpenChange={onTreeMenuOpenChange}
                  ensureWorkspaceExpanded={ensureWorkspaceExpanded}
                  ensureFolderExpanded={ensureFolderExpanded}
                  onSelectDocument={onSelectDocument}
                  onDeleteDocument={onDeleteDocument}
                  onAddFolder={onAddFolder}
                  onAddFile={onAddFile}
                  onUploadFile={onUploadFile}
                  onMoveDocument={onMoveDocument}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                  onRenameDocument={onRenameDocument}
                />
                ))}
              </Accordion>
            )}
          {docs.map((doc) => (
            <FileItem
              key={doc.id}
              doc={doc}
              isActive={currentId === doc.id}
              suppressDocHighlights={suppressDocHighlights}
              onTreeMenuOpenChange={onTreeMenuOpenChange}
              onSelect={() => onSelectDocument(doc)}
              onDelete={() => onDeleteDocument(doc.id, doc.title)}
              onRename={() => onRenameDocument(doc.id, doc.title)}
              onMoveDocument={onMoveDocument}
            />
          ))}
        </WorkspaceDropArea>
      </AccordionContent>
    </AccordionItem>
  );
}

function FileItem({
  doc,
  isActive,
  suppressDocHighlights,
  onTreeMenuOpenChange,
  onSelect,
  onDelete,
  onRename,
  onMoveDocument,
}: {
  doc: Document;
  isActive: boolean;
  suppressDocHighlights: boolean;
  onTreeMenuOpenChange: (open: boolean) => void;
  onSelect: () => void;
  onDelete: () => void;
  onRename: () => void;
  onMoveDocument: (docId: string, workspaceId: string, folderId: string | null) => void;
}) {
  const displayName = getFirstHeading(doc.content) ?? doc.title;
  const nameTruncated = false;
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileLooksSelected = isActive && !suppressDocHighlights;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, doc.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group/file flex cursor-pointer items-center rounded-md py-0.5 pl-1 pr-0"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-slot='dropdown-menu-trigger']")) {
          onSelect();
        }
      }}
    >
      <div
        className={cn(
          "flex min-h-6 min-w-0 flex-1 items-center gap-2 rounded-[5px] py-0 pl-1 pr-0 hover:text-destructive",
          (fileLooksSelected || fileMenuOpen) && "text-primary"
        )}
      >
        <Tooltip delayDuration={2000}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-6 min-w-0 flex-1 items-center justify-start gap-2 truncate border-0 bg-transparent text-left text-base font-base hover:bg-transparent",
                fileLooksSelected && "font-medium",
                (fileLooksSelected || fileMenuOpen) && "text-primary",
                !(fileLooksSelected || fileMenuOpen) && "text-muted",
                "group-hover/file:text-destructive",
                nameTruncated && "min-w-0"
              )}
            >
              <FileBraces
                className={cn(
                  "size-4 shrink-0 opacity-100 group-hover/file:text-destructive",
                  fileLooksSelected || fileMenuOpen
                    ? "text-primary"
                    : "text-sidebar-foreground"
                )}
              />
              <span className="min-w-0 flex-1 truncate">{displayName}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-md">
            {displayName}
          </TooltipContent>
        </Tooltip>
        <div
          className={cn(
            "ml-1 flex shrink-0 opacity-0 transition-opacity group-hover/file:opacity-100",
            fileMenuOpen && "opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu
            open={fileMenuOpen}
            onOpenChange={(open) => {
              setFileMenuOpen(open);
              onTreeMenuOpenChange(open);
            }}
          >
            <DropdownMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                title="Document actions"
                aria-label="Document actions"
                className={cn(
                  "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 hover:bg-destructive/20 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  fileLooksSelected || fileMenuOpen ? "text-primary" : "text-muted"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") e.preventDefault();
                }}
              >
                <MoreHorizontal className="size-5 shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-sidebar p-1 font-heading shadow-sm"
            >
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

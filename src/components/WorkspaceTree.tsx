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
  FolderIcon,
  FileIcon,
  Trash2,
  Plus,
  MoreHorizontal,
  Pencil,
  Library,
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
  "bg-sidebar-accent/45 ring-1 ring-sidebar-primary/60 ring-inset transition-colors duration-150";

function useClearDragStateOnDragEnd(setDragOver: (v: boolean) => void) {
  useEffect(() => {
    const clear = () => setDragOver(false);
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, [setDragOver]);
}
const EXPANDED_WORKSPACES_KEY = "md-viewer-expanded-workspaces";
const EXPANDED_FOLDERS_KEY = "md-viewer-expanded-folders";

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

  return (
    <Accordion
      type="multiple"
      key={workspaceIds.join(",")}
      value={workspaceValue}
      onValueChange={handleWorkspaceValueChange}
      className="flex w-full max-w-full flex-col gap-2"
    >
      {workspaces.map((ws) => (
        <WorkspaceSection
          key={ws.id}
          workspace={ws}
          expandedFolders={expandedFolders}
          onExpandedFoldersChange={handleExpandedFoldersChange}
          folders={folders(ws.id, null)}
          documents={documents(ws.id, null)}
          getFolders={folders}
          getDocuments={documents}
          currentId={currentId}
          selectedWorkspaceId={selectedWorkspaceId}
          suppressDocHighlights={treeActionMenuOpen}
          onTreeMenuOpenChange={setTreeActionMenuOpen}
          onSelectDocument={onSelectDocument}
          onDeleteDocument={onDeleteDocument}
          onAddFolder={onAddFolder}
          onAddFile={onAddFile}
          onUploadFile={onUploadFile}
          onMoveDocument={onMoveDocument}
          onRenameWorkspace={onRenameWorkspace}
          onDeleteWorkspace={onDeleteWorkspace}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          onRenameDocument={onRenameDocument}
        />
      ))}
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
  suppressDocHighlights,
  onTreeMenuOpenChange,
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
  const workspaceRowActive = docActiveInWorkspace || workspaceMenuOpen;

  const handleWsDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
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

  return (
    <AccordionItem value={workspace.id}>
        <AccordionTrigger
          triggerVariant="section"
          isActive={workspaceRowActive}
          className={cn(
            "group/ws hover:no-underline",
            workspaceHighlighted && DRAG_OVER_CLASS
          )}
          onDragOver={handleWsDragOver}
          onDragLeave={handleWsDragLeave}
          onDrop={handleWsDrop}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Library className="size-4 shrink-0" />
            <span className="min-w-0 truncate text-left font-heading">
              {workspace.name}
            </span>
          </div>
          <div
            className={cn(
              "shrink-0 opacity-0 transition-opacity group-hover/ws:opacity-100",
              workspaceMenuOpen && "opacity-100"
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
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent text-sidebar-foreground transition-opacity hover:border-sidebar-border/40 hover:bg-sidebar-accent/80"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") e.preventDefault();
                  }}
                >
                  <MoreHorizontal className="size-3.5" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                alignOffset={-20}
                sideOffset={8}
                avoidCollisions={false}
                className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-sidebar p-1 -mr-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => onAddFolder(workspace.id, null)}>
                  <FolderIcon className="mr-2 size-4" />
                  Add folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUploadFile(workspace.id, null)}>
                  <FileIcon className="mr-2 size-4" />
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
        </AccordionTrigger>
        <AccordionContent className="!p-0">
          <WorkspaceDropArea
            workspaceId={workspace.id}
            folderId={null}
            onDrop={onMoveDocument}
            onDragTargetActiveChange={setWsContentDragOver}
            className={cn(
              "ml-2 flex flex-col gap-1 pl-2",
              hasTreeItems
                ? "border-l-2 border-[color:var(--sidebar-guide)] pb-1.5 pt-2"
                : "min-h-2 py-1"
            )}
          >
            {folders.length > 0 && (
              <Accordion
                type="multiple"
                key={folderIds.join(",")}
                value={folderIds.filter((id) => expandedFolders.includes(id))}
                onValueChange={(v) => onExpandedFoldersChange(null, folderIds, v)}
                className="flex w-full flex-col gap-1.5"
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
        className={cn(
          "group/folder min-h-9 py-1.5 hover:no-underline",
          folderHighlighted && DRAG_OVER_CLASS
        )}
        onDragOver={handleFolderDragOver}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FolderIcon className="size-4 shrink-0 text-sidebar-foreground opacity-90" />
          <span className="min-w-0 truncate text-left font-heading font-semibold group-data-[state=open]/folder:font-bold">
            {folder.name}
          </span>
        </div>
        <div
          className={cn(
            "shrink-0 opacity-0 transition-opacity group-hover/folder:opacity-100",
            folderMenuOpen && "opacity-100"
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
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent text-sidebar-foreground transition-opacity hover:border-sidebar-border/40 hover:bg-sidebar-accent/80 group-data-[state=open]/folder:text-sidebar-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") e.preventDefault();
                }}
              >
                <MoreHorizontal className="size-3.5" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              alignOffset={-15}
              sideOffset={4}
              avoidCollisions={false}
              className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-sidebar p-1 font-heading shadow-sm -mr-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => onAddFolder(workspaceId, folder.id)}>
                <FolderIcon className="mr-2 size-4" />
                Add folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUploadFile(workspaceId, folder.id)}>
                <FileIcon className="mr-2 size-4" />
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
      </AccordionTrigger>
      <AccordionContent className="!p-0">
        <WorkspaceDropArea
          workspaceId={workspaceId}
          folderId={folder.id}
          onDrop={onMoveDocument}
          onDragTargetActiveChange={setFolderContentDragOver}
          className={cn(
            "ml-2 flex flex-col gap-1 pl-2",
            hasNestedItems
              ? "border-l-2 border-[color:var(--sidebar-guide)] pb-1.5 pt-2"
              : "min-h-2 py-1"
          )}
        >
          {subfolders.length > 0 && (
            <Accordion
              type="multiple"
              key={subfolderIds.join(",")}
              value={subfolderIds.filter((id) => expandedFolders.includes(id))}
              onValueChange={(v) => onExpandedFoldersChange(folder.id, subfolderIds, v)}
              className="flex w-full flex-col gap-1.5"
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
      className={cn(
        "group flex cursor-pointer items-center rounded-md gap-1 py-1 pl-1 pr-1",
        fileLooksSelected || fileMenuOpen
          ? "bg-sidebar-primary/20"
          : "hover:bg-sidebar-primary/20"
      )}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-slot='dropdown-menu-trigger']")) {
          onSelect();
        }
      }}
    >
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-auto min-h-7 min-w-0 flex-1 items-center justify-start gap-2 truncate rounded-md border-0 bg-transparent px-1 text-left text-sm font-base hover:bg-transparent",
              fileLooksSelected && "font-medium text-muted",
              !fileLooksSelected && "text-muted",
              nameTruncated && "min-w-0"
            )}
          >
            <FileIcon
              className={cn(
                "size-4 shrink-0 text-sidebar-foreground opacity-100",
                fileLooksSelected && "opacity-100"
              )}
            />
            <span className="min-w-0 flex-1 truncate">{displayName}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="max-w-md">
          {displayName}
        </TooltipContent>
      </Tooltip>
      <div className="ml-auto shrink-0">
        <DropdownMenu
          open={fileMenuOpen}
          onOpenChange={(open) => {
            setFileMenuOpen(open);
            onTreeMenuOpenChange(open);
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent text-sidebar-foreground transition-opacity hover:border-sidebar-border/40 hover:bg-sidebar-accent/80"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            alignOffset={10}
            sideOffset={4}
            avoidCollisions={false}
            className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-sidebar p-1 font-heading shadow-sm -mr-2.5"
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
  );
}

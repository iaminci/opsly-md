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

const DRAG_TYPE = "application/x-md-viewer-document";
const EXPANDED_WORKSPACES_KEY = "md-viewer-expanded-workspaces";
const EXPANDED_FOLDERS_KEY = "md-viewer-expanded-folders";

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

  return (
    <div className="flex flex-col gap-0">
      <Accordion
        type="multiple"
        key={workspaceIds.join(",")}
        value={workspaceValue}
        onValueChange={handleWorkspaceValueChange}
        className="w-full max-w-full"
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
    </div>
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
  const folderIds = folders.map((f) => f.id);

  const handleWsDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setWsDragOver(true);
  };

  const handleWsDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setWsDragOver(false);
  };

  const handleWsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWsDragOver(false);
    const docId = e.dataTransfer.getData(DRAG_TYPE);
    if (docId) onMoveDocument(docId, workspace.id, null);
  };

  return (
    <AccordionItem value={workspace.id}>
        <AccordionTrigger
          triggerVariant="section"
          className={cn(
            "group/ws hover:no-underline",
            wsDragOver && "ring-2 ring-sidebar-primary ring-inset"
          )}
          onDragOver={handleWsDragOver}
          onDragLeave={handleWsDragLeave}
          onDrop={handleWsDrop}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Library className="size-4 shrink-0 text-sidebar-primary-foreground" />
            <span className="truncate text-left font-heading font-bold">
              {workspace.name}
            </span>
          </div>
          <div className="shrink-0 opacity-0 transition-opacity group-hover/ws:opacity-100" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                nativeButton={false}
                render={
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent text-sidebar-primary-foreground/90 transition-opacity hover:bg-black/10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") e.preventDefault();
                    }}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </div>
                }
              />
              <DropdownMenuContent
                align="end"
                className="rounded-lg border border-sidebar-border/80 bg-sidebar font-heading shadow-sm"
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
            className="flex flex-col gap-0 border-l border-[color:var(--sidebar-guide)] ml-4 pb-1 pl-3 pt-1"
          >
            {folders.length > 0 && (
              <Accordion
                type="multiple"
                key={folderIds.join(",")}
                value={folderIds.filter((id) => expandedFolders.includes(id))}
                onValueChange={(v) => onExpandedFoldersChange(null, folderIds, v)}
                className="w-full"
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
  className,
  children,
}: {
  workspaceId: string;
  folderId: string | null;
  onDrop: (docId: string, workspaceId: string, folderId: string | null) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const docId = e.dataTransfer.getData(DRAG_TYPE);
    if (docId) onDrop(docId, workspaceId, folderId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "rounded-base transition-all duration-150",
        isDragOver && "bg-sidebar-accent/40 ring-2 ring-sidebar-primary ring-inset",
        className
      )}
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
}

function FolderItem({
  expandedFolders,
  onExpandedFoldersChange,
  folder,
  workspaceId,
  getFolders,
  getDocuments,
  currentId,
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

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setFolderDragOver(true);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setFolderDragOver(false);
  };

  const handleFolderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderDragOver(false);
    const docId = e.dataTransfer.getData(DRAG_TYPE);
    if (docId) onMoveDocument(docId, workspaceId, folder.id);
  };

  return (
    <AccordionItem value={folder.id} variant="nested">
      <AccordionTrigger
        triggerVariant="tree"
        className={cn(
          "group/folder min-h-9 py-1.5 hover:no-underline",
          folderDragOver && "ring-2 ring-sidebar-primary ring-inset"
        )}
        onDragOver={handleFolderDragOver}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FolderIcon className="size-4 shrink-0 text-sidebar-foreground opacity-90" />
          <span className="truncate text-left font-heading font-semibold group-data-[state=open]/folder:font-bold">
            {folder.name}
          </span>
        </div>
        <div className="shrink-0 opacity-0 transition-opacity group-hover/folder:opacity-100" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
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
              }
            />
            <DropdownMenuContent
              align="end"
              className="rounded-lg border border-sidebar-border/80 bg-sidebar font-heading shadow-sm"
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
          className="flex flex-col gap-0 border-l border-[color:var(--sidebar-guide)] ml-2 pb-1 pl-3 pt-0.5"
        >
          {subfolders.length > 0 && (
            <Accordion
              type="multiple"
              key={subfolderIds.join(",")}
              value={subfolderIds.filter((id) => expandedFolders.includes(id))}
              onValueChange={(v) => onExpandedFoldersChange(folder.id, subfolderIds, v)}
              className="w-full"
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
  onSelect,
  onDelete,
  onRename,
  onMoveDocument,
}: {
  doc: Document;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: () => void;
  onMoveDocument: (docId: string, workspaceId: string, folderId: string | null) => void;
}) {
  const displayName = getFirstHeading(doc.content) ?? doc.title;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, doc.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group flex cursor-pointer items-center gap-1 rounded-md py-1.5 pl-1 pr-1 transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/60"
      )}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-slot='dropdown-menu-trigger']")) {
          onSelect();
        }
      }}
    >
      <button
        type="button"
        className={cn(
          "flex h-auto min-h-7 min-w-0 flex-1 items-center justify-start gap-2 truncate rounded-md border-0 bg-transparent px-1.5 text-left text-sm font-normal hover:bg-transparent",
          isActive && "font-medium text-sidebar-foreground",
          !isActive && "text-sidebar-foreground"
        )}
      >
        <FileIcon
          className={cn(
            "size-4 shrink-0 text-sidebar-foreground opacity-80",
            isActive && "opacity-100"
          )}
        />
        <span className="truncate" title={displayName}>
          {displayName}
        </span>
      </button>
      <div className="ml-auto shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex size-6 shrink-0 items-center justify-center rounded-md bg-transparent text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            }
          />
          <DropdownMenuContent
            align="end"
            className="rounded-lg border border-sidebar-border/80 bg-sidebar font-heading shadow-sm"
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

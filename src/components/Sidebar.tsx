"use client";

import { useRef, useState, useEffect } from "react";
import type { Document } from "@/types/document";
import { WorkspaceTree } from "./WorkspaceTree";
import { Search } from "./Search";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  getWorkspaces,
  getAllFolders,
  getDocuments,
  addWorkspace,
  addFolder,
  addDocument,
  moveDocument,
  moveFolder,
  updateWorkspace,
  updateFolder,
  updateDocument,
  deleteWorkspace,
  deleteFolder,
  deleteAllData,
  exportWorkspaceData,
  exportAllWorkspacesData,
  exportWorkspacesData,
  importWorkspaceData,
  importAllWorkspacesData,
  DuplicateNameError,
  type WorkspaceExport,
  type AllWorkspacesExport,
} from "@/lib/storage";
import { CreateNameDialog } from "./CreateNameDialog";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Download, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { CommandPalette } from "./CommandPalette";
import { cn, getFirstHeading } from "@/lib/utils";

/** Outside-click / pointer-dismiss: `contains(target)` misses retargeting; composedPath matches Radix/portals reliably. */
function isPointerEventInside(container: HTMLElement | null, nativeEvent: Event): boolean {
  if (!container) return false;
  if (typeof nativeEvent.composedPath === "function") {
    for (const n of nativeEvent.composedPath()) {
      if (n instanceof Node && container.contains(n)) return true;
    }
    return false;
  }
  const t = nativeEvent.target;
  return t instanceof Node && container.contains(t);
}

interface SidebarProps {
  documents: Document[];
  currentId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  onAddDocument: (title: string, content: string, workspaceId?: string, folderId?: string | null) => void;
  onRefresh: () => void;
}

export function Sidebar({
  documents,
  currentId,
  onSelectDocument,
  onDeleteDocument,
  onAddDocument,
  onRefresh,
}: SidebarProps) {
  const { setOpen } = useSidebar();
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogTarget, setFolderDialogTarget] = useState<{
    workspaceId: string;
    parentFolderId: string | null;
  } | null>(null);
  const [renameWorkspaceOpen, setRenameWorkspaceOpen] = useState(false);
  const [renameWorkspaceTarget, setRenameWorkspaceTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderTarget, setRenameFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameDocOpen, setRenameDocOpen] = useState(false);
  const [renameDocTarget, setRenameDocTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteWorkspaceDialogOpen, setDeleteWorkspaceDialogOpen] = useState(false);
  const [deleteWorkspaceTarget, setDeleteWorkspaceTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState<{ id: string; title: string } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportConfirmDialogOpen, setExportConfirmDialogOpen] = useState(false);
  const [exportSelectedIds, setExportSelectedIds] = useState<Set<string>>(new Set());
  const [workspaces, setWorkspaces] = useState<Awaited<ReturnType<typeof getWorkspaces>>>([]);
  const [foldersByWorkspace, setFoldersByWorkspace] = useState<
    Map<string, Awaited<ReturnType<typeof getAllFolders>>>
  >(new Map());
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspaceSwitcherMenuOpen, setWorkspaceSwitcherMenuOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{
    workspaceId: string;
    folderId: string | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const WORKSPACE_KEY = "md-viewer-current-workspace";

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const el = moreMenuRef.current;
      if (!el || isPointerEventInside(el, e)) return;
      setMoreMenuOpen(false);
    };
    // Capture on window + pointerdown: covers touch/pen and runs before target handlers that stop propagation.
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => window.removeEventListener("pointerdown", handlePointerDown, true);
  }, [moreMenuOpen]);

  const sortedWorkspaces = [...workspaces].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
  const displayedWorkspaces = selectedWorkspaceId
    ? sortedWorkspaces.filter((w) => w.id === selectedWorkspaceId)
    : sortedWorkspaces;

  const searchDocuments = selectedWorkspaceId
    ? documents.filter((d) => d.workspaceId === selectedWorkspaceId)
    : documents;

  const refreshTreeData = async () => {
    const [ws, docs] = await Promise.all([getWorkspaces(), getDocuments()]);
    setWorkspaces(ws);
    setAllDocuments(docs);
    const folderMap = new Map<string, Awaited<ReturnType<typeof getAllFolders>>>();
    await Promise.all(
      ws.map(async (w) => {
        const folders = await getAllFolders(w.id);
        folderMap.set(w.id, folders);
      })
    );
    setFoldersByWorkspace(folderMap);
    if (typeof window !== "undefined") {
      setSelectedWorkspaceId((prev) => {
        if (prev !== null && prev !== undefined) return prev;
        const stored = localStorage.getItem(WORKSPACE_KEY);
        if (stored === "") return null;
        if (stored && ws.some((w) => w.id === stored)) return stored;
        return null;
      });
    }
  };

  const getFoldersSync = (workspaceId: string, parentFolderId: string | null) => {
    const folders = foldersByWorkspace.get(workspaceId) ?? [];
    return folders.filter(
      (f) =>
        (parentFolderId === null && f.parentFolderId === null) ||
        (parentFolderId !== null && f.parentFolderId === parentFolderId)
    );
  };

  const getDocumentsSync = (workspaceId: string, folderId: string | null) => {
    return allDocuments.filter(
      (d) =>
        d.workspaceId === workspaceId &&
        (folderId === null ? d.folderId === null : d.folderId === folderId)
    );
  };

  useEffect(() => {
    refreshTreeData();
  }, [documents]);

  const handleUploadFile = (workspaceId: string, folderId: string | null) => {
    setUploadTarget({ workspaceId, folderId });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const target = uploadTarget ?? {
      workspaceId: selectedWorkspaceId ?? "default",
      folderId: null,
    };
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
    const title = file.name.replace(/\.(md|markdown)$/i, "") || "Untitled";
    await onAddDocument(title, content, target.workspaceId, target.folderId);
    setUploadTarget(null);
    e.target.value = "";
  };

  const handleWorkspaceSelect = (id: string | null) => {
    setSelectedWorkspaceId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(WORKSPACE_KEY, id ?? "");
    }
  };

  const handleAddWorkspace = () => setWorkspaceDialogOpen(true);

  const handleWorkspaceSubmit = async (name: string) => {
    await addWorkspace(name);
    await refreshTreeData();
    onRefresh();
  };

  const handleAddFolder = (workspaceId: string, parentFolderId: string | null) => {
    setFolderDialogTarget({ workspaceId, parentFolderId });
    setFolderDialogOpen(true);
  };

  const handleFolderSubmit = async (name: string) => {
    if (!folderDialogTarget) return;
    await addFolder(folderDialogTarget.workspaceId, name, folderDialogTarget.parentFolderId);
    setFolderDialogTarget(null);
    await refreshTreeData();
    onRefresh();
  };

  const handleMoveDocument = async (
    docId: string,
    workspaceId: string,
    folderId: string | null
  ) => {
    await moveDocument(docId, workspaceId, folderId);
    await refreshTreeData();
    onRefresh();
  };

  const handleMoveFolder = async (
    folderId: string,
    workspaceId: string,
    parentFolderId: string | null
  ) => {
    try {
      const result = await moveFolder(folderId, workspaceId, parentFolderId);
      if (result) {
        await refreshTreeData();
        onRefresh();
      }
    } catch (err) {
      if (err instanceof DuplicateNameError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to move folder.");
      }
    }
  };

  const handleAddFile = async (workspaceId: string, folderId: string | null) => {
    try {
      const doc = await addDocument(
        { title: "Untitled", content: "", workspaceId, folderId },
        { workspaceId, folderId }
      );
      await refreshTreeData();
      onRefresh();
      onSelectDocument(doc);
    } catch (err) {
      if (err instanceof DuplicateNameError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to create file.");
      }
    }
  };

  const handleRenameWorkspace = (id: string, name: string) => {
    setRenameWorkspaceTarget({ id, name });
    setRenameWorkspaceOpen(true);
  };

  const handleRenameWorkspaceSubmit = async (name: string) => {
    if (!renameWorkspaceTarget) return;
    await updateWorkspace(renameWorkspaceTarget.id, name);
    setRenameWorkspaceTarget(null);
    await refreshTreeData();
    onRefresh();
  };

  const handleDeleteWorkspaceRequest = (id: string, name: string) => {
    setDeleteWorkspaceTarget({ id, name });
    setDeleteWorkspaceDialogOpen(true);
  };

  const handleDeleteWorkspaceConfirm = async () => {
    if (!deleteWorkspaceTarget) return;
    await deleteWorkspace(deleteWorkspaceTarget.id);
    setDeleteWorkspaceTarget(null);
    setDeleteWorkspaceDialogOpen(false);
    await refreshTreeData();
    onRefresh();
  };

  const handleDeleteAllClick = () => setDeleteAllDialogOpen(true);

  const handleDeleteAllConfirm = async () => {
    if (selectedWorkspaceId) {
      await deleteWorkspace(selectedWorkspaceId);
      setSelectedWorkspaceId(null);
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKSPACE_KEY, "");
      }
    } else {
      await deleteAllData();
      setSelectedWorkspaceId(null);
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKSPACE_KEY, "");
      }
    }
    setDeleteAllDialogOpen(false);
    await refreshTreeData();
    onRefresh();
  };

  const handleExportClick = () => {
    if (selectedWorkspaceId) {
      setExportConfirmDialogOpen(true);
    } else {
      setExportSelectedIds(new Set(sortedWorkspaces.map((w) => w.id)));
      setExportDialogOpen(true);
    }
  };

  const handleExportConfirm = async () => {
    if (selectedWorkspaceId) {
      await handleExportWorkspace(selectedWorkspaceId);
      setExportConfirmDialogOpen(false);
    }
  };

  const handleExportWorkspace = async (workspaceId: string) => {
    const data = await exportWorkspaceData(workspaceId);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const filename = `${data.workspace.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}-export.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSelected = async () => {
    const ids = Array.from(exportSelectedIds);
    if (ids.length === 0) return;
    const data =
      ids.length === sortedWorkspaces.length
        ? await exportAllWorkspacesData()
        : await exportWorkspacesData(ids);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const filename =
      ids.length === sortedWorkspaces.length
        ? "all-workspaces-export.json"
        : "workspaces-export.json";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  };

  const toggleExportWorkspace = (id: string) => {
    setExportSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExportSelectAll = () => {
    if (exportSelectedIds.size === sortedWorkspaces.length) {
      setExportSelectedIds(new Set());
    } else {
      setExportSelectedIds(new Set(sortedWorkspaces.map((w) => w.id)));
    }
  };

  const handleImportWorkspace = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;
      if (!data || typeof data !== "object" || !("version" in data)) {
        throw new Error("Invalid workspace export file");
      }
      if ("type" in data && data.type === "all" && "workspaces" in data && Array.isArray(data.workspaces)) {
        const imported = await importAllWorkspacesData(data as AllWorkspacesExport);
        if (imported.length > 0) {
          setSelectedWorkspaceId(imported[0].id);
          if (typeof window !== "undefined") {
            localStorage.setItem(WORKSPACE_KEY, imported[0].id);
          }
        }
      } else if (
        "workspace" in data &&
        "folders" in data &&
        "documents" in data &&
        Array.isArray((data as WorkspaceExport).folders) &&
        Array.isArray((data as WorkspaceExport).documents)
      ) {
        const result = await importWorkspaceData(data as WorkspaceExport);
        if (result) {
          setSelectedWorkspaceId(result.workspace.id);
          if (typeof window !== "undefined") {
            localStorage.setItem(WORKSPACE_KEY, result.workspace.id);
          }
        }
      } else {
        throw new Error("Invalid workspace export file");
      }
      await refreshTreeData();
      onRefresh();
    } catch {
      toast.error("Failed to import workspace. The file may be invalid or corrupted.");
    }
    e.target.value = "";
  };

  const handleRenameFolder = (id: string, name: string) => {
    setRenameFolderTarget({ id, name });
    setRenameFolderOpen(true);
  };

  const handleRenameFolderSubmit = async (name: string) => {
    if (!renameFolderTarget) return;
    await updateFolder(renameFolderTarget.id, name);
    setRenameFolderTarget(null);
    await refreshTreeData();
    onRefresh();
  };

  const handleDeleteFolderRequest = (id: string, name: string) => {
    setDeleteFolderTarget({ id, name });
    setDeleteFolderDialogOpen(true);
  };

  const handleDeleteFolderConfirm = async () => {
    if (!deleteFolderTarget) return;
    await deleteFolder(deleteFolderTarget.id);
    setDeleteFolderTarget(null);
    setDeleteFolderDialogOpen(false);
    await refreshTreeData();
    onRefresh();
  };

  const handleDeleteDocumentRequest = (id: string, title: string) => {
    setDeleteDocTarget({ id, title });
    setDeleteDocDialogOpen(true);
  };

  const handleDeleteDocumentConfirm = async () => {
    if (!deleteDocTarget) return;
    await onDeleteDocument(deleteDocTarget.id);
    setDeleteDocTarget(null);
    setDeleteDocDialogOpen(false);
    await refreshTreeData();
    onRefresh();
  };

  const handleRenameDocument = (id: string, title: string) => {
    setRenameDocTarget({ id, title });
    setRenameDocOpen(true);
  };

  const handleRenameDocumentSubmit = async (title: string) => {
    if (!renameDocTarget) return;
    await updateDocument(renameDocTarget.id, { title });
    setRenameDocTarget(null);
    await refreshTreeData();
    onRefresh();
  };

  const selectedWorkspaceName = selectedWorkspaceId
    ? sortedWorkspaces.find((w) => w.id === selectedWorkspaceId)?.name ?? "workspace"
    : null;

  return (
    <ShadcnSidebar collapsible="offcanvas" className="print:hidden border-r-2 border-sidebar-border">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFileChange}
        className="hidden"
      />
      <SidebarContent className="flex flex-col min-h-0 overflow-hidden">
        <div
          className="flex flex-1 min-h-0 flex-col"
          onPointerDownCapture={(e) => {
            if (!moreMenuOpen) return;
            const menu = moreMenuRef.current;
            if (!menu || isPointerEventInside(menu, e.nativeEvent)) return;
            setMoreMenuOpen(false);
          }}
        >
        <div className="flex shrink-0 flex-col border-b-0 border-sidebar-border pb-0">
          <SidebarGroup>
            <SidebarGroupLabel className="sr-only">Search and paste</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="grid min-w-0 grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-2 items-center">
                <div className="min-w-0">
                  <Search documents={searchDocuments} onSelect={onSelectDocument} />
                </div>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  className="h-9 w-full min-w-0 justify-center whitespace-nowrap px-3 text-foreground hover:text-primary-hover"
                  onClick={() => setShowPaste(true)}
                >
                  Create
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div className="mb-2 shrink-0 flex flex-col pt-2">
          <SidebarGroup>
            <SidebarGroupLabel className="sr-only">Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <WorkspaceSwitcher
                workspaces={sortedWorkspaces}
                selectedId={selectedWorkspaceId}
                onSelect={handleWorkspaceSelect}
                onAddWorkspace={handleAddWorkspace}
                onWorkspaceMenuOpenChange={setWorkspaceSwitcherMenuOpen}
                onAddFolder={handleAddFolder}
                onUploadFile={handleUploadFile}
                onRenameWorkspace={handleRenameWorkspace}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarGroup className="flex-1 border-b-0">
            <SidebarGroupContent className="-translate-x-[5px]">
              <WorkspaceTree
              workspaces={displayedWorkspaces}
              folders={getFoldersSync}
              documents={getDocumentsSync}
              currentId={currentId}
              selectedWorkspaceId={selectedWorkspaceId}
              workspaceSwitcherMenuOpen={workspaceSwitcherMenuOpen}
              onSelectDocument={onSelectDocument}
              onDeleteDocument={handleDeleteDocumentRequest}
              onAddWorkspace={handleAddWorkspace}
              onAddFolder={handleAddFolder}
              onAddFile={handleAddFile}
              onUploadFile={handleUploadFile}
              onMoveDocument={handleMoveDocument}
              onMoveFolder={handleMoveFolder}
              onRenameWorkspace={handleRenameWorkspace}
              onDeleteWorkspace={handleDeleteWorkspaceRequest}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolderRequest}
              onRenameDocument={handleRenameDocument}
            />
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div ref={moreMenuRef} className="shrink-0 border-t-0 px-2 py-2">
          <Collapsible
            open={moreMenuOpen}
            onOpenChange={setMoreMenuOpen}
            className="flex w-full min-w-0 flex-col-reverse"
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                className="w-full min-w-0 shrink-0 gap-2 text-foreground hover:text-background bg-background hover:bg-primary/80"
                title="Import, export, delete"
              >
                Advanced Options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="mb-1.5 box-border w-full min-w-0 rounded-base border-2 border-border bg-sidebar p-1.5 shadow-none">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="grid min-w-0 grid-cols-2 gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-w-0 justify-center rounded-base border-2 border-foreground text-primary hover:border-border hover:bg-primary/90 hover:text-background"
                      title="Import workspace"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        window.setTimeout(() => importInputRef.current?.click(), 0);
                      }}
                    >
                      <Upload className="size-4 shrink-0" />
                      Import
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-w-0 justify-center rounded-base border-2 border-foreground text-primary hover:border-border hover:bg-primary/90 hover:text-background"
                      title={selectedWorkspaceId ? "Export workspace" : "Export all workspaces"}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleExportClick();
                      }}
                    >
                      <Download className="size-4 shrink-0" />
                      Export
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full min-w-0 justify-center rounded-base border-2 border-foreground text-foreground bg-background hover:border-border hover:bg-destructive hover:text-background focus-visible:ring-destructive [&_svg]:text-foreground hover:[&_svg]:text-background"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      handleDeleteAllClick();
                    }}
                    title={
                      selectedWorkspaceId
                        ? `Delete workspace and all its contents`
                        : "Delete all workspaces, folders, and documents"
                    }
                  >
                    <Trash2 className="size-4 shrink-0" />
                    {selectedWorkspaceId ? "Delete Workspace" : "Delete Everything"}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        </div>
      </SidebarContent>

      <CreateNameDialog
        open={workspaceDialogOpen}
        onOpenChange={setWorkspaceDialogOpen}
        title="New workspace"
        placeholder="Workspace name"
        defaultValue="New Workspace"
        closeButtonClassName="hover:text-destructive"
        onSubmit={handleWorkspaceSubmit}
      />
      <CreateNameDialog
        open={folderDialogOpen}
        onOpenChange={(open) => {
          setFolderDialogOpen(open);
          if (!open) setFolderDialogTarget(null);
        }}
        title="New folder"
        placeholder="Folder name"
        defaultValue="New Folder"
        closeButtonClassName="hover:text-destructive"
        onSubmit={handleFolderSubmit}
      />
      <CreateNameDialog
        open={renameWorkspaceOpen}
        onOpenChange={(open) => {
          setRenameWorkspaceOpen(open);
          if (!open) setRenameWorkspaceTarget(null);
        }}
        title="Rename workspace"
        placeholder="Workspace name"
        defaultValue={renameWorkspaceTarget?.name ?? ""}
        submitLabel="Rename"
        closeButtonClassName="hover:text-destructive"
        onSubmit={handleRenameWorkspaceSubmit}
      />
      <CreateNameDialog
        open={renameFolderOpen}
        onOpenChange={(open) => {
          setRenameFolderOpen(open);
          if (!open) setRenameFolderTarget(null);
        }}
        title="Rename folder"
        placeholder="Folder name"
        defaultValue={renameFolderTarget?.name ?? ""}
        submitLabel="Rename"
        closeButtonClassName="hover:text-destructive"
        onSubmit={handleRenameFolderSubmit}
      />
      <CreateNameDialog
        open={renameDocOpen}
        onOpenChange={(open) => {
          setRenameDocOpen(open);
          if (!open) setRenameDocTarget(null);
        }}
        title="Rename document"
        placeholder="Document title"
        defaultValue={renameDocTarget?.title ?? ""}
        submitLabel="Rename"
        closeButtonClassName="hover:text-destructive"
        onSubmit={handleRenameDocumentSubmit}
      />

      <Dialog open={showPaste} onOpenChange={(open) => { setShowPaste(open); if (!open) setPasteValue(""); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col shadow-xl ring-1 ring-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Paste Markdown</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 py-2">
            <Textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="Paste markdown here..."
              className="field-sizing-fixed min-h-[50vh] max-h-[60vh] w-full resize-y overflow-y-auto font-mono text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="neutral" className="text-primary hover:text-primary-hover"onClick={() => { setShowPaste(false); setPasteValue(""); }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const trimmed = pasteValue.trim();
                if (!trimmed) return;
                const title = getFirstHeading(trimmed) ?? (trimmed.split("\n")[0]?.trim() || "Untitled");
                await onAddDocument(title, trimmed, selectedWorkspaceId ?? undefined, null);
                setPasteValue("");
                setShowPaste(false);
              }}
              disabled={!pasteValue.trim()}
              className="bg-primary/90 text-background hover:bg-primary/90"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={exportConfirmDialogOpen} onOpenChange={setExportConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Export &quot;{selectedWorkspaceName}&quot; as a JSON file? This will include the
              workspace, all folders, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleExportConfirm()}>
              Export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedWorkspaceId
                ? `Delete "${selectedWorkspaceName}" and all its contents?`
                : "Delete all workspaces, folders, and documents?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedWorkspaceId ? (
                <>
                  This will permanently delete the workspace "{selectedWorkspaceName}" and everything
                  inside it (folders and documents). This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete all workspaces, folders, and documents. A default empty
                  workspace will be created. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                void handleDeleteAllConfirm();
              }}
            >
              {selectedWorkspaceId ? "Delete Workspace" : "Delete Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteWorkspaceDialogOpen}
        onOpenChange={(open) => {
          setDeleteWorkspaceDialogOpen(open);
          if (!open) setDeleteWorkspaceTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deleteWorkspaceTarget?.name}&quot; and all its contents?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace and everything inside it (folders and
              documents). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                void handleDeleteWorkspaceConfirm();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteFolderDialogOpen}
        onOpenChange={(open) => {
          setDeleteFolderDialogOpen(open);
          if (!open) setDeleteFolderTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete folder &quot;{deleteFolderTarget?.name}&quot; and all its contents?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the folder and everything inside it. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                void handleDeleteFolderConfirm();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDocDialogOpen}
        onOpenChange={(open) => {
          setDeleteDocDialogOpen(open);
          if (!open) setDeleteDocTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete file &quot;{deleteDocTarget?.title}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                void handleDeleteDocumentConfirm();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Export workspaces</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <label className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-primary/90">
              <Checkbox
                checked={
                  sortedWorkspaces.length > 0 &&
                  exportSelectedIds.size === sortedWorkspaces.length
                }
                onCheckedChange={toggleExportSelectAll}
                className="data-checked:border-main/20 data-checked:bg-primary/90"
              />
              <span className="text-sm font-medium">Select all</span>
            </label>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1 border border-2 rounded-md p-2">
              {sortedWorkspaces.map((ws) => (
                <label
                  key={ws.id}
                  className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-primary/90"
                >
                  <Checkbox
                    checked={exportSelectedIds.has(ws.id)}
                    onCheckedChange={() => toggleExportWorkspace(ws.id)}
                    className="data-checked:border-main/20 data-checked:bg-primary/90"
                  />
                  <span className="text-sm truncate">{ws.name}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="neutral" className="text-primary hover:text-primary-hover" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleExportSelected()}
              disabled={exportSelectedIds.size === 0}
              className="bg-primary/90 text-background hover:bg-primary/90"
            >
              Export {exportSelectedIds.size > 0 ? `(${exportSelectedIds.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        handlers={{
          onCreateDocument: () =>
            handleAddFile(
              selectedWorkspaceId ?? sortedWorkspaces[0]?.id ?? "default",
              null
            ),
          onCreateFolder: () =>
            handleAddFolder(
              selectedWorkspaceId ?? sortedWorkspaces[0]?.id ?? "default",
              null
            ),
          onSearchDocuments: () => setOpen(true),
          onSwitchWorkspace: () => setOpen(true),
          onExportWorkspace: handleExportClick,
          onImportWorkspace: handleImportWorkspace,
        }}
      />
    </ShadcnSidebar>
  );
}

function PasteInput({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const firstLine = trimmed.split("\n")[0]?.trim() || "";
    const title = firstLine || "Untitled";
    onSubmit(title, trimmed);
    setValue("");
    onClose();
  };

  return (
    <Card className="mt-3 rounded-xl shadow-sm ring-1 ring-main/20 ">
      <CardContent className="pt-4">
        <Textarea
          placeholder="Paste markdown here..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          className="mb-2 border-main focus-visible:border-main focus-visible:ring-main/20"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="neutral" className="text-primary hover:text-primary-hover" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="bg-primary/90 text-background hover:bg-primary/90"
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

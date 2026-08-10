"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  FilePlus,
  Layers,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  TREE_DRAG_DOCUMENT_TYPE as DRAG_TYPE,
  TREE_DRAG_FOLDER_TYPE as DRAG_TYPE_FOLDER,
  isTreeDrag,
  setTreeDocumentDragData,
} from "@/lib/workspace-tree-drag";
import { InlineTreeCreateRow } from "@/components/InlineTreeCreateRow";

export type PendingTreeCreate =
  | {
      type: "folder" | "file";
      workspaceId: string;
      parentFolderId: string | null;
    }
  | {
      type: "workspace";
      inlineTarget: "switcher-dropdown";
    };

export type PendingTreeRename =
  | {
      type: "file";
      id: string;
      workspaceId: string;
      folderId: string | null;
      initialName: string;
    }
  | {
      type: "folder";
      id: string;
      workspaceId: string;
      parentFolderId: string | null;
      initialName: string;
    }
  | {
      type: "workspace";
      id: string;
      initialName: string;
      inlineTarget: "tree" | "switcher-dropdown";
    };

function matchesPendingTreeCreate(
  pending: PendingTreeCreate | null | undefined,
  workspaceId: string,
  parentFolderId: string | null,
  type: "folder" | "file"
) {
  return (
    pending?.type === type &&
    "workspaceId" in pending &&
    pending.workspaceId === workspaceId &&
    pending.parentFolderId === parentFolderId
  );
}

function matchesPendingTreeRenameFile(
  pending: PendingTreeRename | null | undefined,
  documentId: string
) {
  return pending?.type === "file" && pending.id === documentId;
}

function matchesPendingTreeRenameFolder(
  pending: PendingTreeRename | null | undefined,
  folderId: string
) {
  return pending?.type === "folder" && pending.id === folderId;
}

function matchesPendingTreeRenameWorkspace(
  pending: PendingTreeRename | null | undefined,
  workspaceId: string
) {
  return (
    pending?.type === "workspace" &&
    pending.id === workspaceId &&
    pending.inlineTarget === "tree"
  );
}

/** Compact hit target for dropping into empty workspace / folder rows. */
const EMPTY_TREE_DROP_ZONE_CLASS = "min-h-4 py-0";

/** Row pill while a workspace / folder header is the drag drop target. */
export const TREE_DRAG_TARGET_PILL = cn(
  "rounded-md border-2 border-[var(--tree-drag-target-border)] bg-[var(--tree-drag-target-bg)] font-heading font-semibold text-[var(--tree-drag-target-fg)] transition-colors duration-150"
);

/** Inner drop zone fill (border comes from {@link TREE_DRAG_TARGET_SECTION}). */
export const TREE_DRAG_TARGET_ZONE = cn(
  "rounded-md bg-[var(--tree-drag-target-bg)] transition-colors duration-150"
);

/** Outer shell wrapping a folder or workspace header + its drop zone. */
export const TREE_DRAG_TARGET_SECTION = cn(
  "rounded-md border-2 border-[var(--tree-drag-target-border)] transition-colors duration-150"
);

/** Workspace name strip when the open document lives in this workspace. */
const WORKSPACE_TAB_CORAL_PILL = cn(
  "!flex !min-h-8 !min-w-0 !flex-1 !items-start !gap-2 !rounded-md !border-0 !bg-transparent !py-1 !pl-[3px] !pr-0 !text-left !font-heading !font-bold !text-primary !shadow-none !outline-none !ring-0 !transition-colors focus-visible:!ring-0 focus-visible:!ring-ring"
);

/** Inactive workspace row — label uses muted (icons override when path-highlighted). */
const WORKSPACE_TAB_MUTED_PILL = cn(
  "!flex !min-h-8 !min-w-0 !flex-1 !items-start !gap-2 !rounded-md !border-0 !bg-transparent !py-1 !pl-[3px] !pr-0 !text-left !font-heading !font-normal !text-muted-foreground !shadow-none !outline-none !ring-0 !transition-colors hover:!text-primary-hover"
);

const TREE_ROW_SELECTED = "bg-sidebar-accent text-primary";

/** Guide lines on the path from workspace to the open document. */
const TREE_GUIDE_ACTIVE_PATH = "tree-guide-entry--active-path";

function treeDropSpineClass() {
  return "border-l-2 border-[color:var(--sidebar-guide)] pb-0.5 pt-0 tree-drop-with-branches";
}

function TreeGuideEntry({
  children,
  className,
  guide = true,
  activePath = false,
}: {
  children: React.ReactNode;
  className?: string;
  guide?: boolean;
  activePath?: boolean;
}) {
  return (
    <div
      className={cn(
        guide && "tree-guide-entry",
        guide && activePath && TREE_GUIDE_ACTIVE_PATH,
        className
      )}
    >
      {children}
    </div>
  );
}

function useClearDragStateOnDragEnd(setDragOver: (v: boolean) => void) {
  useEffect(() => {
    const clear = () => setDragOver(false);
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, [setDragOver]);
}
const EXPANDED_WORKSPACES_KEY = "md-viewer-expanded-workspaces";
const EXPANDED_FOLDERS_KEY = "md-viewer-expanded-folders";

/** Max width for the compact drag pill; longer labels ellipsize. */
const TREE_DRAG_GHOST_MAX_WIDTH_PX = 320;

/** Cursor-style compact pill attached to the pointer while dragging tree items. */
function setTreeDragGhostImage(e: React.DragEvent, label: string) {
  const transfer = e.dataTransfer;
  if (!transfer || typeof document === "undefined") return;

  const ghost = document.createElement("div");
  const marker = document.createElement("span");
  marker.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = label;

  Object.assign(ghost.style, {
    position: "fixed",
    top: "-10000px",
    left: "-10000px",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    width: "max-content",
    maxWidth: `${TREE_DRAG_GHOST_MAX_WIDTH_PX}px`,
    padding: "4px 9px",
    borderRadius: "6px",
    background: "var(--tree-drag-target-bg)",
    border: "2px solid var(--tree-drag-target-border)",
    color: "var(--tree-drag-target-fg)",
    fontFamily: "var(--font-sans, ui-monospace, monospace)",
    fontSize: "12px",
    fontWeight: "600",
    lineHeight: "1.25",
    whiteSpace: "nowrap",
    boxShadow: "0 1px 4px rgb(0 0 0 / 0.15)",
    pointerEvents: "none",
    boxSizing: "border-box",
  });

  Object.assign(marker.style, {
    flexShrink: "0",
    width: "5px",
    height: "5px",
    borderRadius: "9999px",
    background: "currentColor",
  });

  Object.assign(text.style, {
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: "0",
  });

  ghost.append(marker, text);
  document.body.appendChild(ghost);

  const anchorX = Math.min(14, Math.max(8, ghost.offsetWidth * 0.3));
  const anchorY = Math.max(10, Math.floor(ghost.offsetHeight / 2));
  transfer.setDragImage(ghost, anchorX, anchorY);

  window.setTimeout(() => ghost.remove(), 0);
}

function dimDragSource(el: HTMLElement) {
  el.style.opacity = "0.38";
}

function restoreDragSource(el: HTMLElement) {
  el.style.opacity = "";
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

interface WorkspaceTreeProps {
  workspaces: Workspace[];
  folders: (workspaceId: string, parentFolderId: string | null) => Folder[];
  documents: (workspaceId: string, folderId: string | null) => Document[];
  currentId: string | null;
  selectedWorkspaceId: string | null;
  workspacesEnabled?: boolean;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (id: string, title: string) => void;
  onAddWorkspace: () => void;
  onAddFolder: (workspaceId: string, parentFolderId: string | null) => void;
  onAddFile: (workspaceId: string, folderId: string | null) => void;
  onUploadFile: (workspaceId: string, folderId: string | null) => void;
  onMoveDocument: (docId: string, workspaceId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, workspaceId: string, parentFolderId: string | null) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDeleteWorkspace: (id: string, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onRenameDocument: (id: string, title: string) => void;
  /** Full document list so the tree can expand folders to the active document. */
  flatDocuments: Document[];
  /** All folders in a workspace (for walking ancestors of `folderId`). */
  getFoldersFlat: (workspaceId: string) => Folder[];
  /** Single-workspace view: highlight the switcher chip when the workspace root is the drop target. */
  onWorkspaceDragTargetChange?: (active: boolean) => void;
  pendingTreeCreate?: PendingTreeCreate | null;
  onPendingTreeCreateSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeCreateCancel?: () => void;
  pendingTreeRename?: PendingTreeRename | null;
  onPendingTreeRenameSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeRenameCancel?: () => void;
  treeMultiSelect?: TreeMultiSelectConfig | null;
  onTreeExpansionSnapshot?: (snapshot: {
    workspaceIds: string[];
    folderIds: string[];
  }) => void;
}

export interface TreeMultiSelectConfig {
  selectedDocumentIds: Set<string>;
  selectedFolderIds: Set<string>;
  onDocumentClick: (doc: Document, event: React.MouseEvent) => void;
  onFolderClick: (folder: Folder, workspaceId: string, event: React.MouseEvent) => void;
  onClearSelection: () => void;
  onFolderNormalClick: (folder: Folder) => void;
}

function hasTreeMultiSelection(
  treeMultiSelect?: TreeMultiSelectConfig | null,
): boolean {
  if (!treeMultiSelect) return false;
  return (
    treeMultiSelect.selectedDocumentIds.size > 0 ||
    treeMultiSelect.selectedFolderIds.size > 0
  );
}

export function WorkspaceTree({
  workspaces,
  folders,
  documents,
  currentId,
  selectedWorkspaceId,
  workspacesEnabled = true,
  onSelectDocument,
  onDeleteDocument,
  onAddWorkspace,
  onAddFolder,
  onAddFile,
  onUploadFile,
  onMoveDocument,
  onMoveFolder,
  onRenameWorkspace,
  onDeleteWorkspace,
  onRenameFolder,
  onDeleteFolder,
  onRenameDocument,
  flatDocuments,
  getFoldersFlat,
  onWorkspaceDragTargetChange,
  pendingTreeCreate = null,
  onPendingTreeCreateSubmit,
  onPendingTreeCreateCancel,
  pendingTreeRename = null,
  onPendingTreeRenameSubmit,
  onPendingTreeRenameCancel,
  treeMultiSelect = null,
  onTreeExpansionSnapshot,
}: WorkspaceTreeProps) {
  void onAddWorkspace;
  const effectiveSelectedWorkspaceId = workspacesEnabled
    ? selectedWorkspaceId
    : workspaces[0]?.id ?? "default";
  const workspaceIds = useMemo(
    () => workspaces.map((w) => w.id),
    [workspaces]
  );
  const workspaceIdsKey = workspaceIds.join("\0");

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [expansionHydrated, setExpansionHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedFolders = localStorage.getItem(EXPANDED_FOLDERS_KEY);
      if (storedFolders) {
        setExpandedFolders(JSON.parse(storedFolders) as string[]);
      }
      if (workspaceIds.length > 0) {
        const storedWorkspaces = localStorage.getItem(EXPANDED_WORKSPACES_KEY);
        if (storedWorkspaces) {
          const parsed = JSON.parse(storedWorkspaces) as string[];
          setExpandedWorkspaces(workspaceIds.filter((id) => parsed.includes(id)));
        }
      }
    } catch {
      // ignore invalid storage
    }
    setExpansionHydrated(true);
  }, [workspaceIdsKey, workspaceIds]);

  useEffect(() => {
    if (!expansionHydrated || typeof window === "undefined") return;
    const toSave = expandedWorkspaces.filter((id) => workspaceIds.includes(id));
    localStorage.setItem(EXPANDED_WORKSPACES_KEY, JSON.stringify(toSave));
  }, [expandedWorkspaces, workspaceIds, expansionHydrated]);

  useEffect(() => {
    if (!expansionHydrated || typeof window === "undefined") return;
    localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify(expandedFolders));
  }, [expandedFolders, expansionHydrated]);

  useEffect(() => {
    onTreeExpansionSnapshot?.({
      workspaceIds: expandedWorkspaces,
      folderIds: expandedFolders,
    });
  }, [expandedWorkspaces, expandedFolders, onTreeExpansionSnapshot]);

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

  const handleMoveFolderWithExpand = useCallback(
    (folderId: string, workspaceId: string, parentFolderId: string | null) => {
      ensureWorkspaceExpanded(workspaceId);
      if (parentFolderId) ensureFolderExpanded(parentFolderId);
      onMoveFolder(folderId, workspaceId, parentFolderId);
    },
    [ensureWorkspaceExpanded, ensureFolderExpanded, onMoveFolder]
  );

  useEffect(() => {
    if (!pendingTreeCreate || pendingTreeCreate.type === "workspace") return;
    ensureWorkspaceExpanded(pendingTreeCreate.workspaceId);
    if (pendingTreeCreate.parentFolderId) {
      ensureFolderExpanded(pendingTreeCreate.parentFolderId);
    }
  }, [pendingTreeCreate, ensureWorkspaceExpanded, ensureFolderExpanded]);

  useEffect(() => {
    if (!pendingTreeRename) return;
    if (pendingTreeRename.type === "file") {
      ensureWorkspaceExpanded(pendingTreeRename.workspaceId);
      if (pendingTreeRename.folderId) {
        ensureFolderExpanded(pendingTreeRename.folderId);
      }
      return;
    }
    if (pendingTreeRename.type === "folder") {
      ensureWorkspaceExpanded(pendingTreeRename.workspaceId);
      if (pendingTreeRename.parentFolderId) {
        ensureFolderExpanded(pendingTreeRename.parentFolderId);
      }
      return;
    }
    if (pendingTreeRename.inlineTarget === "tree") {
      ensureWorkspaceExpanded(pendingTreeRename.id);
    }
  }, [pendingTreeRename, ensureWorkspaceExpanded, ensureFolderExpanded]);

  /** Reveal the active document without collapsing anything the user already expanded. */
  useEffect(() => {
    if (!currentId) return;
    const doc = flatDocuments.find((d) => d.id === currentId);
    if (!doc) return;
    ensureWorkspaceExpanded(doc.workspaceId);
    if (!doc.folderId) return;

    const folderList = getFoldersFlat(doc.workspaceId);
    const idsToExpand: string[] = [];
    let fid: string | null = doc.folderId;
    while (fid) {
      idsToExpand.push(fid);
      const f = folderList.find((x) => x.id === fid);
      fid = f?.parentFolderId ?? null;
    }

    setExpandedFolders((prev) => {
      const next = new Set([...prev, ...idsToExpand]);
      return next.size === prev.length ? prev : Array.from(next);
    });
  }, [currentId, flatDocuments, getFoldersFlat, ensureWorkspaceExpanded]);

  /** Auto-expand newly added workspaces only (do not expand every workspace on re-render). */
  useEffect(() => {
    if (!expansionHydrated || workspaceIds.length === 0) return;
    setExpandedWorkspaces((prev) => {
      const validPrev = prev.filter((id) => workspaceIds.includes(id));
      const added = workspaceIds.filter((id) => !validPrev.includes(id));
      if (added.length === 0) {
        return validPrev.length === prev.length ? prev : validPrev;
      }
      return [...validPrev, ...added];
    });
  }, [expansionHydrated, workspaceIdsKey, workspaceIds]);

  const workspaceValue = expandedWorkspaces.filter((id) => workspaceIds.includes(id));

  /** While any workspace/folder/file ⋯ menu is open, hide "active doc" styling elsewhere. */
  const [treeActionMenuOpen, setTreeActionMenuOpen] = useState(false);

  /** True while dragging a workspace tree doc/folder reorder (selected file row uses text-only emphasis). */
  const [treeReorderDragActive, setTreeReorderDragActive] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTreeReorderDrag = (e: DragEvent) => {
      const types = Array.from(e.dataTransfer?.types ?? []);
      return types.includes(DRAG_TYPE) || types.includes(DRAG_TYPE_FOLDER);
    };
    const onDragStart = (e: DragEvent) => {
      if (isTreeReorderDrag(e)) setTreeReorderDragActive(true);
    };
    const onDragEnd = () => setTreeReorderDragActive(false);
    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    return () => {
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
    };
  }, []);

  const sectionProps = (ws: Workspace) => ({
    workspace: ws,
    expandedFolders,
    onExpandedFoldersChange: handleExpandedFoldersChange,
    folders: folders(ws.id, null),
    documents: documents(ws.id, null),
    getFolders: folders,
    getDocuments: documents,
    currentId,
    selectedWorkspaceId: effectiveSelectedWorkspaceId,
    workspacesEnabled,
    suppressDocHighlights: treeActionMenuOpen,
    treeReorderDragActive,
    onTreeMenuOpenChange: setTreeActionMenuOpen,
    onSelectDocument,
    onDeleteDocument,
    onAddFolder,
    onAddFile,
    onUploadFile,
    onMoveDocument,
    onMoveFolder: handleMoveFolderWithExpand,
    onRenameWorkspace,
    onDeleteWorkspace,
    onRenameFolder,
    onDeleteFolder,
    onRenameDocument,
    ensureWorkspaceExpanded,
    ensureFolderExpanded,
    onWorkspaceDragTargetChange,
    pendingTreeCreate,
    onPendingTreeCreateSubmit,
    onPendingTreeCreateCancel,
    pendingTreeRename,
    onPendingTreeRenameSubmit,
    onPendingTreeRenameCancel,
    treeMultiSelect,
  });

  const treeSections = workspaces.map((ws, i) => (
    <WorkspaceSection
      key={ws.id}
      isLastWorkspace={i === workspaces.length - 1}
      {...sectionProps(ws)}
    />
  ));

  if (effectiveSelectedWorkspaceId) {
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
      className="flex w-full max-w-full flex-col gap-1"
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
  workspacesEnabled: boolean;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (id: string, title: string) => void;
  onAddFolder: (workspaceId: string, parentFolderId: string | null) => void;
  onAddFile: (workspaceId: string, folderId: string | null) => void;
  onUploadFile: (workspaceId: string, folderId: string | null) => void;
  onMoveDocument: (docId: string, workspaceId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, workspaceId: string, parentFolderId: string | null) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDeleteWorkspace: (id: string, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onRenameDocument: (id: string, title: string) => void;
  suppressDocHighlights: boolean;
  treeReorderDragActive: boolean;
  onTreeMenuOpenChange: (open: boolean) => void;
  ensureWorkspaceExpanded: (workspaceId: string) => void;
  ensureFolderExpanded: (folderId: string) => void;
  /** All-workspaces accordion: extra space below expanded sections (skipped for last item). */
  isLastWorkspace?: boolean;
  onWorkspaceDragTargetChange?: (active: boolean) => void;
  pendingTreeCreate?: PendingTreeCreate | null;
  onPendingTreeCreateSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeCreateCancel?: () => void;
  pendingTreeRename?: PendingTreeRename | null;
  onPendingTreeRenameSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeRenameCancel?: () => void;
  treeMultiSelect?: TreeMultiSelectConfig | null;
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
  workspacesEnabled,
  suppressDocHighlights,
  treeReorderDragActive,
  onTreeMenuOpenChange,
  ensureWorkspaceExpanded,
  ensureFolderExpanded,
  onSelectDocument,
  onDeleteDocument,
  onAddFolder,
  onAddFile,
  onUploadFile,
  onMoveDocument,
  onMoveFolder,
  onRenameWorkspace,
  onDeleteWorkspace,
  onRenameFolder,
  onDeleteFolder,
  onRenameDocument,
  isLastWorkspace = false,
  onWorkspaceDragTargetChange,
  pendingTreeCreate = null,
  onPendingTreeCreateSubmit,
  onPendingTreeCreateCancel,
  pendingTreeRename = null,
  onPendingTreeRenameSubmit,
  onPendingTreeRenameCancel,
  treeMultiSelect = null,
}: WorkspaceSectionProps) {
  const [wsDragOver, setWsDragOver] = useState(false);
  const [wsContentDragOver, setWsContentDragOver] = useState(false);

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  useClearDragStateOnDragEnd(setWsDragOver);
  useClearDragStateOnDragEnd(setWsContentDragOver);

  const showPendingWorkspaceRename = matchesPendingTreeRenameWorkspace(
    pendingTreeRename,
    workspace.id
  );

  const folderIds = folders.map((f) => f.id);
  const workspaceDragTarget = wsDragOver || wsContentDragOver;
  const suppressOpenDocHighlight =
    suppressDocHighlights || hasTreeMultiSelection(treeMultiSelect);
  const docActiveInWorkspace =
    !suppressOpenDocHighlight &&
    containsActiveDoc(workspace.id, null, currentId, getDocuments, getFolders);
  const workspaceRowActive =
    docActiveInWorkspace || workspaceMenuOpen;

  /** Open document: highlight only workspace/folder icons on the path — not labels or the file row. */
  const openFileInTree = Boolean(currentId) && !suppressOpenDocHighlight;
  const workspaceIconPrimaryOnly =
    openFileInTree &&
    docActiveInWorkspace &&
    !workspaceMenuOpen;
  const workspaceFullRowAccent = workspaceRowActive && !workspaceIconPrimaryOnly;
  const workspaceShowPill = workspaceFullRowAccent || workspaceDragTarget;

  const handleWsDragOver = (e: React.DragEvent) => {
    if (!isTreeDrag(e)) {
      setWsDragOver(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    ensureWorkspaceExpanded(workspace.id);
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
    const folderId = e.dataTransfer.getData(DRAG_TYPE_FOLDER);
    if (docId) onMoveDocument(docId, workspace.id, null);
    else if (folderId) onMoveFolder(folderId, workspace.id, null);
  };

  const hasTreeItems = folders.length > 0 || documents.length > 0;
  const hideWorkspaceHeader = selectedWorkspaceId === workspace.id;
  const showPendingFolder = matchesPendingTreeCreate(
    pendingTreeCreate,
    workspace.id,
    null,
    "folder"
  );
  const showPendingFile = matchesPendingTreeCreate(
    pendingTreeCreate,
    workspace.id,
    null,
    "file"
  );
  const hasVisibleTreeContent =
    hasTreeItems || showPendingFolder || showPendingFile;

  useEffect(() => {
    if (!hideWorkspaceHeader) return;
    onWorkspaceDragTargetChange?.(workspaceDragTarget);
  }, [hideWorkspaceHeader, workspaceDragTarget, onWorkspaceDragTargetChange]);

  useEffect(() => {
    if (!hideWorkspaceHeader) return;
    return () => onWorkspaceDragTargetChange?.(false);
  }, [hideWorkspaceHeader, onWorkspaceDragTargetChange]);

  const handleWsContentDragTargetChange = useCallback(
    (active: boolean) => {
      if (active) {
        setWsDragOver(false);
      }
      setWsContentDragOver(active);
    },
    []
  );

  const workspaceTreeInner = (
    <>
      {showPendingFolder && onPendingTreeCreateSubmit && onPendingTreeCreateCancel ? (
        <TreeGuideEntry>
          <InlineTreeCreateRow
            type="folder"
            showChevron
            onSubmit={onPendingTreeCreateSubmit}
            onCancel={onPendingTreeCreateCancel}
          />
        </TreeGuideEntry>
      ) : null}
      {showPendingFile && onPendingTreeCreateSubmit && onPendingTreeCreateCancel ? (
        <TreeGuideEntry>
          <InlineTreeCreateRow
            type="file"
            initialValue="Untitled"
            onSubmit={onPendingTreeCreateSubmit}
            onCancel={onPendingTreeCreateCancel}
          />
        </TreeGuideEntry>
      ) : null}
      {folders.length > 0 && (
        <Accordion
          type="multiple"
          key={`root:${folderIds.join(",")}`}
          value={folderIds.filter((id) => expandedFolders.includes(id))}
          onValueChange={(v) => onExpandedFoldersChange(null, folderIds, v)}
          className="flex w-full flex-col gap-0"
        >
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              showTreeGuide
              expandedFolders={expandedFolders}
              onExpandedFoldersChange={onExpandedFoldersChange}
              folder={folder}
              workspaceId={workspace.id}
              getFolders={getFolders}
              getDocuments={getDocuments}
              currentId={currentId}
              suppressDocHighlights={suppressDocHighlights}
              treeReorderDragActive={treeReorderDragActive}
              onTreeMenuOpenChange={onTreeMenuOpenChange}
              ensureWorkspaceExpanded={ensureWorkspaceExpanded}
              ensureFolderExpanded={ensureFolderExpanded}
              onSelectDocument={onSelectDocument}
              onDeleteDocument={onDeleteDocument}
              onAddFolder={onAddFolder}
              onAddFile={onAddFile}
              onUploadFile={onUploadFile}
              onMoveDocument={onMoveDocument}
              onMoveFolder={onMoveFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameDocument={onRenameDocument}
              pendingTreeCreate={pendingTreeCreate}
              onPendingTreeCreateSubmit={onPendingTreeCreateSubmit}
              onPendingTreeCreateCancel={onPendingTreeCreateCancel}
              pendingTreeRename={pendingTreeRename}
              onPendingTreeRenameSubmit={onPendingTreeRenameSubmit}
              onPendingTreeRenameCancel={onPendingTreeRenameCancel}
              treeMultiSelect={treeMultiSelect}
              clearAncestorDropHighlights={() => {
                setWsContentDragOver(false);
                setWsDragOver(false);
              }}
            />
          ))}
        </Accordion>
      )}
      {documents.map((doc) => (
        <TreeGuideEntry
          key={doc.id}
          activePath={openFileInTree && currentId === doc.id}
        >
          <FileItem
            doc={doc}
            isActive={currentId === doc.id}
            suppressDocHighlights={suppressDocHighlights}
            treeReorderDragActive={treeReorderDragActive}
            onTreeMenuOpenChange={onTreeMenuOpenChange}
            onSelect={() => onSelectDocument(doc)}
            onDelete={() => onDeleteDocument(doc.id, doc.title)}
            onRename={() => onRenameDocument(doc.id, doc.title)}
            pendingTreeRename={pendingTreeRename}
            onPendingTreeRenameSubmit={onPendingTreeRenameSubmit}
            onPendingTreeRenameCancel={onPendingTreeRenameCancel}
            treeMultiSelect={treeMultiSelect}
          />
        </TreeGuideEntry>
      ))}
      {hideWorkspaceHeader && !hasVisibleTreeContent && (
        <div className="flex min-h-[min(50vh,12rem)] w-full items-center justify-center px-3 py-6">
          <p className="text-center font-mono text-sm text-muted-foreground" aria-live="polite">
            Nothing to show
          </p>
        </div>
      )}
    </>
  );

  const showDropSpine =
    hasTreeItems || showPendingFolder || showPendingFile;

  const dropAreaClassName = cn(
    "flex flex-col gap-0.5",
    !hideWorkspaceHeader && "ml-2.5",
    showDropSpine && "pl-1",
    showDropSpine
      ? treeDropSpineClass()
      : EMPTY_TREE_DROP_ZONE_CLASS,
    workspaceDragTarget &&
      showDropSpine &&
      "!border-l-[var(--tree-drag-target-border)] tree-drop-with-branches--drag-target"
  );

  if (hideWorkspaceHeader) {
    return (
      <div
        className={cn(
          "flex w-full max-w-full flex-col",
          workspaceDragTarget && cn(TREE_DRAG_TARGET_SECTION, "p-0.5")
        )}
        onDragOver={handleWsDragOver}
        onDragLeave={handleWsDragLeave}
        onDrop={handleWsDrop}
      >
        <WorkspaceDropArea
          workspaceId={workspace.id}
          folderId={null}
          isDragTarget={workspaceDragTarget}
          onMoveDocument={onMoveDocument}
          onMoveFolder={onMoveFolder}
          onDragTargetActiveChange={handleWsContentDragTargetChange}
          className={dropAreaClassName}
        >
          {workspaceTreeInner}
        </WorkspaceDropArea>
      </div>
    );
  }

  return (
    <AccordionItem
      value={workspace.id}
      className={cn(
        "group",
        workspaceDragTarget && cn(TREE_DRAG_TARGET_SECTION, "p-0.5")
      )}
    >
        <AccordionTrigger
          triggerVariant="section"
          isActive={workspaceShowPill}
          hideTriggerChevron
          className="group/ws hover:no-underline !border-0 !bg-transparent !p-0 !pl-0 !pr-0 !shadow-none hover:!bg-transparent"
          onDragOver={handleWsDragOver}
          onDragLeave={handleWsDragLeave}
          onDrop={handleWsDrop}
        >
          <div
            className={cn(
              workspaceDragTarget
                ? cn(
                    "!flex !min-h-8 !min-w-0 !flex-1 !items-start !gap-2 !py-1 !pl-[3px] !pr-0 !text-left !shadow-none !outline-none !ring-0",
                    TREE_DRAG_TARGET_PILL
                  )
                : workspaceFullRowAccent
                  ? WORKSPACE_TAB_CORAL_PILL
                  : WORKSPACE_TAB_MUTED_PILL
            )}
          >
            <Layers
              className={cn(
                "mt-0.5 size-4 shrink-0 transition-colors",
                workspaceDragTarget
                  ? "text-[var(--tree-drag-target-fg)]"
                  : workspaceIconPrimaryOnly
                    ? "text-primary"
                    : workspaceShowPill
                      ? "text-foreground"
                      : "text-muted-foreground",
                "group-hover/ws:text-primary-hover"
              )}
            />
            {showPendingWorkspaceRename &&
            onPendingTreeRenameSubmit &&
            onPendingTreeRenameCancel ? (
              <InlineTreeCreateRow
                type="folder"
                showIcon={false}
                rename
                initialValue={workspace.name}
                onSubmit={onPendingTreeRenameSubmit}
                onCancel={onPendingTreeRenameCancel}
              />
            ) : (
              <span
                className={cn(
                  "min-w-0 flex-1 text-left font-heading text-lg leading-snug transition-colors line-clamp-2 break-words",
                  workspaceDragTarget && "font-semibold text-[var(--tree-drag-target-fg)]",
                  workspaceIconPrimaryOnly &&
                    !workspaceShowPill &&
                    "!text-foreground",
                  "group-hover/ws:!text-primary-hover"
                )}
              >
                {workspace.name}
              </span>
            )}
            <div className="group/action ml-1 flex h-5 shrink-0 items-center justify-end gap-1">
              <ChevronRight
                aria-hidden
                className={cn(
                  "pointer-events-none size-[1.125rem] shrink-0 transition-[transform,color] duration-200",
                  workspaceDragTarget || workspaceShowPill ? "text-inherit" : "text-muted-foreground",
                  "group-hover/ws:text-foreground",
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Workspace actions"
                        className={cn(
                          "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring",
                          workspaceShowPill ? "text-foreground" : "text-muted-foreground",
                          "group-hover/ws:text-foreground"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") e.preventDefault();
                        }}
                      >
                        <MoreHorizontal className="size-5 shrink-0" />
                      </div>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="end">
                    Workspace actions
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  sideOffset={4}
                  className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-popover p-1 font-heading text-popover-foreground shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => onAddFile(workspace.id, null)}>
                    <FilePlus className="mr-2 size-4" />
                    Create File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUploadFile(workspace.id, null)}>
                    <Upload className="mr-2 size-4" />
                    Upload File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddFolder(workspace.id, null)}>
                    <FolderIcon className="mr-2 size-4" />
                    Create Folder
                  </DropdownMenuItem>
                  {workspacesEnabled ? (
                    <>
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
                    </>
                  ) : null}
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
              : !hasTreeItems
                ? "!mt-0 !px-0 !pt-0 group-data-[state=open]:pb-1 group-data-[state=open]:mb-1"
                : "!mt-0 !px-0 !pt-0 group-data-[state=open]:pb-3 group-data-[state=open]:mb-3"
          )}
        >
          <WorkspaceDropArea
            workspaceId={workspace.id}
            folderId={null}
            isDragTarget={workspaceDragTarget}
            onMoveDocument={onMoveDocument}
            onMoveFolder={onMoveFolder}
            onDragTargetActiveChange={handleWsContentDragTargetChange}
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
  onMoveDocument,
  onMoveFolder,
  onDragTargetActiveChange,
  isDragTarget = false,
  className,
  children,
}: {
  workspaceId: string;
  folderId: string | null;
  onMoveDocument: (docId: string, workspaceId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, workspaceId: string, parentFolderId: string | null) => void;
  /** Highlights the workspace / folder row pill while dragging over this list zone. */
  onDragTargetActiveChange?: (active: boolean) => void;
  /** When true, fill this drop zone with the drag-target border + tint. */
  isDragTarget?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const handleDragOver = (e: React.DragEvent) => {
    if (!isTreeDrag(e)) {
      onDragTargetActiveChange?.(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
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
    const draggedFolderId = e.dataTransfer.getData(DRAG_TYPE_FOLDER);
    if (docId) onMoveDocument(docId, workspaceId, folderId);
    else if (draggedFolderId) onMoveFolder(draggedFolderId, workspaceId, folderId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "min-h-0 transition-colors duration-150",
        className,
        isDragTarget && TREE_DRAG_TARGET_ZONE
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
  onMoveFolder: (folderId: string, workspaceId: string, parentFolderId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onRenameDocument: (id: string, title: string) => void;
  suppressDocHighlights: boolean;
  treeReorderDragActive: boolean;
  onTreeMenuOpenChange: (open: boolean) => void;
  ensureWorkspaceExpanded: (workspaceId: string) => void;
  ensureFolderExpanded: (folderId: string) => void;
  /** Clear workspace / parent folder drop highlights when this folder claims the target. */
  clearAncestorDropHighlights?: () => void;
  pendingTreeCreate?: PendingTreeCreate | null;
  onPendingTreeCreateSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeCreateCancel?: () => void;
  pendingTreeRename?: PendingTreeRename | null;
  onPendingTreeRenameSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeRenameCancel?: () => void;
  treeMultiSelect?: TreeMultiSelectConfig | null;
  showTreeGuide?: boolean;
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
  treeReorderDragActive,
  onTreeMenuOpenChange,
  ensureWorkspaceExpanded,
  ensureFolderExpanded,
  onSelectDocument,
  onDeleteDocument,
  onAddFolder,
  onAddFile,
  onUploadFile,
  onMoveDocument,
  onMoveFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameDocument,
  clearAncestorDropHighlights,
  pendingTreeCreate = null,
  onPendingTreeCreateSubmit,
  onPendingTreeCreateCancel,
  pendingTreeRename = null,
  onPendingTreeRenameSubmit,
  onPendingTreeRenameCancel,
  treeMultiSelect = null,
  showTreeGuide = false,
}: FolderItemProps) {
  const subfolders = getFolders(workspaceId, folder.id);
  const docs = getDocuments(workspaceId, folder.id);
  const subfolderIds = subfolders.map((f) => f.id);
  const showPendingFolderRename = matchesPendingTreeRenameFolder(
    pendingTreeRename,
    folder.id
  );
  const showPendingFolder = matchesPendingTreeCreate(
    pendingTreeCreate,
    workspaceId,
    folder.id,
    "folder"
  );
  const showPendingFile = matchesPendingTreeCreate(
    pendingTreeCreate,
    workspaceId,
    folder.id,
    "file"
  );

  const [folderDragOver, setFolderDragOver] = useState(false);
  const [folderContentDragOver, setFolderContentDragOver] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  useClearDragStateOnDragEnd(setFolderDragOver);
  useClearDragStateOnDragEnd(setFolderContentDragOver);

  const folderDragTarget = folderDragOver || folderContentDragOver;

  const claimDropTarget = useCallback(() => {
    clearAncestorDropHighlights?.();
  }, [clearAncestorDropHighlights]);

  const handleFolderContentDragTargetChange = useCallback(
    (active: boolean) => {
      if (active) claimDropTarget();
      setFolderContentDragOver(active);
    },
    [claimDropTarget]
  );

  const suppressOpenDocHighlight =
    suppressDocHighlights || hasTreeMultiSelection(treeMultiSelect);
  const docActiveInFolder =
    !suppressOpenDocHighlight &&
    containsActiveDoc(workspaceId, folder.id, currentId, getDocuments, getFolders);
  const folderRowActive = docActiveInFolder || folderMenuOpen;

  const openFileInTree = Boolean(currentId) && !suppressOpenDocHighlight;
  const folderIconPrimaryOnly = openFileInTree && docActiveInFolder && !folderMenuOpen;
  const folderFullRowAccent = folderRowActive && !folderIconPrimaryOnly;
  const folderShowPill = folderFullRowAccent || folderDragTarget;
  const folderMultiSelected = treeMultiSelect?.selectedFolderIds.has(folder.id) ?? false;
  const folderRowHighlighted = folderShowPill || folderMultiSelected;

  const handleFolderRowClick = (e: React.MouseEvent) => {
    if (folderDidDragRef.current) return;
    if (!treeMultiSelect) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      treeMultiSelect.onFolderClick(folder, workspaceId, e);
      return;
    }
    treeMultiSelect.onFolderNormalClick(folder);
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    if (!isTreeDrag(e)) {
      setFolderDragOver(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    ensureWorkspaceExpanded(workspaceId);
    ensureFolderExpanded(folder.id);
    claimDropTarget();
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
    const draggedFolderId = e.dataTransfer.getData(DRAG_TYPE_FOLDER);
    if (docId) onMoveDocument(docId, workspaceId, folder.id);
    else if (draggedFolderId) onMoveFolder(draggedFolderId, workspaceId, folder.id);
  };

  const hasNestedItems = subfolders.length > 0 || docs.length > 0;

  const folderActionsRef = useRef<HTMLDivElement>(null);
  const folderDidDragRef = useRef(false);

  const handleFolderDragStart = (e: React.DragEvent) => {
    folderDidDragRef.current = true;
    e.stopPropagation();
    e.dataTransfer.setData(DRAG_TYPE_FOLDER, folder.id);
    e.dataTransfer.effectAllowed = "move";
    setTreeDragGhostImage(e, folder.name);
    dimDragSource(e.currentTarget as HTMLElement);
    const box = folderActionsRef.current;
    if (box) box.style.display = "none";
  };

  const handleFolderDragEnd = (e: React.DragEvent) => {
    restoreDragSource(e.currentTarget as HTMLElement);
    const box = folderActionsRef.current;
    if (box) box.style.display = "";
    window.setTimeout(() => {
      folderDidDragRef.current = false;
    }, 0);
  };

  return (
    <AccordionItem
      value={folder.id}
      variant="nested"
      className={cn(folderDragTarget && cn(TREE_DRAG_TARGET_SECTION, "p-0.5"))}
    >
      <AccordionTrigger
        triggerVariant="tree"
        isActive={folderShowPill}
        hideTriggerChevron
        className="group/folder min-h-8 hover:no-underline !border-0 !bg-transparent !p-0 !pl-0 !pr-0 !shadow-none hover:!bg-transparent"
        onDragOver={handleFolderDragOver}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
      >
        <TreeGuideEntry
          guide={showTreeGuide}
          activePath={openFileInTree && docActiveInFolder}
          className={cn(
            "flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md py-0.5 pl-1 pr-0 transition-colors duration-150",
            folderDragTarget && TREE_DRAG_TARGET_PILL,
            folderRowHighlighted && !folderDragTarget && TREE_ROW_SELECTED,
            !folderRowHighlighted && "text-muted-foreground hover:text-foreground"
          )}
        >
        <div
          draggable
          onDragStart={handleFolderDragStart}
          onDragEnd={handleFolderDragEnd}
          onClick={handleFolderRowClick}
          className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5"
        >
          <FolderIcon
            className={cn(
              "size-4 shrink-0 transition-colors group-hover/folder:text-foreground",
              folderDragTarget
                ? "text-[var(--tree-drag-target-fg)]"
                : folderRowActive || folderMultiSelected
                  ? "text-primary"
                  : "text-muted-foreground"
            )}
          />
          {showPendingFolderRename &&
          onPendingTreeRenameSubmit &&
          onPendingTreeRenameCancel ? (
            <InlineTreeCreateRow
              type="folder"
              showIcon={false}
              rename
              initialValue={folder.name}
              onSubmit={onPendingTreeRenameSubmit}
              onCancel={onPendingTreeRenameCancel}
            />
          ) : (
            <span
              className={cn(
                "min-w-0 flex-1 text-left text-sm font-medium leading-snug transition-colors line-clamp-2 break-words",
                folderDragTarget && "font-semibold text-[var(--tree-drag-target-fg)]",
                (folderRowActive || folderMultiSelected) && !folderDragTarget && "font-semibold",
                "group-hover/folder:text-foreground"
              )}
            >
              {folder.name}
            </span>
          )}
          <div className="group/action ml-1 flex h-5 shrink-0 items-center justify-end gap-1">
            <ChevronRight
              aria-hidden
              className={cn(
                "pointer-events-none size-[1.125rem] shrink-0 text-inherit transition-[transform,color] duration-200 group-hover/folder:text-foreground",
                "group-data-[state=open]/folder:rotate-90",
              )}
            />
            <div
              ref={folderActionsRef}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Folder actions"
                      className={cn(
                        "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring",
                        folderRowActive ? "text-foreground" : "text-muted-foreground",
                        "group-hover/folder:text-foreground"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") e.preventDefault();
                      }}
                    >
                      <MoreHorizontal className="size-5 shrink-0" />
                    </div>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" align="end">
                  Folder actions
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-popover p-1 font-heading text-popover-foreground shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => onAddFile(workspaceId, folder.id)}>
                  <FilePlus className="mr-2 size-4 text-muted" />
                  Create File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUploadFile(workspaceId, folder.id)}>
                  <Upload className="mr-2 size-4 text-muted" />
                  Upload File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddFolder(workspaceId, folder.id)}>
                  <FolderIcon className="mr-2 size-4 text-muted" />
                  Create Folder
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
        </TreeGuideEntry>
      </AccordionTrigger>
      <AccordionContent className="!p-0">
        <WorkspaceDropArea
          workspaceId={workspaceId}
          folderId={folder.id}
          isDragTarget={folderDragTarget}
          onMoveDocument={onMoveDocument}
          onMoveFolder={onMoveFolder}
          onDragTargetActiveChange={handleFolderContentDragTargetChange}
          className={cn(
            "ml-1 flex flex-col gap-0.5 pl-1",
            hasNestedItems || showPendingFolder || showPendingFile
              ? treeDropSpineClass()
              : EMPTY_TREE_DROP_ZONE_CLASS,
            folderDragTarget &&
              (hasNestedItems || showPendingFolder || showPendingFile) &&
              "!border-l-[var(--tree-drag-target-border)] tree-drop-with-branches--drag-target"
          )}
        >
          {showPendingFolder && onPendingTreeCreateSubmit && onPendingTreeCreateCancel ? (
            <TreeGuideEntry>
              <InlineTreeCreateRow
                type="folder"
                onSubmit={onPendingTreeCreateSubmit}
                onCancel={onPendingTreeCreateCancel}
              />
            </TreeGuideEntry>
          ) : null}
          {showPendingFile && onPendingTreeCreateSubmit && onPendingTreeCreateCancel ? (
            <TreeGuideEntry>
              <InlineTreeCreateRow
                type="file"
                initialValue="Untitled"
                onSubmit={onPendingTreeCreateSubmit}
                onCancel={onPendingTreeCreateCancel}
              />
            </TreeGuideEntry>
          ) : null}
          {subfolders.length > 0 && (
            <Accordion
              type="multiple"
              key={`${folder.id}:${subfolderIds.join(",")}`}
              value={subfolderIds.filter((id) => expandedFolders.includes(id))}
              onValueChange={(v) => onExpandedFoldersChange(folder.id, subfolderIds, v)}
              className="flex w-full flex-col gap-0.5"
            >
              {subfolders.map((sub) => (
                <FolderItem
                  key={sub.id}
                  showTreeGuide
                  expandedFolders={expandedFolders}
                  onExpandedFoldersChange={onExpandedFoldersChange}
                  folder={sub}
                  workspaceId={workspaceId}
                  getFolders={getFolders}
                  getDocuments={getDocuments}
                  currentId={currentId}
                  suppressDocHighlights={suppressDocHighlights}
                  treeReorderDragActive={treeReorderDragActive}
                  onTreeMenuOpenChange={onTreeMenuOpenChange}
                  ensureWorkspaceExpanded={ensureWorkspaceExpanded}
                  ensureFolderExpanded={ensureFolderExpanded}
                  onSelectDocument={onSelectDocument}
                  onDeleteDocument={onDeleteDocument}
                  onAddFolder={onAddFolder}
                  onAddFile={onAddFile}
                  onUploadFile={onUploadFile}
                  onMoveDocument={onMoveDocument}
                  onMoveFolder={onMoveFolder}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                  onRenameDocument={onRenameDocument}
                  pendingTreeCreate={pendingTreeCreate}
                  onPendingTreeCreateSubmit={onPendingTreeCreateSubmit}
                  onPendingTreeCreateCancel={onPendingTreeCreateCancel}
                  pendingTreeRename={pendingTreeRename}
                  onPendingTreeRenameSubmit={onPendingTreeRenameSubmit}
                  onPendingTreeRenameCancel={onPendingTreeRenameCancel}
                  treeMultiSelect={treeMultiSelect}
                  clearAncestorDropHighlights={() => {
                    setFolderContentDragOver(false);
                    setFolderDragOver(false);
                    clearAncestorDropHighlights?.();
                  }}
                />
              ))}
              </Accordion>
            )}
          {docs.map((doc) => (
            <TreeGuideEntry
              key={doc.id}
              activePath={openFileInTree && currentId === doc.id}
            >
              <FileItem
                doc={doc}
                isActive={currentId === doc.id}
                suppressDocHighlights={suppressDocHighlights}
                treeReorderDragActive={treeReorderDragActive}
                onTreeMenuOpenChange={onTreeMenuOpenChange}
                onSelect={() => onSelectDocument(doc)}
                onDelete={() => onDeleteDocument(doc.id, doc.title)}
                onRename={() => onRenameDocument(doc.id, doc.title)}
                pendingTreeRename={pendingTreeRename}
                onPendingTreeRenameSubmit={onPendingTreeRenameSubmit}
                onPendingTreeRenameCancel={onPendingTreeRenameCancel}
                treeMultiSelect={treeMultiSelect}
              />
            </TreeGuideEntry>
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
  treeReorderDragActive,
  onTreeMenuOpenChange,
  onSelect,
  onDelete,
  onRename,
  pendingTreeRename = null,
  onPendingTreeRenameSubmit,
  onPendingTreeRenameCancel,
  treeMultiSelect = null,
}: {
  doc: Document;
  isActive: boolean;
  suppressDocHighlights: boolean;
  treeReorderDragActive: boolean;
  onTreeMenuOpenChange: (open: boolean) => void;
  onSelect: () => void;
  onDelete: () => void;
  onRename: () => void;
  pendingTreeRename?: PendingTreeRename | null;
  onPendingTreeRenameSubmit?: (name: string) => void | Promise<void>;
  onPendingTreeRenameCancel?: () => void;
  treeMultiSelect?: TreeMultiSelectConfig | null;
}) {
  const displayName = doc.title.trim() || "Untitled";
  const nameTruncated = false;
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const isRenaming = matchesPendingTreeRenameFile(pendingTreeRename, doc.id);
  const fileMultiSelected = treeMultiSelect?.selectedDocumentIds.has(doc.id) ?? false;
  const fileLooksSelected =
    fileMultiSelected ||
    (isActive &&
      !suppressDocHighlights &&
      !isRenaming &&
      !hasTreeMultiSelection(treeMultiSelect));

  const fileActionsRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    setTreeDocumentDragData(e.dataTransfer, doc.id);
    e.dataTransfer.effectAllowed = "copyMove";
    setTreeDragGhostImage(e, displayName);
    dimDragSource(e.currentTarget as HTMLElement);
    const box = fileActionsRef.current;
    if (box) box.style.display = "none";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    restoreDragSource(e.currentTarget as HTMLElement);
    const box = fileActionsRef.current;
    if (box) box.style.display = "";
  };

  if (
    isRenaming &&
    onPendingTreeRenameSubmit &&
    onPendingTreeRenameCancel
  ) {
    return (
      <div className="flex items-center rounded-md py-0.5 pl-1 pr-1">
        <InlineTreeCreateRow
          type="file"
          rename
          initialValue={displayName}
          onSubmit={onPendingTreeRenameSubmit}
          onCancel={onPendingTreeRenameCancel}
        />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group/file flex min-h-8 cursor-pointer items-center rounded-md py-0.5 pl-1 pr-0 transition-colors hover:bg-sidebar-accent/50",
        fileLooksSelected && TREE_ROW_SELECTED
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-slot='dropdown-menu-trigger']")) {
          return;
        }
        if (treeMultiSelect && (e.metaKey || e.ctrlKey || e.shiftKey)) {
          treeMultiSelect.onDocumentClick(doc, e);
          return;
        }
        onSelect();
      }}
    >
      <div
        className={cn(
          "flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-[5px] py-0 pl-1 pr-0 transition-colors",
          fileLooksSelected && "font-medium"
        )}
      >
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-8 min-w-0 flex-1 items-center justify-start gap-2 border-0 bg-transparent text-left text-sm transition-colors hover:bg-transparent",
                !fileLooksSelected && !fileMenuOpen && "text-muted-foreground",
                !fileLooksSelected && fileMenuOpen && "text-foreground",
                nameTruncated && "min-w-0"
              )}
            >
              <FileBraces
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  fileLooksSelected ? "text-primary" : "text-muted-foreground group-hover/file:text-foreground"
                )}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 leading-snug line-clamp-2 break-words",
                  fileLooksSelected && "text-primary"
                )}
              >
                {displayName}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-md">
            {displayName}
          </TooltipContent>
        </Tooltip>
        <div
          ref={fileActionsRef}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Document actions"
                    className={cn(
                      "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring",
                      "text-muted-foreground group-hover/file:text-foreground"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") e.preventDefault();
                    }}
                  >
                    <MoreHorizontal className="size-5 shrink-0" />
                  </div>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" align="end">
                Document actions
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="min-w-0 w-max whitespace-nowrap rounded-md border-border-2 bg-popover p-1 font-heading text-popover-foreground shadow-sm"
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

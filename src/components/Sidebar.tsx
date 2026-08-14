"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { Document } from "@/types/document";
import type { Folder } from "@/types/workspace";
import { INLINE_TREE_EDIT_SELECTOR } from "./InlineTreeCreateRow";
import { WORKSPACE_SWITCHER_DROPDOWN_SELECTOR } from "./WorkspaceSwitcher";
import { WorkspaceTree, type PendingTreeCreate, type PendingTreeRename } from "./WorkspaceTree";
import { TreeMultiSelectBar } from "./TreeMultiSelectBar";
import type { SearchMatchNavigation } from "./Search";
import { Button } from "@/components/ui/button";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspaceTree } from "@/context/WorkspaceTreeContext";
import {
  addWorkspace,
  addFolder,
  moveDocument,
  moveFolder,
  updateWorkspace,
  updateFolder,
  updateDocument,
  deleteWorkspace,
  deleteFolder,
  deleteDocument,
  deleteAllData,
  exportWorkspaceData,
  exportAllWorkspacesData,
  exportWorkspacesData,
  importWorkspaceData,
  importAllWorkspacesData,
  consolidateWorkspacesIntoDefault,
  ensureConsolidatedWhenWorkspacesDisabled,
  DuplicateNameError,
  type WorkspaceExport,
  type AllWorkspacesExport,
} from "@/lib/storage";
import { cn, OPSLY_FILE_EXTENSION, titleFromMarkdownContent } from "@/lib/utils";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceActionBar } from "./WorkspaceActionBar";
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
import { SettingsMenu } from "./SettingsMenu";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CommandPalette } from "./CommandPalette";
import { HeaderLogo } from "./HeaderLogo";
import { UploadFileModal } from "./UploadFileModal";
import { CreateMarkdownModal } from "./CreateMarkdownModal";
import { useDeploymentReloadBlock } from "@/components/DeploymentReloadGuard";
import {
  decryptWorkspaceExport,
  encryptWorkspaceExport,
  isEncryptedWorkspaceExport,
} from "@/lib/workspace-export-crypto";
import { SetPassphraseDialog } from "@/features/document-encryption/components/SetPassphraseDialog";
import { UnlockDocumentDialog } from "@/features/document-encryption/components/UnlockDocumentDialog";
import {
  buildVisibleTreeOrder,
  countSelectedItems,
  expandFoldersInSelection,
  getFolderDescendants,
  getRangeSelection,
  isModifierToggleClick,
  isRangeSelectClick,
  keysToSelectionSets,
  planBulkDelete,
  toggleFolderInSelection,
  treeSelectKey,
  type TreeSelectKey,
} from "@/lib/tree-selection";

type ExportMode = "plain" | "encrypted";

interface PendingExport {
  data: AllWorkspacesExport | WorkspaceExport;
  filename: string;
}

function downloadExportFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toEncryptedExportFilename(jsonFilename: string): string {
  return jsonFilename.replace(/\.json$/i, OPSLY_FILE_EXTENSION);
}

interface SidebarProps {
  documents: Document[];
  currentId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  onAddDocument: (
    title: string,
    content: string,
    workspaceId?: string,
    folderId?: string | null
  ) => void | Promise<boolean>;
  onRefresh: () => void;
  documentStackEnabled: boolean;
  onDocumentStackEnabledChange: (enabled: boolean) => void;
  workspacesEnabled: boolean;
  onWorkspacesEnabledChange: (enabled: boolean) => void;
  documentSearchQuery: string;
  onDocumentSearchQueryChange: (query: string) => void;
  onSearchSelectDocument: (doc: Document) => void;
  searchMatchNavigation?: SearchMatchNavigation | null;
}

export function Sidebar({
  documents,
  currentId,
  onSelectDocument,
  onDeleteDocument,
  onAddDocument,
  onRefresh,
  documentStackEnabled,
  onDocumentStackEnabledChange,
  workspacesEnabled,
  onWorkspacesEnabledChange,
  documentSearchQuery,
  onDocumentSearchQueryChange,
  onSearchSelectDocument,
  searchMatchNavigation,
}: SidebarProps) {
  const { setOpen } = useSidebar();
  const [pendingTreeCreate, setPendingTreeCreate] = useState<PendingTreeCreate | null>(null);
  const [pendingTreeRename, setPendingTreeRename] = useState<PendingTreeRename | null>(null);
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
  const [exportMode, setExportMode] = useState<ExportMode>("plain");
  const [exportPassphraseDialogOpen, setExportPassphraseDialogOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);
  const [importUnlockDialogOpen, setImportUnlockDialogOpen] = useState(false);
  const [pendingEncryptedImport, setPendingEncryptedImport] = useState<string | null>(null);
  const { sortedWorkspaces, getFoldersInWorkspace, reloadWorkspacesAndFolders, foldersRevision } =
    useWorkspaceTree();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspaceSwitcherDragTarget, setWorkspaceSwitcherDragTarget] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalConfig, setUploadModalConfig] = useState<{
    workspaceId: string;
    folderId: string | null;
    hideLocationSelectors: boolean;
  }>({
    workspaceId: "default",
    folderId: null,
    hideLocationSelectors: false,
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalConfig, setCreateModalConfig] = useState<{
    workspaceId: string;
    folderId: string | null;
    hideLocationSelectors: boolean;
  }>({
    workspaceId: "default",
    folderId: null,
    hideLocationSelectors: false,
  });
  const importInputRef = useRef<HTMLInputElement>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [disableWorkspacesDialogOpen, setDisableWorkspacesDialogOpen] = useState(false);
  const [multiSelectedDocumentIds, setMultiSelectedDocumentIds] = useState<Set<string>>(
    () => new Set()
  );
  const [multiSelectedFolderIds, setMultiSelectedFolderIds] = useState<Set<string>>(
    () => new Set()
  );
  const [selectionAnchor, setSelectionAnchor] = useState<TreeSelectKey | null>(null);
  const [treeExpansionSnapshot, setTreeExpansionSnapshot] = useState<{
    workspaceIds: string[];
    folderIds: string[];
  }>({ workspaceIds: [], folderIds: [] });
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const sidebarBlocksDeployReload =
    pendingTreeCreate !== null ||
    pendingTreeRename !== null ||
    deleteAllDialogOpen ||
    deleteWorkspaceDialogOpen ||
    deleteFolderDialogOpen ||
    deleteDocDialogOpen ||
    exportDialogOpen ||
    exportConfirmDialogOpen ||
    exportPassphraseDialogOpen ||
    importUnlockDialogOpen ||
    commandPaletteOpen ||
    settingsMenuOpen ||
    disableWorkspacesDialogOpen ||
    uploadModalOpen ||
    createModalOpen ||
    bulkDeleteDialogOpen;

  useDeploymentReloadBlock(sidebarBlocksDeployReload);

  const WORKSPACE_KEY = "md-viewer-current-workspace";

  const effectiveWorkspaceId = workspacesEnabled ? selectedWorkspaceId : "default";
  const defaultWorkspace =
    sortedWorkspaces.find((w) => w.id === "default") ?? sortedWorkspaces[0];

  const displayedWorkspaces = useMemo(() => {
    if (workspacesEnabled) {
      return selectedWorkspaceId
        ? sortedWorkspaces.filter((w) => w.id === selectedWorkspaceId)
        : sortedWorkspaces;
    }
    if (defaultWorkspace) return [defaultWorkspace];
    return sortedWorkspaces.filter((w) => w.id === "default");
  }, [workspacesEnabled, selectedWorkspaceId, sortedWorkspaces, defaultWorkspace]);

  /**
   * Stable reference when inputs are unchanged — `Search` rebuilds its MiniSearch
   * index off this array, which would otherwise happen on every Sidebar render.
   */
  const searchDocuments = useMemo(
    () =>
      workspacesEnabled
        ? selectedWorkspaceId
          ? documents.filter((d) => d.workspaceId === selectedWorkspaceId)
          : documents
        : documents.filter((d) => d.workspaceId === "default"),
    [documents, workspacesEnabled, selectedWorkspaceId]
  );

  const toolbarSearch = useMemo(
    () => ({
      documents: searchDocuments,
      query: documentSearchQuery,
      onQueryChange: onDocumentSearchQueryChange,
      onSelect: onSearchSelectDocument,
      matchNavigation: searchMatchNavigation,
    }),
    [
      searchDocuments,
      documentSearchQuery,
      onDocumentSearchQueryChange,
      onSearchSelectDocument,
      searchMatchNavigation,
    ]
  );

  useEffect(() => {
    if (!workspacesEnabled) return;
    if (sortedWorkspaces.length === 0) return;
    if (typeof window === "undefined") return;
    setSelectedWorkspaceId((prev) => {
      if (prev != null) return prev;
      const stored = localStorage.getItem(WORKSPACE_KEY);
      if (stored === "") return null;
      if (stored && sortedWorkspaces.some((w) => w.id === stored)) return stored;
      return null;
    });
  }, [sortedWorkspaces, workspacesEnabled]);

  const getFoldersSync = (workspaceId: string, parentFolderId: string | null) => {
    const folders = getFoldersInWorkspace(workspaceId);
    return folders.filter(
      (f) =>
        (parentFolderId === null && f.parentFolderId === null) ||
        (parentFolderId !== null && f.parentFolderId === parentFolderId)
    );
  };

  const getDocumentsSync = (workspaceId: string, folderId: string | null) => {
    return documents.filter(
      (d) =>
        d.workspaceId === workspaceId &&
        (folderId === null ? d.folderId === null : d.folderId === folderId)
    );
  };

  const getFoldersFlat = useCallback(
    (workspaceId: string): Folder[] => getFoldersInWorkspace(workspaceId),
    [getFoldersInWorkspace]
  );

  const refreshFoldersAndDocuments = useCallback(async () => {
    await Promise.all([reloadWorkspacesAndFolders(), onRefresh()]);
  }, [reloadWorkspacesAndFolders, onRefresh]);

  const displayedFolders = useMemo(() => {
    const list: Folder[] = [];
    for (const workspace of displayedWorkspaces) {
      list.push(...getFoldersFlat(workspace.id));
    }
    return list;
  }, [displayedWorkspaces, getFoldersFlat]);

  const clearMultiSelection = useCallback(() => {
    setMultiSelectedDocumentIds(new Set());
    setMultiSelectedFolderIds(new Set());
  }, []);

  const clearSelectionAndAnchor = useCallback(() => {
    clearMultiSelection();
    setSelectionAnchor(null);
  }, [clearMultiSelection]);

  const hasMultiSelection =
    multiSelectedDocumentIds.size > 0 || multiSelectedFolderIds.size > 0;

  const selectedCount = useMemo(
    () =>
      countSelectedItems(
        multiSelectedFolderIds,
        multiSelectedDocumentIds,
        documents,
        displayedFolders
      ),
    [multiSelectedFolderIds, multiSelectedDocumentIds, documents, displayedFolders]
  );

  const getVisibleTreeOrder = useCallback(() => {
    return buildVisibleTreeOrder(
      displayedWorkspaces.map((workspace) => workspace.id),
      treeExpansionSnapshot.workspaceIds,
      treeExpansionSnapshot.folderIds,
      getFoldersSync,
      getDocumentsSync,
      { singleWorkspaceView: Boolean(effectiveWorkspaceId) }
    );
  }, [
    displayedWorkspaces,
    treeExpansionSnapshot,
    getFoldersSync,
    getDocumentsSync,
    effectiveWorkspaceId,
  ]);

  const applySelectionSets = useCallback(
    (folderIds: Set<string>, documentIds: Set<string>) => {
      setMultiSelectedFolderIds(folderIds);
      setMultiSelectedDocumentIds(documentIds);
    },
    []
  );

  const handleDocumentTreeClick = useCallback(
    (doc: Document, event: React.MouseEvent) => {
      const targetKey = treeSelectKey("document", doc.id);

      if (isRangeSelectClick(event)) {
        if (!selectionAnchor) {
          applySelectionSets(new Set(), new Set([doc.id]));
          setSelectionAnchor(targetKey);
          onSelectDocument(doc);
          return;
        }
        const order = getVisibleTreeOrder();
        const range = getRangeSelection(order, selectionAnchor, targetKey);
        const base = keysToSelectionSets(range);
        const { folderIds, documentIds } = expandFoldersInSelection(
          base.folderIds,
          base.documentIds,
          documents,
          getFoldersFlat,
          displayedFolders
        );
        applySelectionSets(folderIds, documentIds);
        onSelectDocument(doc);
        return;
      }

      if (isModifierToggleClick(event)) {
        setMultiSelectedDocumentIds((prev) => {
          const next = new Set(prev);
          if (next.has(doc.id)) next.delete(doc.id);
          else next.add(doc.id);
          return next;
        });
        setSelectionAnchor(targetKey);
        return;
      }

      clearMultiSelection();
      onSelectDocument(doc);
    },
    [
      selectionAnchor,
      getVisibleTreeOrder,
      applySelectionSets,
      onSelectDocument,
      clearMultiSelection,
    ]
  );

  const handleFolderTreeClick = useCallback(
    (folder: Folder, workspaceId: string, event: React.MouseEvent) => {
      const targetKey = treeSelectKey("folder", folder.id);

      if (isRangeSelectClick(event)) {
        if (!selectionAnchor) {
          const { folderIds, documentIds } = toggleFolderInSelection(
            folder,
            new Set(),
            new Set(),
            documents,
            getFoldersFlat
          );
          applySelectionSets(folderIds, documentIds);
          setSelectionAnchor(targetKey);
          return;
        }
        const order = getVisibleTreeOrder();
        const range = getRangeSelection(order, selectionAnchor, targetKey);
        const base = keysToSelectionSets(range);
        const { folderIds, documentIds } = expandFoldersInSelection(
          base.folderIds,
          base.documentIds,
          documents,
          getFoldersFlat,
          displayedFolders
        );
        applySelectionSets(folderIds, documentIds);
        return;
      }

      if (isModifierToggleClick(event)) {
        setMultiSelectedFolderIds((prevFolders) => {
          setMultiSelectedDocumentIds((prevDocs) => {
            const { folderIds, documentIds } = toggleFolderInSelection(
              folder,
              prevFolders,
              prevDocs,
              documents,
              getFoldersFlat
            );
            setMultiSelectedFolderIds(folderIds);
            return documentIds;
          });
          return prevFolders;
        });
        setSelectionAnchor(targetKey);
      }
    },
    [
      selectionAnchor,
      getVisibleTreeOrder,
      applySelectionSets,
      documents,
      getFoldersFlat,
      displayedFolders,
    ]
  );

  const handleBulkDeleteConfirm = useCallback(async () => {
    const { folderIds, documentIds } = planBulkDelete(
      multiSelectedFolderIds,
      multiSelectedDocumentIds,
      documents,
      getFoldersFlat
    );

    for (const folderId of folderIds) {
      await deleteFolder(folderId);
    }
    for (const docId of documentIds) {
      if (currentId === docId) {
        await onDeleteDocument(docId);
      } else {
        await deleteDocument(docId);
      }
    }

    setBulkDeleteDialogOpen(false);
    clearSelectionAndAnchor();
    await refreshFoldersAndDocuments();
  }, [
    multiSelectedFolderIds,
    multiSelectedDocumentIds,
    documents,
    getFoldersFlat,
    currentId,
    onDeleteDocument,
    clearSelectionAndAnchor,
    refreshFoldersAndDocuments,
  ]);

  const treeMultiSelect = useMemo(
    () => ({
      selectedDocumentIds: multiSelectedDocumentIds,
      selectedFolderIds: multiSelectedFolderIds,
      onDocumentClick: handleDocumentTreeClick,
      onFolderClick: handleFolderTreeClick,
      onClearSelection: clearSelectionAndAnchor,
      onFolderNormalClick: (folder: Folder) => {
        clearMultiSelection();
        setSelectionAnchor(treeSelectKey("folder", folder.id));
      },
    }),
    [
      multiSelectedDocumentIds,
      multiSelectedFolderIds,
      handleDocumentTreeClick,
      handleFolderTreeClick,
      clearSelectionAndAnchor,
      clearMultiSelection,
    ]
  );

  const handleTreeSelectDocument = useCallback(
    (doc: Document) => {
      clearMultiSelection();
      setSelectionAnchor(treeSelectKey("document", doc.id));
      onSelectDocument(doc);
    },
    [clearMultiSelection, onSelectDocument]
  );

  useEffect(() => {
    clearSelectionAndAnchor();
  }, [effectiveWorkspaceId, clearSelectionAndAnchor]);

  useEffect(() => {
    if (!hasMultiSelection) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelectionAndAnchor();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasMultiSelection, clearSelectionAndAnchor]);

  const openUploadModal = useCallback((
    workspaceId: string,
    folderId: string | null,
    options?: { hideLocationSelectors?: boolean }
  ) => {
    setUploadModalConfig({
      workspaceId,
      folderId,
      hideLocationSelectors: Boolean(options?.hideLocationSelectors),
    });
    setUploadModalOpen(true);
  }, []);

  const openCreateModal = useCallback((
    workspaceId: string,
    folderId: string | null,
    options?: { hideLocationSelectors?: boolean }
  ) => {
    setCreateModalConfig({
      workspaceId,
      folderId,
      hideLocationSelectors: Boolean(options?.hideLocationSelectors),
    });
    setCreateModalOpen(true);
  }, []);

  const handleUploadFile = (workspaceId: string, folderId: string | null) => {
    openUploadModal(workspaceId, folderId, { hideLocationSelectors: true });
  };

  const handleUploadSubmit = async (
    files: File[],
    workspaceId: string,
    folderId: string | null
  ): Promise<{ uploaded: number; failed: number }> => {
    let uploaded = 0;
    let failed = 0;

    for (const file of files) {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
      const stem = file.name.replace(/\.(md|txt|opsly|encrypted\.json)$/i, "").trim();
      const isReadmeName = stem.toLowerCase() === "readme";
      const title = isReadmeName
        ? titleFromMarkdownContent(content)
        : stem || "Untitled";
      const result = await onAddDocument(title, content, workspaceId, folderId);
      if (result !== false) {
        uploaded += 1;
      } else {
        failed += 1;
      }
    }

    if (uploaded > 0) {
      toast.success(
        uploaded === 1
          ? `"${files[0]!.name}" uploaded`
          : `${uploaded} files uploaded`
      );
    }
    if (failed > 0 && uploaded === 0) {
      toast.error(
        failed === 1
          ? "Failed to upload file."
          : `Failed to upload ${failed} files.`
      );
    } else if (failed > 0) {
      toast.error(`${failed} file${failed === 1 ? "" : "s"} could not be uploaded.`);
    }

    return { uploaded, failed };
  };

  const handleWorkspaceSelect = (id: string | null) => {
    setSelectedWorkspaceId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(WORKSPACE_KEY, id ?? "");
    }
  };

  const handleAddWorkspace = useCallback(() => {
    setPendingTreeRename(null);
    setPendingTreeCreate({ type: "workspace", inlineTarget: "switcher-dropdown" });
  }, []);

  const getDefaultWorkspaceId = useCallback(() => {
    if (!workspacesEnabled) return "default";
    return (
      selectedWorkspaceId ??
      sortedWorkspaces.find((w) => w.id === "default")?.id ??
      sortedWorkspaces.find((w) => w.name === "Default")?.id ??
      sortedWorkspaces[0]?.id ??
      "default"
    );
  }, [workspacesEnabled, selectedWorkspaceId, sortedWorkspaces]);

  const handleWorkspacesEnabledChange = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        onWorkspacesEnabledChange(true);
        return;
      }

      setSettingsMenuOpen(false);

      const nonDefault = sortedWorkspaces.filter((w) => w.id !== "default");
      if (nonDefault.length === 0) {
        onWorkspacesEnabledChange(false);
        setSelectedWorkspaceId("default");
        if (typeof window !== "undefined") {
          localStorage.setItem(WORKSPACE_KEY, "default");
        }
        await refreshFoldersAndDocuments();
        return;
      }

      setDisableWorkspacesDialogOpen(true);
    },
    [onWorkspacesEnabledChange, sortedWorkspaces, refreshFoldersAndDocuments]
  );

  const handleDisableWorkspacesConfirm = async () => {
    await consolidateWorkspacesIntoDefault();
    setSelectedWorkspaceId("default");
    if (typeof window !== "undefined") {
      localStorage.setItem(WORKSPACE_KEY, "default");
    }
    onWorkspacesEnabledChange(false);
    setDisableWorkspacesDialogOpen(false);
    await refreshFoldersAndDocuments();
  };

  const getSidebarTreeContext = useCallback((): {
    workspaceId: string;
    folderId: string | null;
  } => {
    if (currentId) {
      const doc = documents.find((d) => d.id === currentId);
      if (doc) {
        return {
          workspaceId: workspacesEnabled ? doc.workspaceId : "default",
          folderId: doc.folderId,
        };
      }
    }

    return {
      workspaceId: getDefaultWorkspaceId(),
      folderId: null,
    };
  }, [currentId, documents, getDefaultWorkspaceId, workspacesEnabled]);

  const handleAddFile = useCallback((workspaceId: string, folderId: string | null) => {
    setPendingTreeRename(null);
    setPendingTreeCreate({ type: "file", workspaceId, parentFolderId: folderId });
  }, []);

  const handleActionBarCreateFile = useCallback(() => {
    const { workspaceId, folderId } = getSidebarTreeContext();
    handleAddFile(workspaceId, folderId);
  }, [getSidebarTreeContext, handleAddFile]);

  const handleActionBarUploadFile = useCallback(() => {
    const { workspaceId, folderId } = getSidebarTreeContext();
    openUploadModal(workspaceId, folderId, { hideLocationSelectors: true });
  }, [getSidebarTreeContext, openUploadModal]);

  const handleAddFolder = useCallback(
    (workspaceId: string, parentFolderId: string | null) => {
      setPendingTreeRename(null);
      setPendingTreeCreate({ type: "folder", workspaceId, parentFolderId });
    },
    []
  );

  const handleActionBarCreateFolder = useCallback(() => {
    const { workspaceId, folderId } = getSidebarTreeContext();
    handleAddFolder(workspaceId, folderId);
  }, [getSidebarTreeContext, handleAddFolder]);

  const handlePendingTreeCreateCancel = useCallback(() => {
    setPendingTreeCreate(null);
  }, []);

  const handlePendingTreeRenameCancel = useCallback(() => {
    setPendingTreeRename(null);
  }, []);

  useEffect(() => {
    const pendingTreeEdit = pendingTreeCreate ?? pendingTreeRename;
    if (!pendingTreeEdit) return;

    const openedAt = performance.now();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (pendingTreeCreate) {
        handlePendingTreeCreateCancel();
      } else {
        handlePendingTreeRenameCancel();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (performance.now() - openedAt < 200) return;
      const target = e.target;
      if (target instanceof Element) {
        if (target.closest(INLINE_TREE_EDIT_SELECTOR)) return;
        const dropdownInlineEditActive =
          pendingTreeCreate?.type === "workspace" ||
          (pendingTreeRename?.type === "workspace" &&
            pendingTreeRename.inlineTarget === "switcher-dropdown");
        if (
          dropdownInlineEditActive &&
          target.closest(WORKSPACE_SWITCHER_DROPDOWN_SELECTOR)
        ) {
          return;
        }
      }
      if (pendingTreeCreate) {
        handlePendingTreeCreateCancel();
      } else {
        handlePendingTreeRenameCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [
    pendingTreeCreate,
    pendingTreeRename,
    handlePendingTreeCreateCancel,
    handlePendingTreeRenameCancel,
  ]);

  const handlePendingTreeCreateSubmit = useCallback(
    async (name: string) => {
      if (!pendingTreeCreate) return;
      try {
        if (pendingTreeCreate.type === "workspace") {
          await addWorkspace(name);
        } else if (pendingTreeCreate.type === "folder") {
          await addFolder(
            pendingTreeCreate.workspaceId,
            name,
            pendingTreeCreate.parentFolderId
          );
        } else {
          const title = name.replace(/\.md$/i, "").trim() || "Untitled";
          await onAddDocument(
            title,
            "",
            pendingTreeCreate.workspaceId,
            pendingTreeCreate.parentFolderId
          );
        }
        setPendingTreeCreate(null);
        if (pendingTreeCreate.type === "folder" || pendingTreeCreate.type === "workspace") {
          await refreshFoldersAndDocuments();
        } else {
          await onRefresh();
        }
      } catch (err) {
        if (err instanceof DuplicateNameError) {
          toast.error(err.message);
        } else if (pendingTreeCreate.type === "workspace") {
          toast.error("Failed to create workspace.");
        } else if (pendingTreeCreate.type === "folder") {
          toast.error("Failed to create folder.");
        } else {
          toast.error("Failed to create file.");
        }
      }
    },
    [pendingTreeCreate, onRefresh, onAddDocument, refreshFoldersAndDocuments]
  );

  const handlePendingTreeRenameSubmit = useCallback(
    async (name: string) => {
      if (!pendingTreeRename) return;
      try {
        if (pendingTreeRename.type === "workspace") {
          await updateWorkspace(pendingTreeRename.id, name);
        } else if (pendingTreeRename.type === "folder") {
          await updateFolder(pendingTreeRename.id, name);
        } else {
          await updateDocument(pendingTreeRename.id, { title: name });
        }
        setPendingTreeRename(null);
        if (
          pendingTreeRename.type === "folder" ||
          pendingTreeRename.type === "workspace"
        ) {
          await refreshFoldersAndDocuments();
        } else {
          await onRefresh();
        }
      } catch (err) {
        if (err instanceof DuplicateNameError) {
          toast.error(err.message);
        } else if (pendingTreeRename.type === "workspace") {
          toast.error("Failed to rename workspace.");
        } else if (pendingTreeRename.type === "folder") {
          toast.error("Failed to rename folder.");
        } else {
          toast.error("Failed to rename document.");
        }
      }
    },
    [pendingTreeRename, onRefresh, refreshFoldersAndDocuments]
  );

  const handleMoveDocument = async (
    docId: string,
    workspaceId: string,
    folderId: string | null
  ) => {
    await moveDocument(docId, workspaceId, folderId);
    await onRefresh();
  };

  const handleMoveFolder = async (
    folderId: string,
    workspaceId: string,
    parentFolderId: string | null
  ) => {
    try {
      const result = await moveFolder(folderId, workspaceId, parentFolderId);
      if (result) {
        await refreshFoldersAndDocuments();
      }
    } catch (err) {
      if (err instanceof DuplicateNameError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to move folder.");
      }
    }
  };

  const handleRenameWorkspace = (
    id: string,
    name: string,
    inlineTarget: "tree" | "switcher-dropdown" = "tree"
  ) => {
    setPendingTreeCreate(null);
    setPendingTreeRename({
      type: "workspace",
      id,
      initialName: name,
      inlineTarget,
    });
  };

  const handleDeleteWorkspaceRequest = (id: string, name: string) => {
    setDeleteWorkspaceTarget({ id, name });
    setDeleteWorkspaceDialogOpen(true);
  };

  const handleDeleteWorkspaceConfirm = async () => {
    if (!deleteWorkspaceTarget) return;
    const deletedId = deleteWorkspaceTarget.id;
    await deleteWorkspace(deletedId);
    setDeleteWorkspaceTarget(null);
    setDeleteWorkspaceDialogOpen(false);
    if (deletedId === selectedWorkspaceId) {
      setSelectedWorkspaceId(null);
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKSPACE_KEY, "");
      }
    }
    await refreshFoldersAndDocuments();
  };

  const handleDeleteAllClick = () => setDeleteAllDialogOpen(true);

  const handleDeleteAllConfirm = async () => {
    if (workspacesEnabled && selectedWorkspaceId) {
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
    await refreshFoldersAndDocuments();
  };

  const queueExportDownload = useCallback(
    (
      data: AllWorkspacesExport | WorkspaceExport,
      filename: string,
      mode: ExportMode = exportMode
    ) => {
      if (mode === "encrypted") {
        setPendingExport({ data, filename });
        setExportPassphraseDialogOpen(true);
        return;
      }
      downloadExportFile(
        JSON.stringify(data, null, 2),
        filename,
        "application/json"
      );
    },
    [exportMode]
  );

  const handleExportClick = (mode: ExportMode = "plain") => {
    setExportMode(mode);
    if (!workspacesEnabled) {
      void handleExportWorkspace("default", mode);
      return;
    }
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

  const handleExportWorkspace = async (workspaceId: string, mode?: ExportMode) => {
    const data = await exportWorkspaceData(workspaceId);
    if (!data) return;
    const filename = `${data.workspace.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}-export.json`;
    queueExportDownload(data, filename, mode);
  };

  const handleExportSelected = async () => {
    const ids = Array.from(exportSelectedIds);
    if (ids.length === 0) return;
    const data =
      ids.length === sortedWorkspaces.length
        ? await exportAllWorkspacesData()
        : await exportWorkspacesData(ids);
    if (!data) return;
    const filename =
      ids.length === sortedWorkspaces.length
        ? "all-workspaces-export.json"
        : "workspaces-export.json";
    queueExportDownload(data, filename);
    setExportDialogOpen(false);
  };

  const handleEncryptedExportSubmit = async (passphrase: string) => {
    if (!pendingExport) return;
    const encrypted = await encryptWorkspaceExport(pendingExport.data, passphrase);
    downloadExportFile(
      encrypted,
      toEncryptedExportFilename(pendingExport.filename),
      "application/vnd.opsly+encrypted"
    );
    setExportPassphraseDialogOpen(false);
    setPendingExport(null);
  };

  const processImportedExportData = async (
    data: AllWorkspacesExport | WorkspaceExport
  ) => {
    if (
      "type" in data &&
      data.type === "all" &&
      "workspaces" in data &&
      Array.isArray(data.workspaces)
    ) {
      await importAllWorkspacesData(data as AllWorkspacesExport);
      setSelectedWorkspaceId(null);
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKSPACE_KEY, "");
      }
      return;
    }

    if (
      "workspace" in data &&
      "folders" in data &&
      "documents" in data &&
      Array.isArray((data as WorkspaceExport).folders) &&
      Array.isArray((data as WorkspaceExport).documents)
    ) {
      const result = await importWorkspaceData(data as WorkspaceExport);
      if (result) {
        setSelectedWorkspaceId(null);
        if (typeof window !== "undefined") {
          localStorage.setItem(WORKSPACE_KEY, "");
        }
      }
    } else {
      throw new Error("Invalid workspace export file");
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (isEncryptedWorkspaceExport(text)) {
        setPendingEncryptedImport(text);
        setImportUnlockDialogOpen(true);
        e.target.value = "";
        return;
      }
      const data = JSON.parse(text) as unknown;
      if (!data || typeof data !== "object" || !("version" in data)) {
        throw new Error("Invalid workspace export file");
      }
      await processImportedExportData(data as AllWorkspacesExport | WorkspaceExport);
      await refreshFoldersAndDocuments();
    } catch {
      toast.error("Failed to import workspace. The file may be invalid or corrupted.");
    }
    e.target.value = "";
  };

  const handleEncryptedImportUnlock = async (passphrase: string) => {
    if (!pendingEncryptedImport) return;
    const data = await decryptWorkspaceExport(pendingEncryptedImport, passphrase);
    await processImportedExportData(data);
    await refreshFoldersAndDocuments();
    setImportUnlockDialogOpen(false);
    setPendingEncryptedImport(null);
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

  const handleRenameFolder = (id: string, name: string) => {
    setPendingTreeCreate(null);
    for (const ws of sortedWorkspaces) {
      const folder = getFoldersInWorkspace(ws.id).find((f) => f.id === id);
      if (folder) {
        setPendingTreeRename({
          type: "folder",
          id,
          workspaceId: ws.id,
          parentFolderId: folder.parentFolderId,
          initialName: name,
        });
        return;
      }
    }
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
    await refreshFoldersAndDocuments();
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
    await onRefresh();
  };

  const handleRenameDocument = (id: string, title: string) => {
    setPendingTreeCreate(null);
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    setPendingTreeRename({
      type: "file",
      id,
      workspaceId: doc.workspaceId,
      folderId: doc.folderId,
      initialName: title,
    });
  };

  const selectedWorkspaceName = selectedWorkspaceId
    ? sortedWorkspaces.find((w) => w.id === selectedWorkspaceId)?.name ?? "workspace"
    : null;

  return (
    <>
      <ShadcnSidebar collapsible="offcanvas" variant="inset" className="print:hidden">
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.opsly,application/json"
        onChange={handleImportFileChange}
        className="hidden"
      />
      <SidebarContent className="flex min-h-0 flex-col overflow-hidden px-3">
        <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b-2 border-border pb-3 pt-3">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="sr-only">Sidebar</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <Link
                  href="/"
                  aria-label="Opsly MD home"
                  className="flex min-w-0 shrink items-center leading-none no-underline hover:opacity-90"
                >
                  <HeaderLogo className="h-7 w-auto max-w-full" />
                </Link>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    Collapse sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div className="mb-0 shrink-0 border-b-2 border-border pb-3 pt-3">
          {workspacesEnabled ? (
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="sr-only">Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <WorkspaceSwitcher
                  workspaces={sortedWorkspaces}
                  selectedId={selectedWorkspaceId}
                  dragTargetActive={workspaceSwitcherDragTarget}
                  onSelect={handleWorkspaceSelect}
                  onAddWorkspace={handleAddWorkspace}
                  onCreateFile={handleActionBarCreateFile}
                  onUploadFile={handleActionBarUploadFile}
                  onCreateFolder={handleActionBarCreateFolder}
                  onRenameWorkspace={handleRenameWorkspace}
                  pendingTreeCreate={pendingTreeCreate}
                  onPendingTreeCreateSubmit={handlePendingTreeCreateSubmit}
                  onPendingTreeCreateCancel={handlePendingTreeCreateCancel}
                  pendingTreeRename={pendingTreeRename}
                  onPendingTreeRenameSubmit={handlePendingTreeRenameSubmit}
                  onPendingTreeRenameCancel={handlePendingTreeRenameCancel}
                  search={toolbarSearch}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="sr-only">Files</SidebarGroupLabel>
              <SidebarGroupContent>
                <WorkspaceActionBar
                  onCreateFile={handleActionBarCreateFile}
                  onUploadFile={handleActionBarUploadFile}
                  onCreateFolder={handleActionBarCreateFolder}
                  search={toolbarSearch}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>

        {hasMultiSelection ? (
          <TreeMultiSelectBar
            className="border-b-2 border-border"
            selectedCount={selectedCount}
            onDelete={() => setBulkDeleteDialogOpen(true)}
            onClear={clearSelectionAndAnchor}
          />
        ) : null}

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
          <SidebarGroup className="flex-1 border-b-0 p-0">
            <SidebarGroupContent>
              <WorkspaceTree
              key={foldersRevision}
              workspaces={displayedWorkspaces}
              folders={getFoldersSync}
              documents={getDocumentsSync}
              flatDocuments={documents}
              getFoldersFlat={getFoldersFlat}
              currentId={currentId}
              selectedWorkspaceId={effectiveWorkspaceId}
              workspacesEnabled={workspacesEnabled}
              onSelectDocument={handleTreeSelectDocument}
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
              onWorkspaceDragTargetChange={setWorkspaceSwitcherDragTarget}
              pendingTreeCreate={pendingTreeCreate}
              onPendingTreeCreateSubmit={handlePendingTreeCreateSubmit}
              onPendingTreeCreateCancel={handlePendingTreeCreateCancel}
              pendingTreeRename={pendingTreeRename}
              onPendingTreeRenameSubmit={handlePendingTreeRenameSubmit}
              onPendingTreeRenameCancel={handlePendingTreeRenameCancel}
              treeMultiSelect={treeMultiSelect}
              onTreeExpansionSnapshot={setTreeExpansionSnapshot}
            />
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div className="shrink-0 border-t-2 border-border py-2">
          <SettingsMenu
            onOpenChange={setSettingsMenuOpen}
            documentStackEnabled={documentStackEnabled}
            onDocumentStackEnabledChange={onDocumentStackEnabledChange}
            workspacesEnabled={workspacesEnabled}
            onWorkspacesEnabledChange={handleWorkspacesEnabledChange}
            onImport={() => {
              setSettingsMenuOpen(false);
              window.setTimeout(() => importInputRef.current?.click(), 0);
            }}
            onExport={(mode) => {
              setSettingsMenuOpen(false);
              handleExportClick(mode);
            }}
            onDeleteAll={() => {
              setSettingsMenuOpen(false);
              handleDeleteAllClick();
            }}
            deleteLabel={
              workspacesEnabled && selectedWorkspaceId ? "Delete Workspace" : "Delete Everything"
            }
          />
        </div>
        </div>
      </SidebarContent>
    </ShadcnSidebar>

      <AlertDialog open={exportConfirmDialogOpen} onOpenChange={setExportConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {exportMode === "encrypted" ? "Export workspace encrypted" : "Export workspace"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {exportMode === "encrypted" ? (
                <>
                  Export &quot;{selectedWorkspaceName}&quot; as an encrypted file? You will choose a
                  passphrase next. The export includes the workspace, all folders, and documents.
                </>
              ) : (
                <>
                  Export &quot;{selectedWorkspaceName}&quot; as a JSON file? This will include the
                  workspace, all folders, and documents.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleExportConfirm()}>
              {exportMode === "encrypted" ? "Continue" : "Export"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {workspacesEnabled && selectedWorkspaceId
                ? <>Delete &quot;{selectedWorkspaceName}&quot; and all its contents?</>
                : "Delete all workspaces, folders, and documents?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {workspacesEnabled && selectedWorkspaceId ? (
                <>
                  This will permanently delete the workspace &quot;{selectedWorkspaceName}&quot; and
                  everything inside it (folders and documents). This action cannot be undone.
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
              {workspacesEnabled && selectedWorkspaceId ? "Delete Workspace" : "Delete Everything"}
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} {selectedCount === 1 ? "item" : "items"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected files and folders (including everything
              inside selected folders). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                void handleBulkDeleteConfirm();
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
            <DialogTitle>
              {exportMode === "encrypted"
                ? "Export workspaces encrypted"
                : "Export workspaces"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <label className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-sidebar-accent">
              <Checkbox
                checked={
                  sortedWorkspaces.length > 0 &&
                  exportSelectedIds.size === sortedWorkspaces.length
                }
                onCheckedChange={toggleExportSelectAll}
              />
              <span className="text-sm font-medium">Select all</span>
            </label>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1 border border-2 rounded-md p-2">
              {sortedWorkspaces.map((ws) => (
                <label
                  key={ws.id}
                  className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-sidebar-accent"
                >
                  <Checkbox
                    checked={exportSelectedIds.has(ws.id)}
                    onCheckedChange={() => toggleExportWorkspace(ws.id)}
                  />
                  <span className="text-sm truncate">{ws.name}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="neutral"
              className="bg-background"
              onClick={() => setExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleExportSelected()}
              disabled={exportSelectedIds.size === 0}
              className="bg-background text-foreground hover:bg-primary/90"
            >
              {exportMode === "encrypted" ? "Continue" : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={disableWorkspacesDialogOpen}
        onOpenChange={setDisableWorkspacesDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable workspaces?</AlertDialogTitle>
            <AlertDialogDescription>
              Other workspaces will become folders under Default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                void handleDisableWorkspacesConfirm();
              }}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SetPassphraseDialog
        open={exportPassphraseDialogOpen}
        onOpenChange={setExportPassphraseDialogOpen}
        title="Encrypt export"
        description={
          <>
            Choose a passphrase to encrypt this export. You will need it to import the
            file later.
          </>
        }
        submitLabel="Export"
        submittingLabel="Encrypting…"
        onSubmit={handleEncryptedExportSubmit}
        onCancel={() => {
          setExportPassphraseDialogOpen(false);
          setPendingExport(null);
        }}
      />

      <UnlockDocumentDialog
        open={importUnlockDialogOpen}
        onOpenChange={setImportUnlockDialogOpen}
        documentTitle="Encrypted export"
        onUnlock={handleEncryptedImportUnlock}
        onCancel={() => {
          setImportUnlockDialogOpen(false);
          setPendingEncryptedImport(null);
        }}
      />

      <UploadFileModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        initialWorkspaceId={uploadModalConfig.workspaceId}
        initialFolderId={uploadModalConfig.folderId}
        hideLocationSelectors={uploadModalConfig.hideLocationSelectors}
        workspacesEnabled={workspacesEnabled}
        onUpload={handleUploadSubmit}
      />

      <CreateMarkdownModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialWorkspaceId={createModalConfig.workspaceId}
        initialFolderId={createModalConfig.folderId}
        hideLocationSelectors={createModalConfig.hideLocationSelectors}
        workspacesEnabled={workspacesEnabled}
        onCreate={onAddDocument}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        handlers={{
          onCreateDocument: handleActionBarCreateFile,
          onCreateFolder: handleActionBarCreateFolder,
          onSearchDocuments: () => setOpen(true),
          ...(workspacesEnabled
            ? {
                onSwitchWorkspace: () => setOpen(true),
                onExportWorkspace: () => handleExportClick("plain"),
                onImportWorkspace: handleImportWorkspace,
              }
            : {}),
        }}
      />
    </>
  );
}

"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function hashContent(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

import type { Document } from "@/types/document";
import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  getWorkspacesEnabled,
  setWorkspacesEnabled as persistWorkspacesEnabled,
  DuplicateNameError,
} from "@/lib/storage";
import { scrollToSearchMatch } from "@/lib/search-highlight";
import { EmptyState } from "@/components/EmptyState";
import { Sidebar } from "@/components/Sidebar";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { TableOfContents } from "@/components/TableOfContents";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn, appCapsuleClassName } from "@/lib/utils";
import { workspaceToolbarTextActionClassName } from "@/components/WorkspaceSwitcher";
import {
  getTreeDocumentDragId,
  isTreeDocumentDrag,
} from "@/lib/workspace-tree-drag";
import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useDeploymentReloadBlock } from "@/components/DeploymentReloadGuard";
import { WorkspaceTreeProvider } from "@/context/WorkspaceTreeContext";
import {
  useDocumentEncryption,
  EncryptedDocumentPlaceholder,
  DocumentSecurityMenu,
  DocumentDownloadButton,
  DocumentSecurityState,
  isStoredContentEncrypted,
  getStoredDownloadPayload,
  getExportMarkdownPayload,
  triggerBrowserDownload,
  ExportMarkdownDialog,
  getSecurityStatusLabel,
  type DocumentEncryptionCallbacks,
} from "@/features/document-encryption";

const CURRENT_DOC_KEY = "md-viewer-current-doc";
const RIGHT_TOC_OPEN_KEY = "md-viewer-right-toc-open";
const DOC_STACK_ENABLED_KEY = "md-viewer-doc-stack-enabled";
const EDIT_AUTOSAVE_INTERVAL_SEC = 10;

/**
 * Open Radix overlays that handle Escape. Used in the capture phase so we still see
 * [data-state=open] before Radix dismisses a dialog (in the bubble phase, React may
 * already have unmounted the overlay — causing a second Esc effect).
 */
const ESCAPE_BLOCKING_OVERLAY_SELECTOR = [
  '[data-state="open"][data-slot="dialog-content"]',
  '[data-state="open"][data-slot="alert-dialog-content"]',
  '[data-state="open"][data-slot="sheet-content"]',
  '[data-state="open"][data-slot="dropdown-menu-content"]',
].join(",");

function hasOpenEscapeBlockingOverlay(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector(ESCAPE_BLOCKING_OVERLAY_SELECTOR) !== null;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DocumentInfo({ doc, content }: { doc: Document; content: string }) {
  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0;
  const readingMinutes = wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 200));
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <div>
        <span className="font-medium text-foreground">Created</span>
        <p>{formatDate(doc.createdAt)}</p>
      </div>
      <div>
        <span className="font-medium text-foreground">Words</span>
        <p>{wordCount.toLocaleString()}</p>
      </div>
      <div>
        <span className="font-medium text-foreground">Reading time</span>
        <p>~{readingMinutes} min</p>
      </div>
    </div>
  );
}

function useLgAndUp() {
  const [lg, setLg] = useState(
    () =>
      typeof globalThis !== "undefined" &&
      "matchMedia" in globalThis &&
      globalThis.matchMedia("(min-width: 1024px)").matches
  );
  useEffect(() => {
    const mq = globalThis.matchMedia("(min-width: 1024px)");
    const on = () => setLg(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return lg;
}

/** Shown on the main panel when the sidebar is collapsed (off-canvas or mobile sheet closed). */
function SidebarExpandTrigger() {
  const { state, isMobile, openMobile } = useSidebar();
  const sidebarCollapsed = isMobile ? !openMobile : state === "collapsed";
  if (!sidebarCollapsed) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SidebarTrigger className="absolute left-2 top-2 z-20 print:hidden" />
      </TooltipTrigger>
      <TooltipContent side="right" align="start">
        Open sidebar
      </TooltipContent>
    </Tooltip>
  );
}

/** Wider reading column when the left sidebar or right TOC (or both) is collapsed. */
function DocumentColumn({
  rightTocOpen,
  className,
  children,
}: {
  rightTocOpen: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { open, isMobile } = useSidebar();
  const isLg = useLgAndUp();
  const leftSidebarExpanded = !isMobile && open;
  const rightTocTakesSpace = isLg && rightTocOpen;
  const tightPanels =
    (leftSidebarExpanded ? 1 : 0) + (rightTocTakesSpace ? 1 : 0);
  const maxClass =
    tightPanels >= 2
      ? "max-w-4xl"
      : tightPanels === 1
        ? "max-w-6xl"
        : "max-w-7xl";

  return (
    <div
      className={cn(
        // Inset for box-shadow (--shadow: 2px 2px); overflow-x-clip would otherwise crop right-aligned buttons.
        "relative mx-auto w-full min-w-0 max-w-full overflow-x-clip pb-1 pr-1 transition-[max-width] duration-200 ease-linear",
        maxClass,
        className
      )}
    >
      {children}
    </div>
  );
}

function DocumentRightSidebar({
  doc,
  content,
  contentScrollRef,
}: {
  doc: Document;
  content: string;
  contentScrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Tabs defaultValue="on-this-page" className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 shrink-0">
        <TabsList className="h-9 w-full shrink-0 justify-start gap-1.5 border-0 bg-transparent p-0">
          <TabsTrigger value="on-this-page" className="h-9 flex-none px-3">
            On This Page
          </TabsTrigger>
          <TabsTrigger value="info" className="h-9 flex-none px-3">
            Info
          </TabsTrigger>
        </TabsList>
        <div className="mt-2 border-b-2 border-border" aria-hidden />
      </div>
      <TabsContent value="on-this-page" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
        <TableOfContents
          key={`${doc.id}-${hashContent(content)}`}
          content={content}
          scrollContainerRef={contentScrollRef}
        />
      </TabsContent>
      <TabsContent
        value="info"
        className="native-scrollbar-transparent-track mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pr-4"
      >
        <DocumentInfo doc={doc} content={content} />
      </TabsContent>
    </Tabs>
  );
}

function AppContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const navigatingToHomeRef = useRef(false);
  const justSelectedDocIdRef = useRef<string | null>(null);
  const selectDocumentGenerationRef = useRef(0);
  const currentDocIdRef = useRef<string | null>(null);
  currentDocIdRef.current = currentDoc?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [documentViewMode, setDocumentViewMode] = useState<"edit" | "preview">(
    "preview"
  );
  const editMode = documentViewMode === "edit";
  const [draftContent, setDraftContent] = useState("");
  const scrollTopBeforeEditRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);
  const openEditOnDocIdRef = useRef<string | null>(null);
  const prevDocIdForEditRef = useRef<string | null>(null);
  const [rightTocOpen, setRightTocOpen] = useState(true);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [documentStackEnabled, setDocumentStackEnabled] = useState(true);
  const [workspacesEnabled, setWorkspacesEnabled] = useState(false);
  const workspacesSettingLoadedRef = useRef(false);
  const [docStackIds, setDocStackIds] = useState<string[]>([]);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const markdownArticleRef = useRef<HTMLElement>(null);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [searchActiveMatchIndex, setSearchActiveMatchIndex] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [editAutosaveUi, setEditAutosaveUi] = useState<"idle" | "saving" | "saved">("idle");
  const [editAutosaveSecs, setEditAutosaveSecs] = useState<number | null>(null);
  const [mainPanelDocDragOver, setMainPanelDocDragOver] = useState(false);

  const encryptionPersistenceRef = useRef<
    Pick<DocumentEncryptionCallbacks, "onDocumentEncrypted" | "onEncryptionRemoved">
  >({});

  const encryption = useDocumentEncryption(currentDoc, {
    onDocumentEncrypted: (args) =>
      encryptionPersistenceRef.current.onDocumentEncrypted?.(args) ??
      Promise.resolve(),
    onEncryptionRemoved: (args) =>
      encryptionPersistenceRef.current.onEncryptionRemoved?.(args) ??
      Promise.resolve(),
  });
  const displayContent =
    encryption.session.documentId === currentDoc?.id
      ? encryption.session.displayContent
      : (currentDoc?.content ?? "");

  const isEncryptedAtRest =
    encryption.session.documentId === currentDoc?.id &&
    isStoredContentEncrypted(encryption.session.storedContent);

  const securityStatusLabel = getSecurityStatusLabel(
    encryption.session.securityState,
    isEncryptedAtRest
  );

  const hasUnsavedDraft =
    !!currentDoc && draftContent !== displayContent;
  /** Autosave only after a document has saved content (skip brand-new empty files). */
  const allowEditAutosave = displayContent.trim().length > 0;
  const editDirty = editMode && hasUnsavedDraft;
  const previewContent = hasUnsavedDraft ? draftContent : displayContent;
  useDeploymentReloadBlock(editMode || hasUnsavedDraft);
  useEffect(() => {
    if (!hasUnsavedDraft) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedDraft]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(RIGHT_TOC_OPEN_KEY);
    setRightTocOpen(v !== "0");
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(DOC_STACK_ENABLED_KEY);
    if (v === "0") setDocumentStackEnabled(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DOC_STACK_ENABLED_KEY, documentStackEnabled ? "1" : "0");
  }, [documentStackEnabled]);

  useEffect(() => {
    if (typeof window === "undefined" || !workspacesSettingLoadedRef.current) return;
    void persistWorkspacesEnabled(workspacesEnabled);
  }, [workspacesEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(RIGHT_TOC_OPEN_KEY, rightTocOpen ? "1" : "0");
  }, [rightTocOpen]);
  const currentDocId = currentDoc?.id;

  useEffect(() => {
    if (!currentDocId) return;
    if (encryption.session.documentId !== currentDocId) return;
    if (encryption.session.securityState !== DocumentSecurityState.Unlocked) return;
    setCurrentDoc((prev) =>
      prev?.id === currentDocId
        ? { ...prev, content: encryption.session.displayContent }
        : prev
    );
  }, [
    currentDocId,
    encryption.session.documentId,
    encryption.session.securityState,
    encryption.session.displayContent,
  ]);

  const refresh = useCallback(async () => {
    const docs = await getDocuments();
    setDocuments(docs);
    setCurrentDoc((prev) => {
      if (!prev) return prev;
      const fresh = docs.find((d) => d.id === prev.id) ?? prev;
      if (encryption.session.documentId !== fresh.id) {
        return fresh;
      }
      if (
        encryption.session.securityState === DocumentSecurityState.Unlocked ||
        encryption.session.securityState === DocumentSecurityState.Encrypted
      ) {
        return { ...fresh, content: encryption.session.displayContent };
      }
      return fresh;
    });
  }, [encryption.session]);

  useEffect(() => {
    async function init() {
      try {
        const workspacesOn = await getWorkspacesEnabled();
        await refresh();
        setWorkspacesEnabled(workspacesOn);
        workspacesSettingLoadedRef.current = true;
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [refresh]);

  /** Seed stack when a doc is shown from URL/storage but stack is still empty. */
  useEffect(() => {
    if (!documentStackEnabled) return;
    const docId = currentDoc?.id;
    if (!docId) return;
    setDocStackIds((prev) => (prev.length === 0 ? [docId] : prev));
  }, [documentStackEnabled, currentDoc?.id]);

  useEffect(() => {
    if (documents.length === 0) {
      setCurrentDoc(null);
      return;
    }
    if (navigatingToHomeRef.current) {
      setCurrentDoc(null);
      if (!searchParams.get("doc")) {
        navigatingToHomeRef.current = false;
      }
      return;
    }
    if (currentDocIdRef.current && !documents.find((d) => d.id === currentDocIdRef.current)) {
      setCurrentDoc(documents[0] ?? null);
      return;
    }
    // Skip URL→state sync until router.replace catches up after select/create.
    if (justSelectedDocIdRef.current) {
      const pendingId = justSelectedDocIdRef.current;
      const urlDocId = searchParams.get("doc");
      if (urlDocId === pendingId) {
        justSelectedDocIdRef.current = null;
      }
      return;
    }
    const docIdFromUrl = searchParams.get("doc");
    const docIdFromStorage =
      typeof window !== "undefined" ? localStorage.getItem(CURRENT_DOC_KEY) : null;
    const preferredId = docIdFromUrl ?? docIdFromStorage;
    const preferred = preferredId
      ? documents.find((d) => d.id === preferredId)
      : null;
    if (preferred && preferred.id !== currentDocIdRef.current) {
      setCurrentDoc(preferred);
    }
  }, [documents, searchParams]);

  useLayoutEffect(() => {
    const docId = currentDoc?.id ?? null;

    if (docId !== prevDocIdForEditRef.current) {
      prevDocIdForEditRef.current = docId;

      if (!docId) {
        setDocumentViewMode("preview");
        shouldRestoreScrollRef.current = false;
        return;
      }

      if (openEditOnDocIdRef.current === docId) {
        openEditOnDocIdRef.current = null;
        shouldRestoreScrollRef.current = false;
        scrollTopBeforeEditRef.current = 0;
        if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
        setDraftContent(currentDoc?.content ?? "");
        setDocumentViewMode("edit");
        return;
      }

      setDocumentViewMode("preview");
      shouldRestoreScrollRef.current = false;
      setDraftContent(currentDoc?.content ?? "");
    }
  }, [currentDoc?.id, currentDoc?.content]);

  useLayoutEffect(() => {
    if (editMode) return;
    if (!shouldRestoreScrollRef.current) return;
    shouldRestoreScrollRef.current = false;
    const vp = contentScrollRef.current;
    if (vp) vp.scrollTop = scrollTopBeforeEditRef.current;
  }, [editMode]);

  useEffect(() => {
    const docId = currentDoc?.id;
    if (!docId || typeof window === "undefined") return;
    localStorage.setItem(CURRENT_DOC_KEY, docId);
    // Do NOT sync currentDoc→URL here. That causes a race: router.replace is async,
    // so Effect 1 can run with stale searchParams and revert the user's selection.
    // URL is updated only in onSelectDocument.
  }, [currentDoc?.id]);

  const handleAddDocument = useCallback(
    async (
      title: string,
      content: string,
      workspaceId?: string,
      folderId?: string | null
    ): Promise<boolean> => {
      const wsId = workspacesEnabled ? (workspaceId ?? "default") : "default";
      try {
        const decision = await encryption.prepareContentForSave(content, {
          interactive: true,
        });
        if (!decision || decision.action === "cancel") {
          return false;
        }

        const doc = await addDocument(
          { title, content: decision.content, workspaceId: wsId, folderId: folderId ?? null },
          { workspaceId: wsId, folderId: folderId ?? null }
        );
        const updated = await getDocuments();
        justSelectedDocIdRef.current = doc.id;
        currentDocIdRef.current = doc.id;
        encryption.onSaveSucceeded(
          doc.id,
          decision.content,
          content,
          decision.passphrase ?? null
        );
        setDocuments(updated);
        if (!content.trim()) {
          openEditOnDocIdRef.current = doc.id;
          scrollTopBeforeEditRef.current = 0;
          if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
          setDraftContent(content);
          setDocumentViewMode("edit");
        }
        setCurrentDoc({ ...doc, content });
        if (documentStackEnabled) {
          setDocStackIds((prev) => [...prev.filter((i) => i !== doc.id), doc.id]);
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set("doc", doc.id);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        return true;
      } catch (err) {
        if (err instanceof DuplicateNameError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to create document.");
        }
        return false;
      }
    },
    [router, pathname, searchParams, documentStackEnabled, encryption]
  );

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      await deleteDocument(id);
      const updated = await getDocuments();
      setDocuments(updated);
      const nextStack = docStackIds.filter((x) => x !== id);
      setDocStackIds(nextStack);
      setCurrentDoc((prev) => {
        if (prev?.id !== id) return prev;
        if (documentStackEnabled && nextStack.length > 0) {
          const topId = nextStack[nextStack.length - 1];
          return updated.find((d) => d.id === topId) ?? null;
        }
        return updated[0] ?? null;
      });
    },
    [documentStackEnabled, docStackIds]
  );

  const handleShowEditView = useCallback(() => {
    if (!currentDoc || encryption.isLocked) return;
    const vp = contentScrollRef.current;
    scrollTopBeforeEditRef.current = vp?.scrollTop ?? 0;
    if (vp) vp.scrollTop = 0;
    // Keep unsaved draft when returning from preview; sync only when clean.
    setDraftContent((prev) =>
      prev !== displayContent ? prev : displayContent
    );
    setDocumentViewMode("edit");
  }, [currentDoc, displayContent, encryption.isLocked]);

  const handleShowPreviewView = useCallback((restoreScroll: boolean) => {
    shouldRestoreScrollRef.current = restoreScroll;
    setDocumentViewMode("preview");
  }, []);

  useEffect(() => {
    if (!editMode) setEditAutosaveUi("idle");
  }, [editMode]);

  useEffect(() => {
    if (editAutosaveUi !== "saved") return;
    const t = window.setTimeout(() => setEditAutosaveUi("idle"), 4000);
    return () => window.clearTimeout(t);
  }, [editAutosaveUi]);

  useEffect(() => {
    if (editAutosaveUi === "saved" && editDirty) {
      setEditAutosaveUi("idle");
    }
  }, [editDirty, editAutosaveUi]);

  const handleEditSave = useCallback(
    async (options?: { exitEditAfter?: boolean }) => {
      const exitEditAfter = options?.exitEditAfter ?? true;
      if (!currentDoc) return;
      if (!exitEditAfter) {
        setEditAutosaveUi("saving");
      }
      try {
        const decision = await encryption.prepareContentForSave(draftContent, {
          interactive: exitEditAfter,
        });
        if (!decision) {
          if (!exitEditAfter) {
            setEditAutosaveUi("idle");
          }
          return;
        }
        if (decision.action === "cancel") {
          if (!exitEditAfter) {
            setEditAutosaveUi("idle");
          }
          return;
        }

        const updated = await updateDocument(currentDoc.id, {
          content: decision.content,
        });
        if (updated) {
          encryption.onSaveSucceeded(
            currentDoc.id,
            decision.content,
            draftContent,
            decision.passphrase ?? encryption.session.passphrase
          );
          setCurrentDoc({ ...updated, content: draftContent });
          await refresh();
        }
        if (exitEditAfter) {
          handleShowPreviewView(true);
        } else {
          setEditAutosaveUi("saved");
        }
      } catch (err) {
        if (!exitEditAfter) {
          setEditAutosaveUi("idle");
        }
        if (err instanceof DuplicateNameError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to save document.");
        }
      }
    },
    [currentDoc, draftContent, refresh, handleShowPreviewView, encryption]
  );

  const handleEditSaveRef = useRef(handleEditSave);
  handleEditSaveRef.current = handleEditSave;

  const editAutosaveLatestRef = useRef({
    draft: "",
    savedContent: "",
  });
  editAutosaveLatestRef.current = {
    draft: draftContent,
    savedContent: displayContent,
  };

  useEffect(() => {
    if (!currentDoc?.id || !hasUnsavedDraft || !allowEditAutosave) {
      setEditAutosaveSecs(null);
      return;
    }
    let secCount = 0;
    const latest0 = editAutosaveLatestRef.current;
    setEditAutosaveSecs(
      latest0.draft !== latest0.savedContent ? EDIT_AUTOSAVE_INTERVAL_SEC : null
    );

    const id = window.setInterval(() => {
      secCount += 1;
      const latest = editAutosaveLatestRef.current;
      const dirty = latest.draft !== latest.savedContent;
      if (secCount % EDIT_AUTOSAVE_INTERVAL_SEC === 0 && dirty) {
        void handleEditSaveRef.current({ exitEditAfter: false });
      }
      const rem =
        secCount % EDIT_AUTOSAVE_INTERVAL_SEC === 0
          ? EDIT_AUTOSAVE_INTERVAL_SEC
          : EDIT_AUTOSAVE_INTERVAL_SEC - (secCount % EDIT_AUTOSAVE_INTERVAL_SEC);
      setEditAutosaveSecs(dirty ? rem : null);
    }, 1000);

    return () => {
      window.clearInterval(id);
      setEditAutosaveSecs(null);
    };
  }, [currentDoc?.id, hasUnsavedDraft, allowEditAutosave]);

  const performDownloadStored = useCallback(async () => {
    if (!currentDoc) return;
    const fresh = await getDocument(currentDoc.id);
    if (!fresh) {
      toast.error("Failed to download document.");
      return;
    }
    triggerBrowserDownload(
      getStoredDownloadPayload(fresh.content, fresh.title)
    );
  }, [currentDoc]);

  const performExportMarkdown = useCallback(() => {
    if (!currentDoc || encryption.isLocked) return;
    triggerBrowserDownload(
      getExportMarkdownPayload(displayContent, currentDoc.title)
    );
    setExportConfirmOpen(false);
  }, [currentDoc, displayContent, encryption.isLocked]);

  const handleExportMarkdownRequest = useCallback(() => {
    if (!currentDoc) return;
    if (encryption.isLocked) {
      encryption.reopenUnlockDialog();
      return;
    }
    setExportConfirmOpen(true);
  }, [currentDoc, encryption]);

  const handleLockNow = useCallback(() => {
    if (editMode) {
      handleShowPreviewView(false);
    }
    encryption.lockDocument();
  }, [editMode, handleShowPreviewView, encryption]);

  const handleEncryptDocumentRequest = useCallback(() => {
    if (!currentDoc || isEncryptedAtRest) return;
    const content = editMode ? draftContent : displayContent;
    encryption.openEncryptDocumentDialog(content);
  }, [
    currentDoc,
    isEncryptedAtRest,
    editMode,
    draftContent,
    displayContent,
    encryption,
  ]);

  const handleRemoveEncryptionRequest = useCallback(() => {
    encryption.openRemoveEncryptionDialog();
  }, [encryption]);

  encryptionPersistenceRef.current = {
    onDocumentEncrypted: async ({
      documentId,
      encrypted,
      markdown,
      passphrase,
    }) => {
      const updated = await updateDocument(documentId, { content: encrypted });
      if (!updated) {
        toast.error("Failed to encrypt document.");
        return;
      }
      encryption.onSaveSucceeded(documentId, encrypted, markdown, passphrase);
      setCurrentDoc({ ...updated, content: markdown });
      if (editMode && currentDoc?.id === documentId) {
        setDraftContent(markdown);
      }
      await refresh();
      toast.success("Document encrypted.");
    },
    onEncryptionRemoved: async ({ documentId, markdown }) => {
      const updated = await updateDocument(documentId, { content: markdown });
      if (!updated) {
        toast.error("Failed to remove encryption.");
        return;
      }
      encryption.onSaveSucceeded(documentId, markdown, markdown, null);
      setCurrentDoc({ ...updated, content: markdown });
      if (editMode && currentDoc?.id === documentId) {
        setDraftContent(markdown);
      }
      await refresh();
      toast.success("Encryption removed.");
    },
  };

  const handlePreviewContentChange = useCallback(
    async (content: string) => {
      if (!currentDoc || encryption.isLocked) return;
      const previousContent = displayContent;
      setCurrentDoc({ ...currentDoc, content });
      try {
        const decision = await encryption.prepareContentForSave(content, {
          interactive: true,
        });
        if (!decision || decision.action === "cancel") {
          setCurrentDoc({ ...currentDoc, content: previousContent });
          return;
        }
        const updated = await updateDocument(currentDoc.id, {
          content: decision.content,
        });
        if (updated) {
          encryption.onSaveSucceeded(
            currentDoc.id,
            decision.content,
            content,
            decision.passphrase ?? encryption.session.passphrase
          );
          setCurrentDoc({ ...updated, content });
          await refresh();
        }
      } catch (err) {
        setCurrentDoc({ ...currentDoc, content: previousContent });
        if (err instanceof DuplicateNameError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to update document.");
        }
      }
    },
    [currentDoc, displayContent, refresh, encryption]
  );

  const handleSelectDocument = useCallback(
    async (doc: Document) => {
      const generation = ++selectDocumentGenerationRef.current;
      navigatingToHomeRef.current = false;
      justSelectedDocIdRef.current = doc.id;
      setDocumentViewMode("preview");
      setCurrentDoc(doc);
      const fresh = await getDocument(doc.id);
      if (generation !== selectDocumentGenerationRef.current) return;
      setCurrentDoc(fresh ?? doc);
      if (documentStackEnabled) {
        setDocStackIds((prev) => [...prev.filter((i) => i !== doc.id), doc.id]);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("doc", doc.id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, documentStackEnabled]
  );

  useEffect(() => {
    const clearMainPanelDragOver = () => setMainPanelDocDragOver(false);
    window.addEventListener("dragend", clearMainPanelDragOver);
    return () => window.removeEventListener("dragend", clearMainPanelDragOver);
  }, []);

  const handleMainPanelDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isTreeDocumentDrag(e)) {
      setMainPanelDocDragOver(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setMainPanelDocDragOver(true);
  }, []);

  const handleMainPanelDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setMainPanelDocDragOver(false);
  }, []);

  const handleMainPanelDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setMainPanelDocDragOver(false);
      const docId = getTreeDocumentDragId(e);
      if (!docId) return;
      const doc = documents.find((d) => d.id === docId);
      if (doc) void handleSelectDocument(doc);
    },
    [documents, handleSelectDocument]
  );

  const handleDocumentSearchQueryChange = useCallback((query: string) => {
    setDocumentSearchQuery(query);
    setSearchActiveMatchIndex(0);
  }, []);

  const handleSearchMatchCountChange = useCallback((count: number) => {
    setSearchMatchCount(count);
    setSearchActiveMatchIndex((active) => {
      if (count <= 0) return 0;
      return active >= count ? 0 : active;
    });
  }, []);

  const handlePreviousSearchMatch = useCallback(() => {
    if (searchMatchCount <= 0) return;
    setSearchActiveMatchIndex(
      (active) => (active - 1 + searchMatchCount) % searchMatchCount
    );
  }, [searchMatchCount]);

  const handleNextSearchMatch = useCallback(() => {
    if (searchMatchCount <= 0) return;
    setSearchActiveMatchIndex((active) => (active + 1) % searchMatchCount);
  }, [searchMatchCount]);

  const handleSearchSelectDocument = useCallback(
    (doc: Document) => {
      setSearchActiveMatchIndex(0);
      void handleSelectDocument(doc);
    },
    [handleSelectDocument]
  );

  useLayoutEffect(() => {
    if (!documentSearchQuery.trim() || !currentDoc || editMode) return;

    const viewport = contentScrollRef.current;
    if (!viewport) return;

    scrollToSearchMatch(viewport, searchActiveMatchIndex);
  }, [
    documentSearchQuery,
    searchActiveMatchIndex,
    searchMatchCount,
    currentDoc,
    editMode,
  ]);

  const handleCloseDocument = useCallback(async () => {
    if (documentStackEnabled && docStackIds.length > 1) {
      const nextStack = docStackIds.slice(0, -1);
      const topId = nextStack[nextStack.length - 1];
      setDocStackIds(nextStack);
      navigatingToHomeRef.current = false;
      const fresh = await getDocument(topId);
      setCurrentDoc(fresh ?? null);
      if (typeof window !== "undefined") {
        localStorage.setItem(CURRENT_DOC_KEY, topId);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("doc", topId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      return;
    }
    if (documentStackEnabled) {
      setDocStackIds([]);
    }
    navigatingToHomeRef.current = true;
    setCurrentDoc(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_DOC_KEY);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("doc");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [documentStackEnabled, docStackIds, router, pathname, searchParams]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (exportConfirmOpen || hasOpenEscapeBlockingOverlay()) return;
      if (document.querySelector('[data-inline-tree-edit="true"]')) return;
      if (!currentDoc) return;
      if (editMode) return;
      e.preventDefault();
      handleCloseDocument();
    };
    // Capture: run before Radix dismiss-on-Escape unmounts the dialog, so we don’t also close the doc.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    currentDoc,
    editMode,
    exportConfirmOpen,
    handleCloseDocument,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const showRightToc = rightTocOpen && !editMode;

  return (
    <WorkspaceTreeProvider documents={documents} workspacesEnabled={workspacesEnabled}>
    <SidebarProvider className="h-svh min-h-0">
      <Sidebar
        documents={documents}
        currentId={currentDoc?.id ?? null}
        documentStackEnabled={documentStackEnabled}
        onDocumentStackEnabledChange={(checked) => {
          setDocumentStackEnabled(checked);
          if (!checked) {
            setDocStackIds([]);
          } else if (currentDoc) {
            setDocStackIds([currentDoc.id]);
          }
        }}
        workspacesEnabled={workspacesEnabled}
        onWorkspacesEnabledChange={setWorkspacesEnabled}
        onSelectDocument={handleSelectDocument}
        documentSearchQuery={documentSearchQuery}
        onDocumentSearchQueryChange={handleDocumentSearchQueryChange}
        onSearchSelectDocument={handleSearchSelectDocument}
        searchMatchNavigation={
          currentDoc &&
          documentSearchQuery.trim() &&
          searchMatchCount > 0 &&
          !editMode
            ? {
                activeIndex: searchActiveMatchIndex,
                total: searchMatchCount,
                onPrevious: handlePreviousSearchMatch,
                onNext: handleNextSearchMatch,
              }
            : null
        }
        onDeleteDocument={handleDeleteDocument}
        onAddDocument={handleAddDocument}
        onRefresh={refresh}
      />

      <SidebarInset className={cn(appCapsuleClassName, "relative flex min-h-0 flex-1 flex-col")}>
        <SidebarExpandTrigger />
        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden",
            currentDoc
              ? "flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:grid-rows-1"
              : "flex flex-col"
          )}
        >
          <div
            ref={contentScrollRef}
            onDragOverCapture={handleMainPanelDragOver}
            onDragLeave={handleMainPanelDragLeave}
            onDropCapture={handleMainPanelDrop}
            className={cn(
              // Native overflow (not Radix ScrollArea): Radix wraps content in display:table + minWidth:100%,
              // which can grow wider than the grid column and clip right-aligned doc actions beside the TOC.
              "relative z-[1] min-h-0 min-w-0 flex-1 font-base outline-none native-scrollbar",
              editMode && currentDoc
                ? "flex flex-col overflow-hidden"
                : "overflow-y-auto overflow-x-hidden",
              currentDoc &&
                "lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:h-full lg:max-h-full lg:min-h-0",
              mainPanelDocDragOver &&
                "bg-[var(--tree-drag-target-bg)] ring-2 ring-inset ring-[var(--tree-drag-target-border)]"
            )}
          >
            <div
              className={cn(
                "box-border max-w-full min-w-0 py-8 pl-8 pr-8 print:px-0 lg:pl-8 lg:pr-12",
                editMode && currentDoc && "flex min-h-0 flex-1 flex-col"
              )}
            >
          {currentDoc ? (
            <>
              <DocumentColumn
                rightTocOpen={showRightToc}
                className={editMode ? "flex min-h-0 flex-1 flex-col" : undefined}
              >
                <div className={cn(editMode && "flex min-h-0 flex-1 flex-col")}>
                <div className="mb-6 flex min-w-0 w-full max-w-full shrink-0 flex-wrap items-center justify-start gap-2 print:mb-4 sm:justify-end sm:gap-3 md:gap-5">
                      {!editMode && !encryption.isLocked && (
                        <DocumentSecurityMenu
                          className="mr-auto sm:mr-0 sm:order-first"
                          securityState={encryption.session.securityState}
                          isEncryptedAtRest={isEncryptedAtRest}
                          statusLabel={securityStatusLabel}
                          onEncryptDocument={handleEncryptDocumentRequest}
                          onLockNow={handleLockNow}
                          onUnlock={encryption.reopenUnlockDialog}
                          onRemoveEncryption={handleRemoveEncryptionRequest}
                        />
                      )}
                      {!encryption.isLocked && (
                        <>
                          {editMode ? (
                            <>
                              <button
                                type="button"
                                className={workspaceToolbarTextActionClassName}
                                onClick={() => handleShowPreviewView(true)}
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className={workspaceToolbarTextActionClassName}
                                onClick={() => void handleEditSave()}
                              >
                                {editAutosaveUi === "saving"
                                  ? "Save · …"
                                  : editAutosaveSecs !== null
                                    ? `Save (${editAutosaveSecs}s)`
                                    : "Save"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={workspaceToolbarTextActionClassName}
                                onClick={handleShowEditView}
                              >
                                Edit
                              </button>
                              {hasUnsavedDraft ? (
                                <button
                                  type="button"
                                  className={workspaceToolbarTextActionClassName}
                                  onClick={() =>
                                    void handleEditSave({ exitEditAfter: false })
                                  }
                                >
                                  {editAutosaveUi === "saving"
                                    ? "Save · …"
                                    : editAutosaveSecs !== null
                                      ? `Save (${editAutosaveSecs}s)`
                                      : "Save"}
                                </button>
                              ) : (
                                <DocumentDownloadButton
                                  isEncryptedAtRest={isEncryptedAtRest}
                                  isLocked={encryption.isLocked}
                                  onDownloadPlain={() =>
                                    void performDownloadStored()
                                  }
                                  onDownloadEncrypted={() =>
                                    void performDownloadStored()
                                  }
                                  onExportMarkdown={handleExportMarkdownRequest}
                                />
                              )}
                            </>
                          )}
                          {editAutosaveUi === "saving" && (
                            <span
                              className="min-w-0 max-w-full basis-full pt-1 text-left text-xs text-muted-foreground sm:basis-auto sm:pt-0 sm:text-right"
                              aria-live="polite"
                            >
                              Saving…
                            </span>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        aria-label="Close document and return to overview"
                        className={cn(
                          "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-primary transition-colors hover:text-primary-hover print:hidden"
                        )}
                        onClick={handleCloseDocument}
                      >
                        <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                      </button>
                </div>
                {editMode ? (
                  <MarkdownEditor
                    autoFocus
                    value={draftContent}
                    onChange={setDraftContent}
                    placeholder="Type markdown here…"
                    className="min-h-0 flex-1"
                  />
                ) : encryption.isLocked ? (
                  <EncryptedDocumentPlaceholder
                    documentTitle={currentDoc.title}
                    onUnlock={async (passphrase) => {
                      await encryption.applyUnlock(passphrase);
                    }}
                    focusRequest={encryption.unlockFocusRequest}
                  />
                ) : (
                  <MarkdownRenderer
                    key={currentDoc.id}
                    content={previewContent}
                    searchQuery={documentSearchQuery}
                    activeMatchIndex={searchActiveMatchIndex}
                    articleRef={markdownArticleRef}
                    onMatchCountChange={handleSearchMatchCountChange}
                    onContentChange={handlePreviewContentChange}
                  />
                )}
                </div>
              </DocumentColumn>
            </>
          ) : (
            <EmptyState hasDocuments={documents.length > 0} />
          )}
            </div>
          </div>

          {currentDoc && (
            <div
              className={cn(
                "hidden min-h-0 min-w-0 shrink-0 print:hidden lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:flex lg:h-full lg:min-h-0 lg:flex-col",
                showRightToc ? "p-2 pl-0" : "w-0 p-0"
              )}
            >
              {showRightToc && (
                <aside
                  id="document-outline-panel"
                  aria-hidden={!showRightToc}
                  className={cn(
                    appCapsuleClassName,
                    "flex min-h-0 w-[17rem] flex-1 flex-col px-3 pt-2 pb-4"
                  )}
                >
                  <DocumentRightSidebar
                    doc={currentDoc}
                    content={displayContent}
                    contentScrollRef={contentScrollRef}
                  />
                </aside>
              )}
            </div>
          )}

          {currentDoc && !editMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-expanded={rightTocOpen}
                  aria-controls="document-outline-panel"
                  onClick={() => setRightTocOpen((o) => !o)}
                  className={cn(
                    "absolute top-1/2 z-30 hidden h-15 w-6 shrink-0 -translate-y-1/2 border border-border bg-background text-primary shadow-none transition-[right,background-color,color] duration-150 ease-linear hover:bg-primary hover:text-background hover:-translate-y-1/2",
                    "print:hidden lg:inline-flex",
                    rightTocOpen
                      ? "right-[calc(17rem+0.5rem-0.75rem)]"
                      : "right-2"
                  )}
                >
                  {rightTocOpen ? (
                    <ChevronRight aria-hidden />
                  ) : (
                    <ChevronLeft aria-hidden />
                  )}
                  <span className="sr-only">
                    {rightTocOpen ? "Hide outline" : "Show outline"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                {rightTocOpen ? "Hide outline" : "Show outline"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarInset>

      {encryption.dialogs}

      <ExportMarkdownDialog
        open={exportConfirmOpen && !!currentDoc}
        onOpenChange={setExportConfirmOpen}
        onExport={performExportMarkdown}
      />

    </SidebarProvider>
    </WorkspaceTreeProvider>
  );
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}

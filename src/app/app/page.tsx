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
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function hashContent(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

import type { Document } from "@/types/document";
import type { Folder } from "@/types/workspace";
import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  DuplicateNameError,
} from "@/lib/storage";
import { toMarkdownDownloadFilename } from "@/lib/utils";
import { SAMPLE_MARKDOWN } from "@/lib/sample-document";
import { EmptyState } from "@/components/EmptyState";
import { HeaderLogo } from "@/components/HeaderLogo";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TableOfContents } from "@/components/TableOfContents";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { LineNumberedTextarea } from "@/components/LineNumberedTextarea";
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
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useDeploymentReloadBlock } from "@/components/DeploymentReloadGuard";
import { Feedback } from "@/components/Feedback";
import { GitHubIcon } from "@/components/GitHubIcon";
import { WorkspaceTreeProvider, useWorkspaceTree } from "@/context/WorkspaceTreeContext";
import {
  workspaceNeutralChipClassName,
  workspaceSwitcherDropdownContentClassName,
} from "@/components/WorkspaceSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CURRENT_DOC_KEY = "md-viewer-current-doc";
const RIGHT_TOC_OPEN_KEY = "md-viewer-right-toc-open";
const DOC_STACK_ENABLED_KEY = "md-viewer-doc-stack-enabled";
const GITHUB_URL = "https://github.com/iaminci/opsly-md";
const DEFAULT_NEW_DOCUMENT_TITLE = "Untitled";
const EDIT_AUTOSAVE_INTERVAL_SEC = 60;

/** Normalized title when creating a document (empty input → default). */
function resolveNewDocumentTitle(titleInput: string): string {
  const explicit = titleInput.trim().replace(/\.md$/i, "").trim();
  return explicit || DEFAULT_NEW_DOCUMENT_TITLE;
}

function folderPathLabel(folder: Folder, allInWorkspace: Folder[]): string {
  const byId = new Map(allInWorkspace.map((f) => [f.id, f]));
  const parts: string[] = [];
  let f: Folder | undefined = folder;
  const seen = new Set<string>();
  while (f && !seen.has(f.id)) {
    seen.add(f.id);
    parts.unshift(f.name);
    f = f.parentFolderId ? byId.get(f.parentFolderId) : undefined;
  }
  return parts.join(" / ");
}

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

function DocumentInfo({ doc }: { doc: Document }) {
  const wordCount = doc.content.trim()
    ? doc.content.trim().split(/\s+/).length
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

/** Wider reading column when the left sidebar or right TOC (or both) is collapsed. */
function DocumentColumn({
  rightTocOpen,
  children,
}: {
  rightTocOpen: boolean;
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
        maxClass
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
      <TabsList className="mb-5 h-11 w-full shrink-0 justify-start">
        <TabsTrigger value="on-this-page">On This Page</TabsTrigger>
        <TabsTrigger value="info">Info</TabsTrigger>
      </TabsList>
      <TabsContent value="on-this-page" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
        <TableOfContents
          key={`${doc.id}-${hashContent(content)}`}
          content={content}
          scrollContainerRef={contentScrollRef}
        />
      </TabsContent>
      <TabsContent
        value="info"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-auto pr-4"
      >
        <DocumentInfo doc={doc} />
      </TabsContent>
    </Tabs>
  );
}

type InlineCreateMarkdownFormProps = {
  rightTocOpen: boolean;
  /** When true, workspace/folder were chosen from the tree or switcher menu; hide those pickers. */
  hideLocationSelectors: boolean;
  createTitle: string;
  setCreateTitle: (v: string) => void;
  createMarkdown: string;
  setCreateMarkdown: (v: string) => void;
  createSelectedWorkspaceId: string;
  setCreateSelectedWorkspaceId: (v: string) => void;
  createSelectedFolderId: string | null;
  setCreateSelectedFolderId: (v: string | null) => void;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
};

function InlineCreateMarkdownForm({
  rightTocOpen,
  hideLocationSelectors,
  createTitle,
  setCreateTitle,
  createMarkdown,
  setCreateMarkdown,
  createSelectedWorkspaceId,
  setCreateSelectedWorkspaceId,
  createSelectedFolderId,
  setCreateSelectedFolderId,
  onCancel,
  onSubmit,
}: InlineCreateMarkdownFormProps) {
  const { sortedWorkspaces, getFoldersInWorkspace, hasSyncedWorkspacesAtLeastOnce } =
    useWorkspaceTree();

  const folders = useMemo(
    () => getFoldersInWorkspace(createSelectedWorkspaceId),
    [getFoldersInWorkspace, createSelectedWorkspaceId]
  );

  useEffect(() => {
    if (sortedWorkspaces.length === 0) return;
    if (sortedWorkspaces.some((w) => w.id === createSelectedWorkspaceId)) return;
    setCreateSelectedWorkspaceId(sortedWorkspaces[0]!.id);
    setCreateSelectedFolderId(null);
  }, [sortedWorkspaces, createSelectedWorkspaceId, setCreateSelectedWorkspaceId, setCreateSelectedFolderId]);

  useEffect(() => {
    if (createSelectedFolderId === null) return;
    if (folders.some((f) => f.id === createSelectedFolderId)) return;
    setCreateSelectedFolderId(null);
  }, [createSelectedFolderId, folders, setCreateSelectedFolderId]);

  const createFolderOptions = useMemo(
    () =>
      [...folders]
        .map((f) => ({
          folder: f,
          label: folderPathLabel(f, folders),
        }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        ),
    [folders]
  );

  const inlineCreateWorkspaceTriggerLabel = useMemo(() => {
    if (!sortedWorkspaces.length) return "…";
    return (
      sortedWorkspaces.find((w) => w.id === createSelectedWorkspaceId)?.name ?? "…"
    );
  }, [sortedWorkspaces, createSelectedWorkspaceId]);

  const inlineCreateFolderTriggerLabel = useMemo(() => {
    if (createSelectedFolderId === null) return "None (workspace root)";
    return (
      createFolderOptions.find((x) => x.folder.id === createSelectedFolderId)
        ?.label ?? "None (workspace root)"
    );
  }, [createSelectedFolderId, createFolderOptions]);

  return (
    <>
      <DocumentColumn rightTocOpen={rightTocOpen}>
        <div className="mb-6 print:mb-4">
          {hasSyncedWorkspacesAtLeastOnce && sortedWorkspaces.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-3">
              <div className="min-h-0 min-w-0">
                <h1 className="break-words text-3xl font-semibold text-foreground">Create Markdown</h1>
              </div>
              <div className="flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3 md:gap-5">
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  className="shrink-0 bg-background"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  className="shrink-0 bg-background hover:bg-main"
                  onClick={() => void onSubmit()}
                  disabled={!createMarkdown.trim() || !createSelectedWorkspaceId}
                >
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <h1 className="text-3xl font-semibold text-foreground">Create Markdown</h1>
          )}
        </div>
        {!hasSyncedWorkspacesAtLeastOnce ? (
          <p className="text-sm text-muted-foreground">Loading workspaces…</p>
        ) : sortedWorkspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workspace available. Add one with “New Workspace” in the workspace menu.
          </p>
        ) : (
          <div className="space-y-3">
            {!hideLocationSelectors ? (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                <div className="flex min-w-0 flex-col gap-1">
                  <label
                    htmlFor="inline-create-workspace"
                    className="block text-sm font-medium text-foreground"
                  >
                    Workspace
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        id="inline-create-workspace"
                        className={cn(
                          workspaceNeutralChipClassName,
                          "flex w-full min-w-0 items-center gap-2 px-3 text-left"
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {inlineCreateWorkspaceTriggerLabel}
                        </span>
                        <ChevronDown className="size-4 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={4}
                      className={workspaceSwitcherDropdownContentClassName}
                    >
                      <div className="no-scrollbar max-h-[min(50vh,16rem)] w-full overflow-y-auto overflow-x-hidden">
                        <div className="p-1">
                          {sortedWorkspaces.map((ws) => (
                            <DropdownMenuItem
                              key={ws.id}
                              onClick={() => {
                                setCreateSelectedWorkspaceId(ws.id);
                                setCreateSelectedFolderId(null);
                              }}
                              className={cn(
                                "cursor-pointer",
                                createSelectedWorkspaceId === ws.id &&
                                  "bg-sidebar-accent font-semibold text-primary"
                              )}
                            >
                              <span className="truncate">{ws.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <label
                    htmlFor="inline-create-folder"
                    className="block text-sm font-medium text-foreground"
                  >
                    Folder
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        id="inline-create-folder"
                        className={cn(
                          workspaceNeutralChipClassName,
                          "flex w-full min-w-0 items-center gap-2 px-3 text-left"
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {inlineCreateFolderTriggerLabel}
                        </span>
                        <ChevronDown className="size-4 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={4}
                      className={workspaceSwitcherDropdownContentClassName}
                    >
                      <div className="no-scrollbar max-h-[min(50vh,16rem)] w-full overflow-y-auto overflow-x-hidden">
                        <div className="p-1">
                          <DropdownMenuItem
                            onClick={() => setCreateSelectedFolderId(null)}
                            className={cn(
                              "cursor-pointer",
                              createSelectedFolderId === null &&
                                "bg-sidebar-accent font-semibold text-primary"
                            )}
                          >
                            <span className="truncate">None (workspace root)</span>
                          </DropdownMenuItem>
                          {createFolderOptions.map(({ folder, label }) => (
                            <DropdownMenuItem
                              key={folder.id}
                              onClick={() => setCreateSelectedFolderId(folder.id)}
                              className={cn(
                                "cursor-pointer",
                                createSelectedFolderId === folder.id &&
                                  "bg-sidebar-accent font-semibold text-primary"
                              )}
                            >
                              <span className="truncate">{label}</span>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="inline-create-title"
                className="block text-sm font-medium text-foreground"
              >
                Filename
              </label>
              <Input
                id="inline-create-title"
                autoFocus
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Enter title...  "
                className="font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="inline-create-body"
                className="block text-sm font-medium text-foreground"
              >
              </label>
              <LineNumberedTextarea
                id="inline-create-body"
                value={createMarkdown}
                onChange={(e) => setCreateMarkdown(e.target.value)}
                placeholder="Enter markdown here..."
                spellCheck={false}
                className="field-sizing-fixed h-[calc(100svh-24rem)] min-h-[12rem] w-full max-w-full"
              />
            </div>
          </div>
        )}
      </DocumentColumn>
    </>
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
  const currentDocIdRef = useRef<string | null>(null);
  currentDocIdRef.current = currentDoc?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const scrollTopBeforeEditRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);
  const [rightTocOpen, setRightTocOpen] = useState(true);
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const [documentStackEnabled, setDocumentStackEnabled] = useState(true);
  const [docStackIds, setDocStackIds] = useState<string[]>([]);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [createMode, setCreateMode] = useState(false);
  const [createSelectedWorkspaceId, setCreateSelectedWorkspaceId] = useState("");
  const [createSelectedFolderId, setCreateSelectedFolderId] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState(DEFAULT_NEW_DOCUMENT_TITLE);
  const [createMarkdown, setCreateMarkdown] = useState("");
  const [inlineCreateHideLocationSelectors, setInlineCreateHideLocationSelectors] =
    useState(false);
  const [editAutosaveUi, setEditAutosaveUi] = useState<"idle" | "saving" | "saved">("idle");
  const [editAutosaveSecs, setEditAutosaveSecs] = useState<number | null>(null);

  const editDirty =
    editMode &&
    !!currentDoc &&
    draftContent !== currentDoc.content;
  const createDirty =
    createMode &&
    (createMarkdown.trim().length > 0 ||
      createTitle.trim() !== DEFAULT_NEW_DOCUMENT_TITLE);
  useDeploymentReloadBlock(editMode || createMode);
  useEffect(() => {
    if (!editDirty && !createDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editDirty, createDirty]);

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
    if (typeof window === "undefined") return;
    localStorage.setItem(RIGHT_TOC_OPEN_KEY, rightTocOpen ? "1" : "0");
  }, [rightTocOpen]);
  const refresh = useCallback(async () => {
    const docs = await getDocuments();
    setDocuments(docs);
    setCurrentDoc((prev) => {
      if (!prev) return prev;
      return docs.find((d) => d.id === prev.id) ?? prev;
    });
  }, []);

  const loadSampleHandledRef = useRef(false);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
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
    // Skip URL→state sync when user just selected/added a doc; trust onSelectDocument/handleAddDocument.
    // Defer clearing so React Strict Mode's double effect run doesn't override.
    if (justSelectedDocIdRef.current) {
      queueMicrotask(() => {
        justSelectedDocIdRef.current = null;
      });
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

  useEffect(() => {
    setEditMode(false);
    shouldRestoreScrollRef.current = false;
  }, [currentDoc?.id]);

  useLayoutEffect(() => {
    if (!createMode) return;
    const vp = contentScrollRef.current;
    if (vp) vp.scrollTop = 0;
  }, [createMode]);

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
      const wsId = workspaceId ?? "default";
      try {
        const doc = await addDocument(
          { title, content, workspaceId: wsId, folderId: folderId ?? null },
          { workspaceId: wsId, folderId: folderId ?? null }
        );
        const updated = await getDocuments();
        justSelectedDocIdRef.current = doc.id;
        currentDocIdRef.current = doc.id;
        setDocuments(updated);
        setCurrentDoc(doc);
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
    [router, pathname, searchParams, documentStackEnabled]
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

  const handleOpenInlineCreate = useCallback(
    (
      workspaceId: string,
      folderId: string | null,
      options?: { hideLocationSelectors?: boolean }
    ) => {
      setEditMode(false);
      setCreateSelectedWorkspaceId(workspaceId);
      setCreateSelectedFolderId(folderId);
      setCreateTitle(DEFAULT_NEW_DOCUMENT_TITLE);
      setCreateMarkdown("");
      setInlineCreateHideLocationSelectors(Boolean(options?.hideLocationSelectors));
      setCreateMode(true);
    },
    []
  );

  const handleCancelInlineCreate = useCallback(() => {
    setCreateMode(false);
    setInlineCreateHideLocationSelectors(false);
    setCreateSelectedWorkspaceId("");
    setCreateSelectedFolderId(null);
    setCreateTitle(DEFAULT_NEW_DOCUMENT_TITLE);
    setCreateMarkdown("");
  }, []);

  const handleSubmitInlineCreate = useCallback(async () => {
    if (!createSelectedWorkspaceId) return;
    const trimmed = createMarkdown.trim();
    if (!trimmed) return;
    const title = resolveNewDocumentTitle(createTitle);
    const ok = await handleAddDocument(
      title,
      trimmed,
      createSelectedWorkspaceId,
      createSelectedFolderId
    );
    if (!ok) return;
    setCreateMode(false);
    setInlineCreateHideLocationSelectors(false);
    setCreateSelectedWorkspaceId("");
    setCreateSelectedFolderId(null);
    setCreateTitle(DEFAULT_NEW_DOCUMENT_TITLE);
    setCreateMarkdown("");
  }, [
    createSelectedWorkspaceId,
    createSelectedFolderId,
    createMarkdown,
    createTitle,
    handleAddDocument,
  ]);

  const handleEnterEditMode = useCallback(() => {
    if (!currentDoc) return;
    setCreateMode(false);
    setInlineCreateHideLocationSelectors(false);
    setCreateSelectedWorkspaceId("");
    setCreateSelectedFolderId(null);
    setCreateTitle(DEFAULT_NEW_DOCUMENT_TITLE);
    setCreateMarkdown("");
    const vp = contentScrollRef.current;
    scrollTopBeforeEditRef.current = vp?.scrollTop ?? 0;
    setDraftContent(currentDoc.content);
    setEditMode(true);
  }, [currentDoc]);

  const handleExitEditMode = useCallback((restoreScroll: boolean) => {
    shouldRestoreScrollRef.current = restoreScroll;
    setEditMode(false);
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
        const updated = await updateDocument(currentDoc.id, {
          content: draftContent,
        });
        if (updated) {
          setCurrentDoc(updated);
          await refresh();
        }
        if (exitEditAfter) {
          handleExitEditMode(true);
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
    [currentDoc, draftContent, refresh, handleExitEditMode]
  );

  const handleEditSaveRef = useRef(handleEditSave);
  handleEditSaveRef.current = handleEditSave;

  const editAutosaveLatestRef = useRef({
    draft: "",
    savedContent: "",
  });
  editAutosaveLatestRef.current = {
    draft: draftContent,
    savedContent: currentDoc?.content ?? "",
  };

  useEffect(() => {
    if (!editMode || !currentDoc?.id) {
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
  }, [editMode, currentDoc?.id]);

  const performDownload = useCallback(() => {
    if (!currentDoc) return;
    const blob = new Blob([currentDoc.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = toMarkdownDownloadFilename(currentDoc.title);
    a.click();
    URL.revokeObjectURL(url);
  }, [currentDoc]);

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
      if (downloadConfirmOpen || hasOpenEscapeBlockingOverlay()) return;
      if (createMode) {
        e.preventDefault();
        handleCancelInlineCreate();
        return;
      }
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
    createMode,
    editMode,
    downloadConfirmOpen,
    handleCloseDocument,
    handleCancelInlineCreate,
  ]);

  useEffect(() => {
    const loadSample = searchParams.get("loadSample");
    if (
      !loading &&
      loadSample === "1" &&
      documents.length === 0 &&
      !loadSampleHandledRef.current
    ) {
      loadSampleHandledRef.current = true;
      handleAddDocument("Welcome", SAMPLE_MARKDOWN);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("loadSample");
      const newSearch = params.toString();
      router.replace(pathname + (newSearch ? `?${newSearch}` : ""), { scroll: false });
    }
  }, [loading, documents.length, searchParams, pathname, router, handleAddDocument]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <WorkspaceTreeProvider documents={documents}>
    <SidebarProvider className="h-svh overflow-hidden">
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
        onSelectDocument={async (doc) => {
          navigatingToHomeRef.current = false;
          setCreateMode(false);
          setInlineCreateHideLocationSelectors(false);
          setCreateSelectedWorkspaceId("");
          setCreateSelectedFolderId(null);
          setCreateTitle(DEFAULT_NEW_DOCUMENT_TITLE);
          setCreateMarkdown("");
          justSelectedDocIdRef.current = doc.id;
          const fresh = await getDocument(doc.id);
          setCurrentDoc(fresh ?? doc);
          if (documentStackEnabled) {
            setDocStackIds((prev) => [...prev.filter((i) => i !== doc.id), doc.id]);
          }
          const params = new URLSearchParams(searchParams.toString());
          params.set("doc", doc.id);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        onDeleteDocument={handleDeleteDocument}
        onAddDocument={handleAddDocument}
        onOpenInlineCreate={handleOpenInlineCreate}
        onRefresh={refresh}
      />

      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="relative flex h-14.5 shrink-0 items-center gap-5 border-b-2 px-4">
          <SidebarTrigger className="shrink-0 text-foreground hover:text-foreground" />
          <Link
            href="/"
            className="flex min-w-0 items-center leading-none no-underline cursor-pointer transition-opacity hover:opacity-80 shrink-0"
            aria-label="Go to home"
          >
            <HeaderLogo className="h-7 w-auto max-w-[min(100%,20rem)] sm:h-8" />
          </Link>
          <div className="ml-auto flex items-center gap-5">
            <Feedback />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="neutral"
                  size="icon-sm"
                  className="bg-background"
                  asChild
                >
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on GitHub"
                  >
                    <GitHubIcon className="size-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                View on GitHub
              </TooltipContent>
            </Tooltip>
            <ThemeToggle />
          </div>
        </header>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden",
            currentDoc && !createMode
              ? "flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:grid-rows-1"
              : "flex flex-col"
          )}
        >
          <div
            ref={contentScrollRef}
            className={cn(
              // Native overflow (not Radix ScrollArea): Radix wraps content in display:table + minWidth:100%,
              // which can grow wider than the grid column and clip right-aligned doc actions beside the TOC.
              "relative z-[1] min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden font-base outline-none native-scrollbar",
              currentDoc &&
                !createMode &&
                "lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:h-full lg:max-h-full lg:min-h-0"
            )}
          >
            <div className="box-border max-w-full min-w-0 py-8 pl-8 pr-8 print:px-0 lg:pl-8 lg:pr-12">
          {createMode ? (
            <InlineCreateMarkdownForm
              rightTocOpen={rightTocOpen}
              hideLocationSelectors={inlineCreateHideLocationSelectors}
              createTitle={createTitle}
              setCreateTitle={setCreateTitle}
              createMarkdown={createMarkdown}
              setCreateMarkdown={setCreateMarkdown}
              createSelectedWorkspaceId={createSelectedWorkspaceId}
              setCreateSelectedWorkspaceId={setCreateSelectedWorkspaceId}
              createSelectedFolderId={createSelectedFolderId}
              setCreateSelectedFolderId={setCreateSelectedFolderId}
              onCancel={handleCancelInlineCreate}
              onSubmit={handleSubmitInlineCreate}
            />
          ) : currentDoc ? (
            <>
              <DocumentColumn rightTocOpen={rightTocOpen}>
                <div className="mb-6 flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-2 print:mb-4 sm:justify-end sm:gap-3 md:gap-5">
                      {editMode ? (
                        <>
                          <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            className="shrink-0 bg-background"
                            onClick={() => handleExitEditMode(true)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            className="shrink-0 bg-background hover:bg-main"
                            onClick={() => void handleEditSave()}
                          >
                            {editAutosaveUi === "saving"
                              ? "Save · …"
                              : editAutosaveSecs !== null
                                ? `Save (${editAutosaveSecs}s)`
                                : "Save"}
                          </Button>
                          {(editAutosaveUi === "saving" || editAutosaveUi === "saved") && (
                            <span
                              className="min-w-0 max-w-full basis-full pt-1 text-left text-xs text-muted-foreground sm:basis-auto sm:pt-0 sm:text-right"
                              aria-live="polite"
                            >
                              {editAutosaveUi === "saving" ? "Saving…" : "Auto-saved."}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            className="shrink-0 bg-background"
                            onClick={handleEnterEditMode}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            className="shrink-0 bg-background hover:bg-main"
                            onClick={() => setDownloadConfirmOpen(true)}
                          >
                            Download
                          </Button>
                        </>
                      )}
                      {!editMode && (
                        <button
                          type="button"
                          aria-label="Close document and return to overview"
                          className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground print:hidden"
                          onClick={handleCloseDocument}
                        >
                          <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                        </button>
                      )}
                </div>
                {editMode ? (
                  <LineNumberedTextarea
                    autoFocus
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="Markdown content..."
                    spellCheck={false}
                    className="h-[calc(100svh-12rem)] min-h-[calc(100svh-12rem)] leading-relaxed"
                    textareaClassName="leading-relaxed"
                  />
                ) : (
                  <MarkdownRenderer content={currentDoc.content} />
                )}
              </DocumentColumn>
            </>
          ) : (
            <EmptyState hasDocuments={documents.length > 0} />
          )}
            </div>
          </div>

          {currentDoc && !createMode && (
            <div className="relative z-[2] hidden min-h-0 min-w-0 shrink-0 print:hidden lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <div
                id="document-outline-panel"
                aria-hidden={!rightTocOpen}
                className={cn(
                  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
                  "transition-[width,padding-left,padding-right,padding-top,padding-bottom,border-left-width] duration-150 ease-linear",
                  rightTocOpen
                    ? "w-56 border-l-2 border-border px-3 py-6"
                    : "w-0 border-l-0 px-0 py-0"
                )}
              >
                <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
                  <DocumentRightSidebar
                    doc={currentDoc}
                    content={currentDoc.content}
                    contentScrollRef={contentScrollRef}
                  />
                </div>
              </div>
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
                      "fixed h-15 w-6 shadow-shadow-2 border-2 border-border bg-background top-[calc(50%-1rem)] z-30 hidden shrink-0 text-primary-hover transition-[right] duration-150 ease-linear hover:text-background hover:bg-primary",
                      "print:hidden lg:inline-flex",
                      rightTocOpen ? "right-[13.3rem]" : "right-0"
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
            </div>
          )}
        </div>
      </SidebarInset>

      <AlertDialog
        open={downloadConfirmOpen && !!currentDoc}
        onOpenChange={(open) => {
          setDownloadConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download document?</AlertDialogTitle>
            <AlertDialogDescription>
              Save this document as{" "}
              <span className="font-mono font-medium text-foreground">
                {currentDoc ? toMarkdownDownloadFilename(currentDoc.title) : ""}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="hover:!bg-primary border-2 text-foreground"
              onClick={() => performDownload()}
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

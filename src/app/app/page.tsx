"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
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

function getSubtitle(content: string): string | null {
  const lines = content.split("\n");
  const firstHeadingIdx = lines.findIndex((l) => /^#{1,6}\s+/.test(l));
  if (firstHeadingIdx >= 0) {
    const afterHeading = lines.slice(firstHeadingIdx + 1);
    const para: string[] = [];
    for (const line of afterHeading) {
      if (/^\s*$/.test(line)) break;
      // Next ATX line: valid (`## words`) or mistaken (`###oops` — CommonMark needs a space).
      // Otherwise mistaken hashes get merged into the subtitle and duplicate/stray text appears under the title.
      if (/^\s*#{1,6}/.test(line)) break;
      para.push(line.trim());
    }
    return para.join(" ").trim() || null;
  }
  const firstNonEmpty = lines.find((l) => l.trim().length > 0);
  return firstNonEmpty?.trim() ?? null;
}
import type { Document } from "@/types/document";
import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  DuplicateNameError,
} from "@/lib/storage";
import { getFirstHeading, toMarkdownDownloadFilename } from "@/lib/utils";
import { SAMPLE_MARKDOWN } from "@/lib/sample-document";
import { EmptyState } from "@/components/EmptyState";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
// import { DarkAccentPicker } from "@/components/DarkAccentPicker";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TableOfContents } from "@/components/TableOfContents";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const CURRENT_DOC_KEY = "md-viewer-current-doc";
const RIGHT_TOC_OPEN_KEY = "md-viewer-right-toc-open";
const DOC_STACK_ENABLED_KEY = "md-viewer-doc-stack-enabled";

/**
 * Open Radix overlays that handle Escape. Used in the capture phase so we still see
 * [data-state=open] before Radix dismisses a dialog (in the bubble phase, React may
 * already have unmounted the dialog and `editOpen` can be false — causing a second Esc effect).
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
        "relative mx-auto w-full min-w-0 transition-[max-width] duration-200 ease-linear",
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
      <TabsContent value="info" className="mt-0 flex min-h-0 flex-1 flex-col overflow-auto">
        <DocumentInfo doc={doc} />
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
  const currentDocIdRef = useRef<string | null>(null);
  currentDocIdRef.current = currentDoc?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [rightTocOpen, setRightTocOpen] = useState(true);
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const [documentStackEnabled, setDocumentStackEnabled] = useState(true);
  const [docStackIds, setDocStackIds] = useState<string[]>([]);
  const contentScrollRef = useRef<HTMLDivElement>(null);

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
    if (!documentStackEnabled || !currentDoc) return;
    setDocStackIds((prev) => (prev.length === 0 ? [currentDoc.id] : prev));
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
      const id = justSelectedDocIdRef.current;
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
    if (!currentDoc || typeof window === "undefined") return;
    localStorage.setItem(CURRENT_DOC_KEY, currentDoc.id);
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
    ) => {
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
      } catch (err) {
        if (err instanceof DuplicateNameError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to create document.");
        }
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

  const handleEditOpen = useCallback(() => {
    if (currentDoc) {
      setEditContent(currentDoc.content);
      setEditOpen(true);
    }
  }, [currentDoc]);

  const handleEditSave = useCallback(async () => {
    if (!currentDoc) return;
    try {
      const newTitle = getFirstHeading(editContent) ?? currentDoc.title;
      const updated = await updateDocument(currentDoc.id, {
        content: editContent,
        title: newTitle,
      });
      if (updated) {
        setCurrentDoc(updated);
        await refresh();
      }
      setEditOpen(false);
    } catch (err) {
      if (err instanceof DuplicateNameError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to save document.");
      }
    }
  }, [currentDoc, editContent, refresh]);

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
    if (!currentDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (
        editOpen ||
        downloadConfirmOpen ||
        hasOpenEscapeBlockingOverlay()
      ) {
        return;
      }
      e.preventDefault();
      handleCloseDocument();
    };
    // Capture: run before Radix dismiss-on-Escape unmounts the dialog, so we don’t also close the doc.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [currentDoc, editOpen, downloadConfirmOpen, handleCloseDocument]);

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
        onRefresh={refresh}
      />

      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="relative flex h-14.5 shrink-0 items-center gap-5 border-b-2 px-4">
          <SidebarTrigger className="shrink-0 text-primary hover:text-primary-hover" />
          <Link
            href="/"
            className="text-2xl font-semibold tracking-[-0.02em] text-foreground cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            aria-label="Go to home"
          >
            <span>Opsly </span>
            <span className="text-main">MD</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            ref={contentScrollRef}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden py-8 pl-8 pr-8 print:px-0 lg:pl-8 lg:pr-12"
          >
          {currentDoc ? (
            <>
              <DocumentColumn rightTocOpen={rightTocOpen}>
                <div className="mb-6 flex flex-col gap-3 print:mb-4">
                  <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between lg:gap-x-4 lg:gap-y-3">
                    <div className="min-h-0 min-w-0 w-full lg:w-auto lg:min-w-0 lg:flex-1 lg:basis-0">
                      {(() => {
                        const firstHeading = getFirstHeading(currentDoc.content);
                        // When content has a heading, it will be rendered by MarkdownRenderer—don't duplicate.
                        if (firstHeading) return null;
                        // No heading in content: show doc.title as fallback.
                        return (
                          <h1 className="text-3xl font-semibold text-foreground">
                            {currentDoc.title}
                          </h1>
                        );
                      })()}
                      {getSubtitle(currentDoc.content) && (
                        <p className="mt-1 text-muted-foreground text-sm">
                          {getSubtitle(currentDoc.content)}
                        </p>
                      )}
                    </div>
                    <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-5 lg:w-auto lg:max-w-full">
                      <Button
                        type="button"
                        variant="neutral"
                        size="sm"
                        className="text-primary hover:text-primary-hover"
                        onClick={handleEditOpen}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="neutral"
                        size="sm"
                        className="bg-background text-primary"
                        onClick={() => setDownloadConfirmOpen(true)}
                      >
                        Download
                      </Button>
                      <button
                        type="button"
                        aria-label="Close document and return to overview"
                        className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-primary print:hidden"
                        onClick={handleCloseDocument}
                      >
                        <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
                <MarkdownRenderer content={currentDoc.content} />
              </DocumentColumn>
            </>
          ) : (
            <EmptyState hasDocuments={documents.length > 0} />
          )}
          </div>

          {currentDoc && (
            <>
              <div
                id="document-outline-panel"
                aria-hidden={!rightTocOpen}
                className={cn(
                  "hidden min-h-0 min-w-0 shrink-0 overflow-hidden lg:flex lg:flex-col print:hidden",
                  "transition-[width,padding-left,padding-right,padding-top,padding-bottom,border-left-width] duration-150 ease-linear",
                  rightTocOpen
                    ? "w-56 border-l-2 border-border px-4 py-6"
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-expanded={rightTocOpen}
                aria-controls="document-outline-panel"
                title={rightTocOpen ? "Hide outline" : "Show outline"}
                onClick={() => setRightTocOpen((o) => !o)}
                className={cn(
                  "fixed h-15 w-6 shadow-shadow-2 border-2 border-border bg-background top-[calc(50%-1rem)] z-30 hidden shrink-0 text-primary transition-[right] duration-150 ease-linear hover:text-primary-hover",
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
            </>
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
              className="!bg-primary/90 hover:!bg-primary/90 !text-background border-2 border-foreground shadow-[2px_2px_0_0_#000] hover:!translate-x-0.5 hover:!translate-y-0.5 hover:!shadow-none"
              onClick={() => performDownload()}
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col shadow-xl ring-1 ring-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Edit document</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 py-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Markdown content..."
              className="field-sizing-fixed min-h-[50vh] max-h-[60vh] w-full resize-y overflow-y-auto font-mono text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="neutral" onClick={() => setEditOpen(false)}
              className="text-primary hover:text-primary-hover"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              variant="neutral"
              className="bg-primary/90 text-background"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
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

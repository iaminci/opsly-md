"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
      if (/^#{1,6}\s+/.test(line)) break; // stop at next heading, don't include raw markdown
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
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const CURRENT_DOC_KEY = "md-viewer-current-doc";
const RIGHT_TOC_OPEN_KEY = "md-viewer-right-toc-open";

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
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(RIGHT_TOC_OPEN_KEY);
    if (v === "0") setRightTocOpen(false);
  }, []);

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
    [router, pathname, searchParams]
  );

  const handleDeleteDocument = useCallback(async (id: string) => {
    await deleteDocument(id);
    const updated = await getDocuments();
    setDocuments(updated);
    setCurrentDoc((prev) => (prev?.id === id ? updated[0] ?? null : prev));
  }, []);

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

  const handleCloseDocument = useCallback(() => {
    navigatingToHomeRef.current = true;
    setCurrentDoc(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_DOC_KEY);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("doc");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  useEffect(() => {
    if (!currentDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editOpen || downloadConfirmOpen) return;
      e.preventDefault();
      handleCloseDocument();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
        onSelectDocument={async (doc) => {
          navigatingToHomeRef.current = false;
          justSelectedDocIdRef.current = doc.id;
          const fresh = await getDocument(doc.id);
          setCurrentDoc(fresh ?? doc);
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
            {/* <DarkAccentPicker /> */}
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            ref={contentScrollRef}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-8 print:px-0"
          >
          {currentDoc ? (
            <>
              <div className="relative mx-auto max-w-4xl">
                <button
                  type="button"
                  aria-label="Close document and return to overview"
                  className="absolute top-[-20] right-[-50] z-10 flex size-7 items-center justify-center rounded-[4px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-primary print:hidden"
                  onClick={handleCloseDocument}
                >
                  <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                </button>
                <div className="mb-6 flex flex-col gap-3 pr-9 print:mb-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
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
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="neutral"
                        size="sm"
                        className="text-primary hover:text-primary-hover"
                        onClick={handleEditOpen}
                      >
                        <Pencil className="mr-1.5 size-4" />
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
                    </div>
                  </div>
                </div>
                <MarkdownRenderer content={currentDoc.content} />
              </div>
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
                  "fixed h-15 w-6 shadow-shadow-2 border-2 border-border bg-background top-[calc(50%-1rem)] z-30 hidden shrink-0 text-primary transition-[right,color] duration-150 ease-linear hover:text-primary-hover",
                  "print:hidden lg:inline-flex",
                  rightTocOpen
                    ? "right-[13.3rem]"
                    : "right-0"
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
              className="!bg-primary/90 hover:!bg-primary/90 !text-background border-2 border-black shadow-[2px_2px_0_0_#000] hover:!translate-x-0.5 hover:!translate-y-0.5 hover:!shadow-none"
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

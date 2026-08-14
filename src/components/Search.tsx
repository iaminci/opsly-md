"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import Highlighter from "react-highlight-words";
import { ChevronDown, ChevronUp, Search as SearchIcon, X } from "lucide-react";
import type { Document } from "@/types/document";
import {
  getDocumentSearchPreview,
} from "@/lib/search-result-preview";
import {
  type SearchSnippetPreview,
} from "@/lib/search-highlight";
import {
  createDocumentSearchIndex,
  searchDocuments,
} from "@/lib/document-search-index";
import { Button } from "@/components/ui/button";
import {
  workspaceControlChromeClassName,
  workspaceIconActionClassName,
} from "@/components/WorkspaceSwitcher";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SEARCH_RESULTS_PANEL_WIDTH_PX = 520;
const SEARCH_RESULTS_VIEWPORT_PADDING_PX = 8;

export interface SearchMatchNavigation {
  activeIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

interface SearchProps {
  documents: Document[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (doc: Document) => void;
  matchNavigation?: SearchMatchNavigation | null;
  variant?: "bar" | "toolbar";
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

interface SearchPanelPosition {
  top: number;
  left: number;
  width: number;
}

function useSearchResultsPanelPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>
): SearchPanelPosition | null {
  const [position, setPosition] = useState<SearchPanelPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const maxWidth = window.innerWidth - SEARCH_RESULTS_VIEWPORT_PADDING_PX * 2;
      const width = Math.min(SEARCH_RESULTS_PANEL_WIDTH_PX, maxWidth);
      let left = rect.left;

      if (left + width > window.innerWidth - SEARCH_RESULTS_VIEWPORT_PADDING_PX) {
        left = window.innerWidth - SEARCH_RESULTS_VIEWPORT_PADDING_PX - width;
      }
      left = Math.max(SEARCH_RESULTS_VIEWPORT_PADDING_PX, left);

      setPosition({
        top: rect.bottom + 6,
        left,
        width,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  return position;
}

function formatMatchCount(count: number): string {
  return count === 1 ? "1 match" : `${count} matches`;
}

function HighlightedQueryText({ text, query }: { text: string; query: string }) {
  const searchWords = query.trim();
  if (!searchWords) return <>{text}</>;

  return (
    <Highlighter
      searchWords={[searchWords]}
      autoEscape
      textToHighlight={text}
      highlightClassName="search-highlight"
    />
  );
}

function HighlightedHeadingPath({
  path,
  query,
}: {
  path: string[];
  query: string;
}) {
  if (path.length === 0) return null;

  return (
    <>
      {path.map((segment, index) => (
        <span key={`${index}-${segment}`}>
          {index > 0 && (
            <span className="text-muted-foreground/55">{` › `}</span>
          )}
          <HighlightedQueryText text={segment} query={query} />
        </span>
      ))}
    </>
  );
}

function HighlightedSnippet({ snippet, matchStart, matchLength }: SearchSnippetPreview) {
  if (matchStart < 0 || matchLength <= 0) {
    return (
      <span className="block min-w-0 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
        {snippet}
      </span>
    );
  }

  return (
    <span className="block min-w-0 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
      {snippet.slice(0, matchStart)}
      <mark className="search-highlight">{snippet.slice(matchStart, matchStart + matchLength)}</mark>
      {snippet.slice(matchStart + matchLength)}
    </span>
  );
}

function SearchResultRow({
  doc,
  query,
}: {
  doc: Document;
  query: string;
}) {
  const preview = useMemo(
    () => getDocumentSearchPreview(doc.title, doc.content, query),
    [doc.title, doc.content, query]
  );

  return (
    <span className="flex min-w-0 w-full flex-col items-start text-left">
      <span className="w-full truncate text-sm font-medium leading-snug text-popover-foreground">
        {doc.title.trim() || "Untitled"}
      </span>
      {preview.sections.length > 0 && (
        <ul className="mt-2.5 flex w-full min-w-0 flex-col gap-1">
          {preview.sections.map((section) => (
            <li
              key={section.id}
              className="truncate text-xs leading-snug text-foreground/90"
            >
              <HighlightedHeadingPath path={section.path} query={query} />
            </li>
          ))}
          {preview.moreMatchCount > 0 && (
            <li className="text-[10px] leading-snug text-muted-foreground/75">
              +{preview.moreMatchCount}{" "}
              {preview.moreMatchCount === 1 ? "match" : "matches"} in other sections
            </li>
          )}
        </ul>
      )}
      {preview.fallbackSnippet && (
        <span className="mt-2.5 block w-full min-w-0">
          <HighlightedSnippet {...preview.fallbackSnippet} />
        </span>
      )}
      {preview.matchCount > 0 && (
        <span className="mt-2.5 text-[10px] leading-none text-muted-foreground/55">
          {formatMatchCount(preview.matchCount)}
        </span>
      )}
    </span>
  );
}

const searchInlineControlClass =
  "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-primary transition-colors hover:bg-sidebar-accent hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

interface SearchInputChromeProps {
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  onClose?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  matchNavigation?: SearchMatchNavigation | null;
  className?: string;
}

function SearchInputChrome({
  query,
  onQueryChange,
  onClear,
  onClose,
  onFocus,
  onBlur,
  onKeyDown,
  inputRef,
  matchNavigation,
  className,
}: SearchInputChromeProps) {
  const showClear = query.length > 0;
  const showSearchIcon = !showClear;
  const showMatchNav = !!matchNavigation && matchNavigation.total > 0 && query.trim().length > 0;
  const showClose = Boolean(onClose);
  const showTrailingControls = showMatchNav || showClear || showClose;
  const suppressChromeHoverFill = showTrailingControls;

  return (
    <div
      className={cn(
        workspaceControlChromeClassName,
        "flex h-9 min-w-0 items-center gap-1.5 overflow-hidden pr-1 focus-within:ring-2 focus-within:ring-ring/40",
        suppressChromeHoverFill && "hover:bg-background",
        showSearchIcon ? "pl-2.5" : "pl-2",
        className
      )}
    >
      {showSearchIcon && (
        <SearchIcon className="size-4 shrink-0 text-primary" aria-hidden />
      )}
      <input
        ref={inputRef}
        type="text"
        placeholder="Search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-primary"
        autoComplete="off"
      />
      {(showTrailingControls) && (
        <div className="flex shrink-0 items-center gap-px pl-0.5">
          {showMatchNav && matchNavigation && (
            <>
              <span className="shrink-0 px-0.5 text-[10px] font-medium tabular-nums leading-none text-muted-foreground">
                {matchNavigation.activeIndex + 1}/{matchNavigation.total}
              </span>
              <button
                type="button"
                className={searchInlineControlClass}
                aria-label="Previous match"
                onMouseDown={(e) => e.preventDefault()}
                onClick={matchNavigation.onPrevious}
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                className={searchInlineControlClass}
                aria-label="Next match"
                onMouseDown={(e) => e.preventDefault()}
                onClick={matchNavigation.onNext}
              >
                <ChevronDown className="size-3" />
              </button>
            </>
          )}
          {showMatchNav && (showClear || showClose) && (
            <span aria-hidden className="mx-px h-3.5 w-px shrink-0 bg-border" />
          )}
          {showClear && !showClose && (
            <button
              type="button"
              aria-label="Clear search"
              className={searchInlineControlClass}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClear}
            >
              <X className="size-3 shrink-0" strokeWidth={2.5} />
            </button>
          )}
          {showClose && onClose && (
            <button
              type="button"
              aria-label="Close search"
              className={searchInlineControlClass}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClose}
            >
              <X className="size-3 shrink-0" strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Search({
  documents,
  query,
  onQueryChange,
  onSelect,
  matchNavigation,
  variant = "toolbar",
  expanded = false,
  onExpandedChange,
  className,
}: SearchProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<Document[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const showResults = resultsOpen && results.length > 0;
  const panelPosition = useSearchResultsPanelPosition(showResults, anchorRef);

  const searchIndex = useMemo(() => createDocumentSearchIndex(documents), [documents]);

  const collapse = useCallback(() => {
    onExpandedChange?.(false);
    setResultsOpen(false);
  }, [onExpandedChange]);

  const search = useCallback(
    (q: string) => {
      onQueryChange(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setResults(searchDocuments(searchIndex, documents, q));
      setResultsOpen(true);
    },
    [documents, onQueryChange, searchIndex]
  );

  const clear = useCallback(() => {
    onQueryChange("");
    setResults([]);
    setResultsOpen(false);
    collapse();
  }, [onQueryChange, collapse]);

  const close = useCallback(() => {
    if (query.trim()) {
      onQueryChange("");
      setResults([]);
    }
    setResultsOpen(false);
    collapse();
  }, [query, onQueryChange, collapse]);

  const showMatchNav = !!matchNavigation && matchNavigation.total > 0 && query.trim().length > 0;

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (variant === "toolbar") {
        collapse();
      }
      return;
    }
    if (!showMatchNav || !matchNavigation) return;
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      matchNavigation.onPrevious();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      matchNavigation.onNext();
    }
  };

  const handleSelectDocument = useCallback(
    (doc: Document) => {
      onSelect(doc);
      setResultsOpen(false);
    },
    [onSelect]
  );

  useEffect(() => {
    if (!expanded || variant !== "toolbar") return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expanded, variant]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setResultsOpen(false);
      if (variant === "toolbar" && !query.trim()) {
        collapse();
      }
    }, 150);
  }, [variant, query, collapse]);

  const resultsPanel =
    showResults && panelPosition
      ? createPortal(
          <div
            className="fixed z-50 max-h-[22rem] overflow-y-auto overflow-x-hidden native-scrollbar-transparent-track rounded-[5px] border-2 border-sidebar-border bg-popover text-popover-foreground shadow-md"
            style={{
              top: panelPosition.top,
              left: panelPosition.left,
              width: panelPosition.width,
            }}
          >
            <div className="flex flex-col py-1">
              {results.map((doc) => (
                <Button
                  key={doc.id}
                  type="button"
                  variant="neutral"
                  className="h-auto w-full justify-start rounded-none border-0 border-b border-sidebar-border/50 px-3.5 py-3 font-normal shadow-none last:border-b-0 hover:translate-x-0 hover:translate-y-0 hover:bg-sidebar-accent hover:shadow-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectDocument(doc)}
                >
                  <SearchResultRow doc={doc} query={query} />
                </Button>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  if (variant === "bar") {
    return (
      <div className={cn("relative overflow-visible", className)}>
        <div ref={anchorRef}>
          <SearchInputChrome
            query={query}
            onQueryChange={search}
            onClear={clear}
            onFocus={() => query && setResultsOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleSearchKeyDown}
            matchNavigation={matchNavigation}
          />
        </div>
        {resultsPanel}
      </div>
    );
  }

  const searchActive = query.trim().length > 0;

  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              workspaceIconActionClassName,
              searchActive && "bg-sidebar-accent"
            )}
            aria-label="Search documents"
            onClick={() => onExpandedChange?.(true)}
          >
            <SearchIcon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Search</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn("relative min-w-0 flex-1 overflow-visible", className)}>
      <div ref={anchorRef} className="min-w-0">
        <SearchInputChrome
          inputRef={inputRef}
          query={query}
          onQueryChange={search}
          onClear={clear}
          onClose={close}
          onFocus={() => query && setResultsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleSearchKeyDown}
          matchNavigation={matchNavigation}
          className="w-full"
        />
      </div>
      {resultsPanel}
    </div>
  );
}

"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Search as SearchIcon, X } from "lucide-react";
import type { Document } from "@/types/document";
import {
  getDocumentSearchPreview,
} from "@/lib/search-result-preview";
import {
  getQueryMatchSegments,
  type SearchSnippetPreview,
} from "@/lib/search-highlight";
import { Button } from "@/components/ui/button";
import {
  workspaceControlChromeClassName,
} from "@/components/WorkspaceSwitcher";
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
  const segments = useMemo(() => getQueryMatchSegments(text, query), [text, query]);

  return (
    <>
      {segments.map((segment, index) =>
        segment.isMatch ? (
          <mark key={index} className="search-highlight">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
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

export function Search({
  documents,
  query,
  onQueryChange,
  onSelect,
  matchNavigation,
}: SearchProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<Document[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const showResults = isOpen && results.length > 0;
  const panelPosition = useSearchResultsPanelPosition(showResults, anchorRef);

  const search = useCallback(
    (q: string) => {
      onQueryChange(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const lower = q.toLowerCase();
      const matches = documents.filter(
        (doc) =>
          doc.title.toLowerCase().includes(lower) ||
          doc.content.toLowerCase().includes(lower)
      );
      setResults(matches.slice(0, 8));
      setIsOpen(true);
    },
    [documents, onQueryChange]
  );

  const clear = useCallback(() => {
    onQueryChange("");
    setResults([]);
    setIsOpen(false);
  }, [onQueryChange]);

  const showClear = query.length > 0;
  const showSearchIcon = !showClear;
  const showMatchNav = !!matchNavigation && matchNavigation.total > 0 && query.trim().length > 0;

  const matchNavButtonClass =
    "inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-primary transition-colors hover:bg-sidebar-accent hover:text-primary-hover";

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
                  onClick={() => {
                    onSelect(doc);
                    setIsOpen(false);
                  }}
                >
                  <SearchResultRow doc={doc} query={query} />
                </Button>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative overflow-visible">
      <div
        ref={anchorRef}
        className={cn(
          workspaceControlChromeClassName,
          "flex h-9 min-w-0 items-center gap-1.5 overflow-hidden pr-1 focus-within:ring-2 focus-within:ring-ring/40",
          showSearchIcon ? "pl-2.5" : "pl-2"
        )}
      >
        {showSearchIcon && (
          <SearchIcon className="size-4 shrink-0 text-primary" aria-hidden />
        )}
        <input
          type="text"
          placeholder="Search"
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleSearchKeyDown}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-primary"
          autoComplete="off"
        />
        {(showMatchNav || showClear) && (
          <div className="flex shrink-0 items-center gap-px pl-0.5">
            {showMatchNav && matchNavigation && (
              <>
                <span className="shrink-0 px-0.5 text-[10px] font-medium tabular-nums leading-none text-muted-foreground">
                  {matchNavigation.activeIndex + 1}/{matchNavigation.total}
                </span>
                <button
                  type="button"
                  className={matchNavButtonClass}
                  aria-label="Previous match"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={matchNavigation.onPrevious}
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  className={matchNavButtonClass}
                  aria-label="Next match"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={matchNavigation.onNext}
                >
                  <ChevronDown className="size-3" />
                </button>
              </>
            )}
            {showMatchNav && showClear && (
              <span aria-hidden className="mx-px h-3.5 w-px shrink-0 bg-border" />
            )}
            {showClear && (
              <button
                type="button"
                aria-label="Clear search"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-primary transition-colors hover:bg-sidebar-accent hover:text-primary-hover"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => clear()}
              >
                <X className="size-3 shrink-0" strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}
      </div>
      {resultsPanel}
    </div>
  );
}

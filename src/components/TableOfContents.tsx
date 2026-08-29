"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getTocHeadings,
  type HeadingManifestEntry,
} from "@/lib/heading-manifest";

function getItemOffset(level: number): number {
  if (level <= 2) return 20;
  if (level === 3) return 32;
  return 44;
}

function getLineOffset(level: number): number {
  if (level <= 2) return 8.5;
  if (level === 3) return 20.5;
  return 32.5;
}

interface TocTrack {
  d: string;
  width: number;
  height: number;
  positions: Array<[top: number, bottom: number, x: number]>;
}

interface TableOfContentsProps {
  content: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

/** Distance from the top of scrollable content to the top of `el` (scroll coordinates). */
function headingTopInScrollSpace(
  el: Element,
  scrollEl: Element,
  root: HTMLElement | null
): number {
  const rect = el.getBoundingClientRect();
  if (!root) {
    return rect.top + window.scrollY;
  }
  if (!(scrollEl instanceof HTMLElement)) {
    return rect.top + scrollEl.scrollTop;
  }
  const scrollRect = scrollEl.getBoundingClientRect();
  return rect.top - scrollRect.top + scrollEl.scrollTop;
}

function pickActiveHeadingId(
  heads: HeadingManifestEntry[],
  scrollEl: Element,
  root: HTMLElement | null,
  offset: number
): string | null {
  if (heads.length === 0) return null;

  const bottomSlack = 4;
  const atScrollBottom =
    scrollEl instanceof HTMLElement
      ? scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - bottomSlack
      : typeof window !== "undefined" &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - bottomSlack;

  if (atScrollBottom) {
    for (let i = heads.length - 1; i >= 0; i--) {
      const id = heads[i]!.id;
      if (document.getElementById(id)) return id;
    }
    return heads[0]!.id;
  }

  const viewportTop = root ? scrollEl.scrollTop : window.scrollY;
  let active: string | null = null;
  for (let i = heads.length - 1; i >= 0; i--) {
    const el = document.getElementById(heads[i]!.id);
    if (!el) continue;
    const elTop = headingTopInScrollSpace(el, scrollEl, root);
    if (elTop <= viewportTop + offset) {
      active = heads[i]!.id;
      break;
    }
  }
  return active ?? heads[0]!.id;
}

function pickVisibleHeadingIds(
  heads: HeadingManifestEntry[],
  scrollEl: Element,
  root: HTMLElement | null,
  offset: number
): string[] {
  const viewportTop = root ? scrollEl.scrollTop : window.scrollY;
  const viewportHeight = root
    ? root.clientHeight
    : window.innerHeight;
  const viewportBottom = viewportTop + viewportHeight;
  const visible = heads.flatMap(({ id }) => {
    const element = document.getElementById(id);
    if (!element) return [];
    const top = headingTopInScrollSpace(element, scrollEl, root);
    return top >= viewportTop + offset && top <= viewportBottom - 32 ? [id] : [];
  });

  if (visible.length > 0) return visible;
  const fallback = pickActiveHeadingId(heads, scrollEl, root, offset);
  return fallback ? [fallback] : [];
}

function mergeActiveHeadingIds(
  heads: HeadingManifestEntry[],
  currentId: string | null,
  visibleIds: string[]
): string[] {
  const active = new Set(visibleIds);
  if (currentId) active.add(currentId);
  return heads.flatMap(({ id }) => active.has(id) ? [id] : []);
}

export function TableOfContents({ content, scrollContainerRef }: TableOfContentsProps) {
  const headings = useMemo(() => getTocHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string | null>(
    () => getTocHeadings(content)[0]?.id ?? null
  );
  const [activeIds, setActiveIds] = useState<string[]>(
    () => getTocHeadings(content)[0]?.id ? [getTocHeadings(content)[0]!.id] : []
  );
  const tocScrollRef = useRef<HTMLDivElement | null>(null);
  const tocListRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const tickingRef = useRef(false);
  const lastSetIdRef = useRef<string | null>(null);
  const lastActiveIdsRef = useRef("");
  const [track, setTrack] = useState<TocTrack | null>(null);

  useLayoutEffect(() => {
    lastSetIdRef.current = null;
    lastActiveIdsRef.current = "";
    if (headings.length === 0) {
      setActiveId(null);
      setActiveIds([]);
      return;
    }
    const scrollEl = scrollContainerRef?.current ?? document.documentElement;
    const root = scrollContainerRef?.current ?? null;
    const id = pickActiveHeadingId(headings, scrollEl, root, 100);
    const ids = mergeActiveHeadingIds(
      headings,
      id,
      pickVisibleHeadingIds(headings, scrollEl, root, 100)
    );
    if (!id) return;
    lastSetIdRef.current = id;
    lastActiveIdsRef.current = ids.join("\u0000");
    setActiveId(id);
    setActiveIds(ids);
  }, [content, headings, scrollContainerRef]);

  useEffect(() => {
    if (headings.length === 0) return;
    const scrollEl = scrollContainerRef?.current ?? document.documentElement;
    const root = scrollContainerRef?.current ?? null;

    const updateActiveId = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      setTimeout(() => {
        tickingRef.current = false;
        const id = pickActiveHeadingId(headings, scrollEl, root, 100);
        const ids = mergeActiveHeadingIds(
          headings,
          id,
          pickVisibleHeadingIds(headings, scrollEl, root, 100)
        );
        const idsKey = ids.join("\u0000");
        if (idsKey !== lastActiveIdsRef.current) {
          lastActiveIdsRef.current = idsKey;
          setActiveIds(ids);
        }
        if (!id) return;
        if (id === lastSetIdRef.current) return;
        lastSetIdRef.current = id;
        setActiveId(id);
      }, 0);
    };

    const onScroll = () => updateActiveId();
    if (root) root.addEventListener("scroll", onScroll, { passive: true });
    else window.addEventListener("scroll", onScroll, { passive: true });
    updateActiveId();
    return () => {
      if (root) root.removeEventListener("scroll", onScroll);
      else window.removeEventListener("scroll", onScroll);
    };
  }, [content, headings, scrollContainerRef]);

  useLayoutEffect(() => {
    if (!activeId) return;
    const viewport = tocScrollRef.current;
    const node = activeItemRef.current;
    if (!viewport || !node) return;

    const pad = 8;
    const viewRect = viewport.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    if (nodeRect.top < viewRect.top + pad) {
      viewport.scrollTop += nodeRect.top - viewRect.top - pad;
    } else if (nodeRect.bottom > viewRect.bottom - pad) {
      viewport.scrollTop += nodeRect.bottom - viewRect.bottom + pad;
    }
  }, [activeId]);

  useLayoutEffect(() => {
    const list = tocListRef.current;
    if (!list) return;

    // Ported from Fumadocs' MIT-licensed clerk TOC track computation.
    // Source: fumadocs-ui/src/components/toc/clerk.tsx
    const updateTrack = () => {
      if (list.clientHeight === 0) return;
      let width = 0;
      let height = 0;
      let d = "";
      const positions: TocTrack["positions"] = [];

      for (let index = 0; index < headings.length; index++) {
        const heading = headings[index]!;
        const node = itemRefs.current[index];
        if (!node) continue;
        const styles = getComputedStyle(node);
        const x = getLineOffset(heading.level);
        const top = node.offsetTop + Number.parseFloat(styles.paddingTop);
        const bottom =
          node.offsetTop + node.clientHeight - Number.parseFloat(styles.paddingBottom);

        width = Math.max(x + 8, width);
        height = Math.max(height, bottom);
        if (index === 0) {
          d += ` M${x} ${top} L${x} ${bottom}`;
        } else {
          const [, upperBottom, upperX] = positions[index - 1] ?? [0, 0, 0];
          d += ` L ${upperX} ${upperBottom} ${x} ${top} L${x} ${bottom}`;
        }
        positions.push([top, bottom, x]);
      }

      setTrack({ d, width, height, positions });
    };

    updateTrack();
    const observer = new ResizeObserver(updateTrack);
    observer.observe(list);
    return () => observer.disconnect();
  }, [headings]);

  const activeTrackBounds = useMemo(() => {
    if (!track || activeIds.length === 0) return null;
    const startIndex = headings.findIndex((heading) => heading.id === activeIds[0]);
    const endIndex = headings.findIndex(
      (heading) => heading.id === activeIds[activeIds.length - 1]
    );
    if (startIndex === -1 || endIndex === -1) return null;
    return {
      top: track.positions[startIndex]?.[0] ?? 0,
      bottom: track.positions[endIndex]?.[1] ?? 0,
    };
  }, [activeIds, headings, track]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div
        ref={tocScrollRef}
        className="native-scrollbar-transparent-track min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden pr-2 [overflow-wrap:anywhere]"
      >
        <div ref={tocListRef} className="relative flex w-full min-w-0 flex-col pb-2 pt-1">
          {track && (
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: track.width, height: track.height }}
            >
              <svg
                viewBox={`0 0 ${track.width} ${track.height}`}
                className="absolute"
                style={{ width: track.width, height: track.height }}
              >
                <path
                  d={track.d}
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="1.5"
                />
              </svg>
              {activeTrackBounds && (
                <svg
                  viewBox={`0 0 ${track.width} ${track.height}`}
                  className="absolute transition-[clip-path]"
                  style={{
                    width: track.width,
                    height: track.height,
                    clipPath: `polygon(0 ${activeTrackBounds.top}px, 100% ${activeTrackBounds.top}px, 100% ${activeTrackBounds.bottom}px, 0 ${activeTrackBounds.bottom}px)`,
                  }}
                >
                  <path
                    d={track.d}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>
          )}
          {headings.map(({ id, text, level }, index) => {
            const isCurrent = activeId === id;
            const isFirst = index === 0;
            const isLast = index === headings.length - 1;
            const isHighlighted = activeIds.includes(id);

            return (
              <a
                key={id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                  if (isCurrent) activeItemRef.current = node;
                }}
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                style={{ paddingLeft: getItemOffset(level) }}
                className={cn(
                  "relative block scroll-m-4 py-1.5 pr-1 text-sm leading-snug transition-colors [overflow-wrap:anywhere]",
                  isFirst && "pt-0",
                  isLast && "pb-0",
                  isHighlighted
                    ? "text-primary visited:!text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {text}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

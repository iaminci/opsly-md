"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getTocHeadings,
  type HeadingManifestEntry,
} from "@/lib/heading-manifest";

function isSectionHeading(level: number): boolean {
  return level === 2;
}

function getItemOffset(level: number): number {
  if (level <= 2) return 0;
  if (level === 3) return 12;
  return 24;
}

function findActiveSectionId(
  headings: HeadingManifestEntry[],
  activeId: string | null
): string | null {
  if (!activeId) return null;
  const activeIndex = headings.findIndex((h) => h.id === activeId);
  if (activeIndex === -1) return null;
  for (let i = activeIndex; i >= 0; i--) {
    if (headings[i]!.level === 2) return headings[i]!.id;
  }
  return null;
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

export function TableOfContents({ content, scrollContainerRef }: TableOfContentsProps) {
  const headings = useMemo(() => getTocHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string | null>(
    () => getTocHeadings(content)[0]?.id ?? null
  );
  const tocScrollRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const tickingRef = useRef(false);
  const lastSetIdRef = useRef<string | null>(null);

  const activeSectionId = useMemo(
    () => findActiveSectionId(headings, activeId),
    [headings, activeId]
  );

  useLayoutEffect(() => {
    lastSetIdRef.current = null;
    if (headings.length === 0) {
      setActiveId(null);
      return;
    }
    const scrollEl = scrollContainerRef?.current ?? document.documentElement;
    const root = scrollContainerRef?.current ?? null;
    const id = pickActiveHeadingId(headings, scrollEl, root, 100);
    if (!id) return;
    lastSetIdRef.current = id;
    setActiveId(id);
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
        className="native-scrollbar-transparent-track min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden pr-3 [overflow-wrap:anywhere]"
      >
        <ul className="w-full min-w-0 px-1 pb-2">
          {headings.map(({ id, text, level }, index) => {
            const isActive = activeId === id;
            const isSection = isSectionHeading(level);
            const isActiveSection =
              activeSectionId === id && !isActive && isSection;
            const isFirst = index === 0;
            const isLast = index === headings.length - 1;
            const isHighlighted = isActive || isActiveSection;

            return (
              <li
                key={id}
                style={{ paddingLeft: getItemOffset(level) }}
                className="min-w-0"
              >
                <a
                  ref={isActive ? activeItemRef : null}
                  href={`#${id}`}
                  onClick={(e) => handleClick(e, id)}
                  className={cn(
                    "block scroll-m-4 rounded-md px-1.5 py-1.5 text-sm leading-snug transition-colors [overflow-wrap:anywhere] hover:bg-surface-hover",
                    isFirst && "pt-0",
                    isLast && "pb-0",
                    isHighlighted
                      ? "font-medium text-primary visited:!text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

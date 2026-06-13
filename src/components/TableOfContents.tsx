"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildHeadingManifest, type HeadingManifestEntry } from "@/lib/heading-manifest";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TableOfContentsProps {
  content: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

/** Distance from the top of scrollable content to the top of `el` (scroll coordinates). */
function headingTopInScrollSpace(el: Element, scrollEl: Element, root: HTMLElement | null): number {
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
  const headings = useMemo(
    () => buildHeadingManifest(content).filter((h) => h.level <= 3),
    [content]
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    buildHeadingManifest(content).filter((h) => h.level <= 3)[0]?.id ?? null
  );
  const tocScrollRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const tickingRef = useRef(false);
  const lastSetIdRef = useRef<string | null>(null);

  // When switching documents / content, headings and scroll position relative to sections change;
  // re-sync which section is "active" and clear the throttle guard immediately.
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

    // Only adjust the scroll viewport's scrollTop — avoid scrollIntoView(), which can
    // scroll ancestor panes (tabs/sidebar) and move headings/tabs with it.
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
      <h3 className="mb-2 shrink-0 pr-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </h3>
      <ScrollArea
        ref={tocScrollRef}
        className="min-h-0 min-w-0 w-full flex-1"
        viewportClassName="pr-4 [overflow-wrap:anywhere]"
      >
        <ul className="w-full min-w-0 space-y-1 px-1.5 pb-1">
          {headings.map(({ id, text, level }) => (
            <li
              key={id}
              style={{ paddingLeft: `${(level - 1) * 8}px` }}
              className="min-w-0 text-sm"
            >
              <a
                ref={activeId === id ? activeItemRef : null}
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                className={cn(
                  "block w-full max-w-full min-w-0 rounded-md border-2 border-l-2 px-2 py-1 transition-colors [overflow-wrap:anywhere]",
                  activeId === id
                    ? "border-border bg-sidebar-accent font-medium text-primary visited:!text-primary"
                    : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                {text}
              </a>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </nav>
  );
}

"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildHeadingManifest } from "@/lib/heading-manifest";

interface TableOfContentsProps {
  content: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export function TableOfContents({ content, scrollContainerRef }: TableOfContentsProps) {
  const headings = useMemo(
    () => buildHeadingManifest(content).filter((h) => h.level <= 3),
    [content]
  );
  const [activeId, setActiveId] = useState<string | null>(
    () => buildHeadingManifest(content).filter((h) => h.level <= 3)[0]?.id ?? null
  );
  const tocRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const tickingRef = useRef(false);
  const lastSetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const heads = buildHeadingManifest(content).filter((h) => h.level <= 3);
    if (heads.length === 0) return;
    const scrollEl = scrollContainerRef?.current ?? document.documentElement;
    const root = scrollContainerRef?.current ?? null;

    const findActiveId = (): string | null => {
      const viewportTop = root ? scrollEl.scrollTop : window.scrollY;
      const offset = 100;
      let active: string | null = null;
      for (let i = heads.length - 1; i >= 0; i--) {
        const el = document.getElementById(heads[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const elTop = root ? rect.top + scrollEl.scrollTop : rect.top + window.scrollY;
        if (elTop <= viewportTop + offset) {
          active = heads[i].id;
          break;
        }
      }
      return active ?? heads[0]?.id ?? null;
    };

    let cancelled = false;
    const updateActiveId = () => {
      if (tickingRef.current || cancelled) return;
      tickingRef.current = true;
      setTimeout(() => {
        if (cancelled) return;
        tickingRef.current = false;
        const id = findActiveId();
        if (!id) return;
        if (id === lastSetIdRef.current) return;
        lastSetIdRef.current = id;
        setActiveId(id);
      }, 0);
    };

    const onScroll = () => updateActiveId();
    const cleanup = () => {
      cancelled = true;
      if (root) root.removeEventListener("scroll", onScroll);
      else window.removeEventListener("scroll", onScroll);
    };
    if (root) root.addEventListener("scroll", onScroll, { passive: true });
    else window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
  }, [content, scrollContainerRef]);

  useLayoutEffect(() => {
    if (!activeId) return;
    const list = tocRef.current;
    const node = activeItemRef.current;
    if (!list || !node) return;

    // Only adjust the TOC list’s scrollTop — avoid scrollIntoView(), which can
    // scroll ancestor panes (tabs/sidebar) and move headings/tabs with it.
    const pad = 8;
    const listRect = list.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    if (nodeRect.top < listRect.top + pad) {
      list.scrollTop += nodeRect.top - listRect.top - pad;
    } else if (nodeRect.bottom > listRect.bottom - pad) {
      list.scrollTop += nodeRect.bottom - listRect.bottom + pad;
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
      <h3 className="mb-2 shrink-0 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </h3>
      <ul
        ref={tocRef}
        className="min-h-0 w-full flex-1 space-y-1 overflow-y-auto overflow-x-hidden border-l-2 border-[color:var(--sidebar-guide)] pl-1.5 pb-1"
      >
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
                "block w-full min-w-0 break-words rounded-md border-2 border-l-2 px-2 py-1 transition-colors scroll-mt-4",
                activeId === id
                  ? "border-border bg-primary/90 font-medium !text-background visited:!text-background"
                  : "border-transparent text-muted hover:bg-primary/90 hover:!text-background"
              )}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

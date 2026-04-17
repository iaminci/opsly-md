"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (/^\s{4,}/.test(line) || line.startsWith("\t")) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/#+\s*$/, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      if (level <= 3) headings.push({ id, text, level });
    }
  }

  return headings;
}

export function TableOfContents({ content, scrollContainerRef }: TableOfContentsProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  // Initialize with first heading; component remounts on doc change (key), so this stays correct
  const [activeId, setActiveId] = useState<string | null>(() => extractHeadings(content)[0]?.id ?? null);
  const tocRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const tickingRef = useRef(false);
  const lastSetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const heads = extractHeadings(content);
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

    // No initial setState in effect - avoids update loop. Highlight appears on first scroll.

    const onScroll = () => updateActiveId();
    const cleanup = () => {
      cancelled = true;
      if (root) root.removeEventListener("scroll", onScroll);
      else window.removeEventListener("scroll", onScroll);
    };
    if (root) root.addEventListener("scroll", onScroll, { passive: true });
    else window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
  }, [content]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-8 self-start">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </h3>
      <ul ref={tocRef} className="space-y-1 border-l border-orange-500/50 dark:[border-color:var(--dm-border)] pl-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
        {headings.map(({ id, text, level }) => (
          <li key={id} style={{ paddingLeft: `${(level - 1) * 8}px` }} className="text-sm">
            <a
              ref={activeId === id ? activeItemRef : null}
              href={`#${id}`}
              onClick={(e) => handleClick(e, id)}
              className={cn(
                "block rounded-md border-2 px-1 -ml-1 transition-colors scroll-mt-4 border-l-2 -ml-px",
                activeId === id
                  ? "border-border text-orange-600 font-medium bg-orange-500/15 dark:border-orange-400 dark:text-orange-400 dark:[color:var(--dm-text)] dark:bg-orange-500/20 dark:[background-color:var(--dm-bg)] dark:[border-color:var(--dm-text)]"
                  : "border-transparent text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:bg-orange-500/10 dark:hover:text-orange-400 dark:hover:[background-color:var(--dm-bg)]"
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

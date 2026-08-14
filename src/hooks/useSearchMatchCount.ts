"use client";

import { useLayoutEffect, type RefObject } from "react";

interface UseSearchMatchCountOptions {
  searchQuery: string;
  /** Re-run when rendered markdown output changes. */
  mountKey: string;
  enabled?: boolean;
  onMatchCountChange?: (count: number) => void;
}

/** Read rendered `<mark.search-highlight>` count after React commit (no DOM mutation). */
export function useSearchMatchCount(
  articleRef: RefObject<HTMLElement | null>,
  {
    searchQuery,
    mountKey,
    enabled = true,
    onMatchCountChange,
  }: UseSearchMatchCountOptions
): void {
  useLayoutEffect(() => {
    const root = articleRef.current;
    if (!root || !enabled || !searchQuery.trim()) {
      onMatchCountChange?.(0);
      return;
    }

    const count = root.querySelectorAll("mark.search-highlight").length;
    onMatchCountChange?.(count);
  }, [articleRef, mountKey, searchQuery, enabled, onMatchCountChange]);
}

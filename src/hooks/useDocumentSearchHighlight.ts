"use client";

import { useLayoutEffect, type RefObject } from "react";
import { applySearchHighlights, clearSearchHighlights } from "@/lib/search-highlight";

interface UseDocumentSearchHighlightOptions {
  searchQuery: string;
  activeMatchIndex: number;
  /** Remount key — re-apply when markdown output is replaced. */
  mountKey: string;
  enabled?: boolean;
  onMatchCountChange?: (count: number) => void;
}

export function useDocumentSearchHighlight(
  articleRef: RefObject<HTMLElement | null>,
  {
    searchQuery,
    activeMatchIndex,
    mountKey,
    enabled = true,
    onMatchCountChange,
  }: UseDocumentSearchHighlightOptions
): void {
  useLayoutEffect(() => {
    const root = articleRef.current;
    if (!root || !enabled) {
      if (root) clearSearchHighlights(root);
      onMatchCountChange?.(0);
      return;
    }

    if (!searchQuery.trim()) {
      clearSearchHighlights(root);
      onMatchCountChange?.(0);
      return;
    }

    const count = applySearchHighlights(root, searchQuery, activeMatchIndex);
    onMatchCountChange?.(count);

    return () => {
      clearSearchHighlights(root);
    };
  }, [articleRef, mountKey, searchQuery, activeMatchIndex, enabled, onMatchCountChange]);
}

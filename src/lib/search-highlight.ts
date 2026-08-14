export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Scroll so the match sits below the top edge of the viewport (Ctrl+F-style). */
export function scrollToSearchMatch(
  scrollContainer: HTMLElement,
  matchIndex: number,
  paddingTop = 96
): boolean {
  let mark = scrollContainer.querySelector(
    `mark.search-highlight[data-search-match-index="${String(matchIndex)}"]`
  );
  if (!(mark instanceof HTMLElement)) {
    mark =
      scrollContainer.querySelector("mark.search-highlight-active") ??
      scrollContainer.querySelector("mark.search-highlight");
  }
  if (!(mark instanceof HTMLElement)) return false;

  const viewRect = scrollContainer.getBoundingClientRect();
  const nodeRect = mark.getBoundingClientRect();
  scrollContainer.scrollTop += nodeRect.top - viewRect.top - paddingTop;
  return true;
}

export function getMatchSnippet(
  text: string,
  query: string,
  radiusBefore = 40,
  radiusAfter = 40
): { snippet: string; matchStart: number; matchLength: number } | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const lower = text.toLowerCase();
  const qLower = trimmed.toLowerCase();
  const matchIndex = lower.indexOf(qLower);
  if (matchIndex === -1) return null;

  return buildSnippetAroundMatch(text, matchIndex, trimmed.length, radiusBefore, radiusAfter);
}

function buildSnippetAroundMatch(
  text: string,
  matchIndex: number,
  matchLength: number,
  radiusBefore: number,
  radiusAfter: number
): { snippet: string; matchStart: number; matchLength: number } {
  const start = Math.max(0, matchIndex - radiusBefore);
  const end = Math.min(text.length, matchIndex + matchLength + radiusAfter);
  const rawSlice = text.slice(start, end);
  const localMatchStart = matchIndex - start;
  const localMatchEnd = localMatchStart + matchLength;
  const before = rawSlice.slice(0, localMatchStart).replace(/\s+/g, " ");
  const matchText = rawSlice.slice(localMatchStart, localMatchEnd);
  const after = rawSlice.slice(localMatchEnd).replace(/\s+/g, " ");
  const leadingEllipsis = start > 0 ? "…" : "";
  const trailingEllipsis = end < text.length ? "…" : "";
  const snippet = `${leadingEllipsis}${before}${matchText}${after}${trailingEllipsis}`;
  return {
    snippet,
    matchStart: leadingEllipsis.length + before.length,
    matchLength: matchText.length,
  };
}

export type SearchSnippetPreview = {
  snippet: string;
  matchStart: number;
  matchLength: number;
};

export function countQueryMatches(text: string, query: string): number {
  const trimmed = query.trim();
  if (!trimmed) return 0;
  const regex = new RegExp(escapeRegExp(trimmed), "gi");
  return [...text.matchAll(regex)].length;
}

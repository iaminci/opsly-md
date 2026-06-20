const SKIP_ANCESTOR_SELECTOR = "pre, .katex, svg, [data-opsly-mask]";

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function clearSearchHighlights(root: HTMLElement): void {
  const marks = root.querySelectorAll("mark.search-highlight");
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent || !parent.contains(mark)) continue;
    try {
      parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
    } catch {
      // Node may already have been removed by React during a fast remount.
    }
  }
  try {
    root.normalize();
  } catch {
    // ignore
  }
}

function highlightTextNode(
  textNode: Text,
  query: string,
  getNextMatchIndex: () => number,
  activeMatchIndex: number
): void {
  const text = textNode.textContent ?? "";
  const regex = new RegExp(escapeRegExp(query), "gi");
  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) return;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }
    const index = getNextMatchIndex();
    const mark = document.createElement("mark");
    mark.className =
      index === activeMatchIndex
        ? "search-highlight search-highlight-active"
        : "search-highlight";
    mark.dataset.searchMatchIndex = String(index);
    mark.textContent = match[0];
    fragment.appendChild(mark);
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  const parent = textNode.parentNode;
  if (!parent || !parent.contains(textNode)) return;
  try {
    parent.replaceChild(fragment, textNode);
  } catch {
    // Text node may have been replaced while React was reconciling.
  }
}

function collectHighlightableTextNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest("mark.search-highlight")) return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP_ANCESTOR_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (!(node.textContent ?? "")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  return nodes;
}

/** Wrap all case-insensitive matches in prose; returns total match count. */
export function applySearchHighlights(
  root: HTMLElement,
  query: string,
  activeMatchIndex: number
): number {
  clearSearchHighlights(root);

  const trimmed = query.trim();
  if (!trimmed) return 0;

  let matchCount = 0;
  const textNodes = collectHighlightableTextNodes(root);

  for (const textNode of textNodes) {
    highlightTextNode(textNode, trimmed, () => matchCount++, activeMatchIndex);
  }

  return matchCount;
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

export type QueryMatchSegment = {
  text: string;
  isMatch: boolean;
};

/** Split text into segments for rendering query highlights in React. */
export function getQueryMatchSegments(text: string, query: string): QueryMatchSegment[] {
  const trimmed = query.trim();
  if (!trimmed) return [{ text, isMatch: false }];

  const regex = new RegExp(escapeRegExp(trimmed), "gi");
  const segments: QueryMatchSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), isMatch: false });
    }
    segments.push({ text: match[0], isMatch: true });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMatch: false });
  }

  return segments.length > 0 ? segments : [{ text, isMatch: false }];
}

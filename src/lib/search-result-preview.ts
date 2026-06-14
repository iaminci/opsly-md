import { slugifyHeadingText } from "@/lib/heading-manifest";
import {
  countQueryMatches,
  escapeRegExp,
  getMatchSnippet,
  type SearchSnippetPreview,
} from "@/lib/search-highlight";
import { normalizeInvalidAtxParagraphBreaks } from "@/lib/utils";

const DEFAULT_MAX_SECTIONS = 3;
const SECTION_CACHE_MAX = 128;
const HEADING_PATH_SEPARATOR = " › ";
const SNIPPET_RADIUS_BEFORE = 30;
const SNIPPET_RADIUS_AFTER = 65;
const SNIPPET_MIN_LENGTH = 60;
const SNIPPET_MAX_LENGTH = 120;

export type SearchResultSection = {
  id: string;
  path: string[];
  headingText: string;
  level: number;
  matchCount: number;
};

export function formatSearchResultHeadingPath(path: string[]): string {
  return path.join(HEADING_PATH_SEPARATOR);
}

function normalizeHeadingLabel(text: string): string {
  return text.trim().toLowerCase();
}

/** Drop the document title from path prefixes — title is already shown on the result row. */
function stripDocumentTitleFromPath(path: string[], documentTitle: string): string[] {
  const normalizedTitle = normalizeHeadingLabel(documentTitle);
  if (!normalizedTitle || path.length === 0) return path;

  let startIndex = 0;
  while (
    startIndex < path.length &&
    normalizeHeadingLabel(path[startIndex]!) === normalizedTitle
  ) {
    startIndex++;
  }

  return path.slice(startIndex);
}

export type DocumentSearchPreview = {
  matchCount: number;
  sections: SearchResultSection[];
  moreMatchCount: number;
  fallbackSnippet: SearchSnippetPreview | null;
};

type DocumentSection = {
  id: string;
  text: string;
  level: number;
  startOffset: number;
};

const sectionCache = new Map<string, DocumentSection[]>();

function cacheSections(normalized: string, sections: DocumentSection[]): DocumentSection[] {
  if (sectionCache.size >= SECTION_CACHE_MAX) sectionCache.clear();
  sectionCache.set(normalized, sections);
  return sections;
}

/** Line scan with offsets — fast path for mapping matches to headings. */
function buildDocumentSections(content: string): DocumentSection[] {
  const normalized = normalizeInvalidAtxParagraphBreaks(content);
  const cached = sectionCache.get(normalized);
  if (cached) return cached;

  const lines = normalized.split("\n");
  let inCodeBlock = false;
  let offset = 0;
  const raw: Array<{ level: number; text: string; startOffset: number }> = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      offset += line.length + 1;
      continue;
    }
    if (inCodeBlock || /^\s{4,}/.test(line) || line.startsWith("\t")) {
      offset += line.length + 1;
      continue;
    }

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1]!.length;
      const text = match[2]!.replace(/#+\s*$/, "").trim();
      if (text) raw.push({ level, text, startOffset: offset });
    }
    offset += line.length + 1;
  }

  const slugCounts = new Map<string, number>();
  const sections: DocumentSection[] = raw.map(({ level, text, startOffset }) => {
    const base = slugifyHeadingText(text);
    const seen = slugCounts.get(base) ?? 0;
    slugCounts.set(base, seen + 1);
    const id = seen === 0 ? base : `${base}-${seen}`;
    return { id, text, level, startOffset };
  });

  return cacheSections(normalized, sections);
}

function findSectionIndex(sections: DocumentSection[], id: string): number {
  return sections.findIndex((section) => section.id === id);
}

/** Build markdown heading ancestry for a section (e.g. ["Scripts Overview", "install.sh"]). */
function getHeadingPath(sections: DocumentSection[], sectionIndex: number): string[] {
  const section = sections[sectionIndex];
  if (!section) return [];

  let parentIndex = -1;
  for (let index = sectionIndex - 1; index >= 0; index--) {
    if (sections[index]!.level < section.level) {
      parentIndex = index;
      break;
    }
  }

  if (parentIndex === -1) return [section.text];
  return [...getHeadingPath(sections, parentIndex), section.text];
}

function findSectionForOffset(
  sections: DocumentSection[],
  offset: number
): DocumentSection | null {
  if (sections.length === 0) return null;
  let found: DocumentSection | null = null;
  for (const section of sections) {
    if (section.startOffset <= offset) found = section;
    else break;
  }
  return found;
}

function findAllMatchPositions(
  text: string,
  query: string
): Array<{ index: number; length: number }> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const regex = new RegExp(escapeRegExp(trimmed), "gi");
  return [...text.matchAll(regex)].map((match) => ({
    index: match.index ?? 0,
    length: match[0].length,
  }));
}

function isInsideFencedCodeBlock(content: string, index: number): boolean {
  const before = content.slice(0, index);
  let inBlock = false;
  for (const line of before.split("\n")) {
    if (line.startsWith("```")) inBlock = !inBlock;
  }
  return inBlock;
}

function isMatchInCodeContext(content: string, index: number): boolean {
  if (isInsideFencedCodeBlock(content, index)) return true;

  const lineStart = content.lastIndexOf("\n", index - 1) + 1;
  const lineEnd = content.indexOf("\n", index);
  const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
  return /^\s{4,}/.test(line) || line.startsWith("\t");
}

function readabilityScore(text: string): number {
  const cleaned = text.replace(/…/g, "").trim();
  if (!cleaned) return -100;

  const readableChars = (cleaned.match(/[a-zA-Z0-9\s.,;:!?'"()-]/g) ?? []).length;
  const ratio = readableChars / cleaned.length;
  const words = cleaned.split(/\s+/).filter(Boolean);
  const avgWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1);

  let score = ratio * 50;
  if (avgWordLength > 18) score -= 25;
  if (words.length < 4) score -= 10;
  return score;
}

function buildSnippetAroundMatch(
  text: string,
  matchIndex: number,
  matchLength: number,
  radiusBefore: number,
  radiusAfter: number
): SearchSnippetPreview {
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

function constrainSnippetLength(
  preview: SearchSnippetPreview,
  minLength = SNIPPET_MIN_LENGTH,
  maxLength = SNIPPET_MAX_LENGTH
): SearchSnippetPreview {
  const { snippet, matchStart, matchLength } = preview;
  if (snippet.length >= minLength && snippet.length <= maxLength) return preview;

  if (snippet.length <= maxLength) return preview;

  const availableBefore = matchStart;

  let trimBefore = Math.max(0, snippet.length - maxLength);
  if (trimBefore > availableBefore) trimBefore = availableBefore;

  let trimmed = snippet.slice(trimBefore);
  let newMatchStart = matchStart - trimBefore;
  const newMatchLength = matchLength;

  if (trimmed.length > maxLength) {
    const overflow = trimmed.length - maxLength;
    const trimAfter = Math.min(overflow, trimmed.length - (newMatchStart + newMatchLength));
    trimmed = trimmed.slice(0, trimmed.length - trimAfter);
    if (!trimmed.endsWith("…") && trimAfter > 0) trimmed += "…";
  }

  if (trimBefore > 0 && !trimmed.startsWith("…")) {
    trimmed = `…${trimmed}`;
    newMatchStart += 1;
  }

  return {
    snippet: trimmed,
    matchStart: newMatchStart,
    matchLength: newMatchLength,
  };
}

function scoreSnippetCandidate(
  content: string,
  matchIndex: number,
  matchLength: number,
  query: string,
  firstMatchIndex: number
): number {
  if (isMatchInCodeContext(content, matchIndex)) return -1000;

  const preview = constrainSnippetLength(
    buildSnippetAroundMatch(content, matchIndex, matchLength, SNIPPET_RADIUS_BEFORE, SNIPPET_RADIUS_AFTER)
  );
  const snippetLength = preview.snippet.length;
  const lengthPenalty =
    snippetLength < SNIPPET_MIN_LENGTH
      ? (SNIPPET_MIN_LENGTH - snippetLength) * 0.4
      : snippetLength > SNIPPET_MAX_LENGTH
        ? (snippetLength - SNIPPET_MAX_LENGTH) * 1.5
        : 0;
  const matchesInSnippet = countQueryMatches(preview.snippet, query);
  const concentrationBonus = matchesInSnippet * 45;
  const proximityBonus = Math.max(0, 40 - Math.abs(matchIndex - firstMatchIndex) / 80);

  return concentrationBonus + proximityBonus + readabilityScore(preview.snippet) - lengthPenalty;
}

function selectRelevanceFallbackSnippet(content: string, query: string): SearchSnippetPreview | null {
  const positions = findAllMatchPositions(content, query);
  if (positions.length === 0) return null;

  const firstMatchIndex = positions[0]!.index;
  let best: { score: number; preview: SearchSnippetPreview } | null = null;

  for (const { index, length } of positions) {
    const score = scoreSnippetCandidate(content, index, length, query, firstMatchIndex);
    const preview = constrainSnippetLength(
      buildSnippetAroundMatch(content, index, length, SNIPPET_RADIUS_BEFORE, SNIPPET_RADIUS_AFTER)
    );
    if (!best || score > best.score) {
      best = { score, preview };
    }
  }

  if (best && best.score > -500) return best.preview;

  for (const { index, length } of positions) {
    if (!isMatchInCodeContext(content, index)) {
      return constrainSnippetLength(
        buildSnippetAroundMatch(content, index, length, SNIPPET_RADIUS_BEFORE, SNIPPET_RADIUS_AFTER)
      );
    }
  }

  const first = positions[0]!;
  return constrainSnippetLength(
    buildSnippetAroundMatch(content, first.index, first.length, SNIPPET_RADIUS_BEFORE, SNIPPET_RADIUS_AFTER)
  );
}

function visibleHeadingsExplainMatch(
  sections: SearchResultSection[],
  query: string
): boolean {
  return sections.some((section) =>
    section.path.some((segment) => countQueryMatches(segment, query) > 0)
  );
}

type RankedSectionEntry = {
  id: string;
  path: string[];
  headingText: string;
  level: number;
  matchCount: number;
  startOffset: number;
  headingContainsQuery: boolean;
};

function mergeSectionsByPath(
  sections: RankedSectionEntry[]
): RankedSectionEntry[] {
  const merged = new Map<string, RankedSectionEntry>();

  for (const section of sections) {
    const pathKey = formatSearchResultHeadingPath(section.path);
    const existing = merged.get(pathKey);
    if (existing) {
      existing.matchCount += section.matchCount;
      existing.headingContainsQuery =
        existing.headingContainsQuery || section.headingContainsQuery;
      if (section.startOffset < existing.startOffset) {
        existing.startOffset = section.startOffset;
        existing.id = section.id;
        existing.level = section.level;
        existing.headingText = section.headingText;
      }
      continue;
    }

    merged.set(pathKey, { ...section });
  }

  return [...merged.values()];
}

/** Section-aware preview for sidebar search results. */
export function getDocumentSearchPreview(
  title: string,
  content: string,
  query: string,
  maxSections = DEFAULT_MAX_SECTIONS
): DocumentSearchPreview {
  const trimmed = query.trim();
  if (!trimmed) {
    return { matchCount: 0, sections: [], moreMatchCount: 0, fallbackSnippet: null };
  }

  const normalizedContent = normalizeInvalidAtxParagraphBreaks(content);
  const titleMatchCount = countQueryMatches(title, trimmed);
  const contentMatchCount = countQueryMatches(normalizedContent, trimmed);
  const matchCount = titleMatchCount + contentMatchCount;

  if (matchCount === 0) {
    return { matchCount: 0, sections: [], moreMatchCount: 0, fallbackSnippet: null };
  }

  const documentSections = buildDocumentSections(normalizedContent);
  const contentMatches = findAllMatchPositions(normalizedContent, trimmed);
  const firstMatchIndex = contentMatches[0]?.index ?? 0;

  const sectionCounts = new Map<string, RankedSectionEntry>();

  for (const { index } of contentMatches) {
    const section = findSectionForOffset(documentSections, index);
    if (!section) continue;

    const sectionIndex = findSectionIndex(documentSections, section.id);
    if (sectionIndex === -1) continue;

    const path = stripDocumentTitleFromPath(
      getHeadingPath(documentSections, sectionIndex),
      title
    );
    const existing = sectionCounts.get(section.id);
    if (existing) {
      existing.matchCount++;
      continue;
    }

    sectionCounts.set(section.id, {
      id: section.id,
      path,
      headingText: section.text,
      level: section.level,
      matchCount: 1,
      startOffset: section.startOffset,
      headingContainsQuery: countQueryMatches(section.text, trimmed) > 0,
    });
  }

  const rankedSections = mergeSectionsByPath([...sectionCounts.values()]).sort((a, b) => {
    const aHeadingMatch = a.headingContainsQuery ? 1 : 0;
    const bHeadingMatch = b.headingContainsQuery ? 1 : 0;
    if (bHeadingMatch !== aHeadingMatch) return bHeadingMatch - aHeadingMatch;
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return (
      Math.abs(a.startOffset - firstMatchIndex) - Math.abs(b.startOffset - firstMatchIndex)
    );
  });

  const displayableRanked = rankedSections.filter((section) => section.path.length > 0);
  const visibleSections = displayableRanked.slice(0, maxSections).map(
    ({ id, path, headingText, level, matchCount: count }) => ({
      id,
      path,
      headingText,
      level,
      matchCount: count,
    })
  );

  const moreMatchCount =
    displayableRanked.slice(maxSections).reduce((sum, section) => sum + section.matchCount, 0) +
    rankedSections
      .filter((section) => section.path.length === 0)
      .reduce((sum, section) => sum + section.matchCount, 0);

  let fallbackSnippet: SearchSnippetPreview | null = null;
  const headingsExplainMatch = visibleHeadingsExplainMatch(visibleSections, trimmed);

  if (visibleSections.length === 0) {
    fallbackSnippet =
      selectRelevanceFallbackSnippet(normalizedContent, trimmed) ??
      (titleMatchCount > 0 ? getMatchSnippet(title, trimmed, 25, 35) : null);
  } else if (!headingsExplainMatch) {
    fallbackSnippet = selectRelevanceFallbackSnippet(normalizedContent, trimmed);
  } else if (titleMatchCount > 0 && contentMatchCount === 0) {
    fallbackSnippet = getMatchSnippet(title, trimmed, 25, 35);
  }

  return {
    matchCount,
    sections: visibleSections,
    moreMatchCount,
    fallbackSnippet,
  };
}

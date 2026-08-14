import MiniSearch from "minisearch";
import type { Document } from "@/types/document";

export const DOCUMENT_SEARCH_RESULT_LIMIT = 8;

export type DocumentSearchIndex = MiniSearch<{ id: string; title: string; content: string }>;

/**
 * MiniSearch index for ranking document matches (substring filter preserved for UX parity).
 * Returns `null` if index construction fails (e.g. duplicate ids) — callers fall back to
 * substring-filter order instead of throwing.
 */
export function createDocumentSearchIndex(documents: Document[]): DocumentSearchIndex | null {
  try {
    const miniSearch = new MiniSearch({
      idField: "id",
      fields: ["title", "content"],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
        boost: { title: 2 },
      },
    });

    miniSearch.addAll(
      documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
      }))
    );

    return miniSearch;
  } catch {
    return null;
  }
}

/**
 * Returns documents whose title or body contain the query (case-insensitive),
 * ranked by MiniSearch relevance scores among those matches. Falls back to
 * substring-filter order (no ranking) if `index` is `null`.
 */
export function searchDocuments(
  index: DocumentSearchIndex | null,
  documents: Document[],
  query: string,
  limit = DOCUMENT_SEARCH_RESULT_LIMIT
): Document[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const matching = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(lower) || doc.content.toLowerCase().includes(lower)
  );
  if (matching.length === 0) return [];

  if (!index) return matching.slice(0, limit);

  let scores: Map<string, number>;
  try {
    scores = new Map(index.search(trimmed).map((result) => [result.id, result.score]));
  } catch {
    return matching.slice(0, limit);
  }

  return matching
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, limit);
}

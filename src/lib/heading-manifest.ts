/**
 * Build heading manifest from markdown using the same remark pipeline as
 * `MarkdownRenderer`, so TOC labels and anchor IDs match rendered headings.
 */

import type { Heading, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { remarkCodeBlockLang } from "@/lib/remark-code-block-lang";
import { remarkTreeStructure } from "@/lib/remark-tree-structure";
import { normalizeInvalidAtxParagraphBreaks } from "@/lib/utils";

export interface HeadingManifestEntry {
  id: string;
  level: number;
  text: string;
}

export function slugifyHeadingText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function markdownToMdast(markdown: string): Root {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkCodeBlockLang)
    .use(remarkTreeStructure)
    .parse(markdown);
  return file as Root;
}

/**
 * Ordered list of headings in the document with unique `id` values for anchors.
 */
export function buildHeadingManifest(markdown: string): HeadingManifestEntry[] {
  const src = normalizeInvalidAtxParagraphBreaks(markdown);

  let tree: Root;
  try {
    tree = markdownToMdast(src);
  } catch {
    return legacyLineHeadingManifest(src);
  }

  const raw: { level: number; text: string }[] = [];
  visit(tree, "heading", (node: Heading) => {
    const text = toString(node, {
      includeImageAlt: false,
    }).trim();
    if (!text) return;
    raw.push({ level: node.depth, text });
  });

  return assignSlugIds(raw);
}

/** Fallback when remark fails so the document still renders a reasonable TOC. */
function legacyLineHeadingManifest(src: string): HeadingManifestEntry[] {
  const lines = src.split("\n");
  let inCodeBlock = false;
  const raw: { level: number; text: string }[] = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (/^\s{4,}/.test(line) || line.startsWith("\t")) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1]!.length;
      const text = match[2]!.replace(/#+\s*$/, "").trim();
      if (!text) continue;
      raw.push({ level, text });
    }
  }

  return assignSlugIds(raw);
}

function assignSlugIds(raw: { level: number; text: string }[]): HeadingManifestEntry[] {
  const seen = new Map<string, number>();
  return raw.map(({ level, text }) => {
    const base = slugifyHeadingText(text);
    const c = seen.get(base) ?? 0;
    seen.set(base, c + 1);
    const id = c === 0 ? base : `${base}-${c}`;
    return { id, level, text };
  });
}

const headingQueueKey = (level: number, text: string) =>
  `${level}::${text.trim()}`;

/**
 * Map each `${level}::text` to ordered `id` values (for duplicate headings in the manifest).
 * Used to assign `id` on the client without a shared render counter, which can desync
 * on SSR vs client when heading render order differs.
 */
export function buildHeadingIdQueueMap(
  entries: HeadingManifestEntry[]
): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of entries) {
    const key = headingQueueKey(e.level, e.text);
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(e.id);
  }
  return m;
}

/**
 * Returns the next manifest `id` for this heading level and plain text, or a slug from `text` if unknown.
 * `consumed` must be a fresh `Map` for each top-level `MarkdownRenderer` render.
 */
export function takeNextHeadingId(
  level: number,
  plainText: string,
  queueMap: Map<string, string[]>,
  consumed: Map<string, number>
): string {
  const trimmed = plainText.trim();
  const key = headingQueueKey(level, trimmed);
  const ids = queueMap.get(key);
  if (!ids?.length) {
    return slugifyHeadingText(trimmed);
  }
  const n = consumed.get(key) ?? 0;
  if (n >= ids.length) {
    return slugifyHeadingText(trimmed);
  }
  consumed.set(key, n + 1);
  return ids[n]!;
}

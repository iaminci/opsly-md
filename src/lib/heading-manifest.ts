/**
 * Parse ATX headings from markdown (same rules as legacy TOC) and assign
 * stable, unique DOM ids when slug collisions occur (e.g. two "Setup" sections).
 */

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

/**
 * Ordered list of headings in the document with unique `id` values for anchors.
 */
export function buildHeadingManifest(markdown: string): HeadingManifestEntry[] {
  const lines = markdown.split("\n");
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
      const level = match[1].length;
      const text = match[2].replace(/#+\s*$/, "").trim();
      raw.push({ level, text });
    }
  }

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

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

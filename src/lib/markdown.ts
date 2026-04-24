import fs from "node:fs/promises";
import path from "node:path";

/**
 * Read a markdown file from `/content` and return its raw string.
 * Used by Hero and MarkdownSection to keep the homepage content
 * modular while the layout stays in React.
 */
export async function loadMarkdown(file: string): Promise<string> {
  const fullPath = path.join(process.cwd(), "content", file);
  return fs.readFile(fullPath, "utf8");
}

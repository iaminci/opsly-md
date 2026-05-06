import type { Root, Code } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Remark plugin: expand minified ` ```json ` blocks to indented JSON (parse + stringify).
 * Invalid JSON is left unchanged so broken snippets still render.
 */
export function remarkPrettyJsonBlocks() {
  return (tree: Root) => {
    visit(tree, "code", (node) => {
      const code = node as Code;
      if (code.lang?.toLowerCase() !== "json") return;
      const raw = code.value;
      if (!raw.trim()) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        code.value = JSON.stringify(parsed, null, 2);
      } catch {
        /* keep original */
      }
    });
  };
}

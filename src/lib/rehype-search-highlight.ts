import type { Element, ElementContent, Root, Text } from "hast";
import { escapeRegExp } from "@/lib/search-highlight";

const SKIP_TAG_NAMES = new Set(["pre", "svg", "script", "style"]);

type RehypeSearchHighlightOptions = {
  query: string;
  activeMatchIndex: number;
};

function getClassName(el: Element): string {
  const className = el.properties?.className;
  if (typeof className === "string") return className;
  if (Array.isArray(className)) return className.map(String).join(" ");
  return "";
}

function hasDataOpslyMask(el: Element): boolean {
  const props = el.properties ?? {};
  // Presence check, not truthiness — opsly-mask sets this to `''` (empty string).
  return "dataOpslyMask" in props || "data-opsly-mask" in props;
}

function isSkippedHighlightContext(ancestors: Element[]): boolean {
  for (const el of ancestors) {
    if (SKIP_TAG_NAMES.has(el.tagName)) return true;
    if (getClassName(el).includes("katex")) return true;
    if (hasDataOpslyMask(el)) return true;
  }
  return false;
}

function splitTextNode(
  text: Text,
  ancestors: Element[],
  regex: RegExp,
  activeMatchIndex: number,
  nextMatchIndex: () => number
): ElementContent[] | null {
  if (isSkippedHighlightContext(ancestors)) return null;

  const value = text.value;
  const matches = [...value.matchAll(regex)];
  if (matches.length === 0) return null;

  const nodes: ElementContent[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, start) });
    }

    const index = nextMatchIndex();
    const classNames = ["search-highlight"];
    if (index === activeMatchIndex) classNames.push("search-highlight-active");

    nodes.push({
      type: "element",
      tagName: "mark",
      properties: {
        className: classNames,
        dataSearchMatchIndex: String(index),
      },
      children: [{ type: "text", value: match[0] }],
    });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }

  return nodes;
}

function transformElement(
  element: Element,
  ancestors: Element[],
  regex: RegExp,
  activeMatchIndex: number,
  nextMatchIndex: () => number
): void {
  const children = element.children;
  for (let index = 0; index < children.length; index++) {
    const child = children[index]!;
    if (child.type === "text") {
      const replacement = splitTextNode(
        child,
        [...ancestors, element],
        regex,
        activeMatchIndex,
        nextMatchIndex
      );
      if (replacement) {
        children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }
      continue;
    }

    if (child.type === "element") {
      transformElement(child, [...ancestors, element], regex, activeMatchIndex, nextMatchIndex);
    }
  }
}

/** Wrap case-insensitive query matches in `<mark>` during markdown render (no live-DOM mutation). */
export function rehypeSearchHighlight(
  options: RehypeSearchHighlightOptions
): (tree: Root) => void {
  return (tree) => {
    const trimmed = options.query.trim();
    if (!trimmed) return;

    const regex = new RegExp(escapeRegExp(trimmed), "gi");
    let matchCount = 0;
    const nextMatchIndex = () => matchCount++;

    for (const child of tree.children) {
      if (child.type === "element") {
        transformElement(child, [], regex, options.activeMatchIndex, nextMatchIndex);
      }
    }
  };
}

import clsx, { type ClassValue } from "clsx";
import { isValidElement, type ReactNode } from "react";
import { twMerge, type ClassNameValue } from "tailwind-merge";

/** Plain text from React nodes (e.g. syntax-highlighted `<span>` trees). */
export function reactNodeToPlainText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "bigint") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToPlainText).join("");
  if (isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    return reactNodeToPlainText(children);
  }
  return "";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClassNameProp<TState = unknown> =
  | string
  | undefined
  | ((state: TState) => string | undefined);

/**
 * Merge static classes with Base UI `className`, which may be a function of component state.
 */
export function cnState<TState = unknown>(
  ...parts: [...ClassNameValue[], ClassNameProp<TState>]
): (state: TState) => string {
  const className = parts[parts.length - 1] as ClassNameProp<TState>;
  const bases = parts.slice(0, -1) as ClassNameValue[];
  return (state: TState) =>
    cn(
      ...bases,
      typeof className === "function" ? className(state) : className
    );
}

/** ATX heading requires a space after the # run; otherwise the next line soft-joins into one paragraph. */
const INVALID_ATX_LINE = /^\s{0,3}#{1,6}(?=\S)/;

/**
 * Insert a blank line after invalid ATX-looking lines when the following line is non-empty prose,
 * so CommonMark does not merge them into a single paragraph.
 */
export function normalizeInvalidAtxParagraphBreaks(content: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (
      i > 0 &&
      INVALID_ATX_LINE.test(lines[i - 1]!) &&
      lines[i]!.trim() !== ""
    ) {
      out.push("");
    }
    out.push(lines[i]!);
  }
  return out.join("\n");
}

/** Safe `.md` download name: strip extension, whitespace → underscores, lowercase stem. */
export function toMarkdownDownloadFilename(title: string): string {
  const base = title.replace(/\.md$/i, "").trim();
  const stem = (base.replace(/\s+/g, "_") || "document").toLowerCase();
  return `${stem}.md`;
}

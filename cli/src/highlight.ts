import hljs from "highlight.js/lib/common";
import { span, type Line, type Style } from "./text";

/** highlight.js token class → terminal style (16-colour palette, so the user's theme applies). */
const TOKEN_STYLES: Record<string, Style> = {
  keyword: { fg: 35 },
  built_in: { fg: 36 },
  type: { fg: 33 },
  literal: { fg: 33 },
  number: { fg: 33 },
  operator: { fg: 37 },
  punctuation: {},
  property: { fg: 36 },
  regexp: { fg: 31 },
  string: { fg: 32 },
  subst: {},
  symbol: { fg: 33 },
  class: { fg: 33 },
  function: { fg: 34 },
  variable: { fg: 31 },
  title: { fg: 34 },
  params: {},
  comment: { fg: 90, italic: true },
  doctag: { fg: 90 },
  meta: { fg: 90 },
  section: { fg: 34, bold: true },
  tag: { fg: 34 },
  name: { fg: 34 },
  attr: { fg: 36 },
  attribute: { fg: 36 },
  bullet: { fg: 33 },
  code: { fg: 32 },
  emphasis: { italic: true },
  strong: { bold: true },
  formula: { fg: 35 },
  link: { fg: 34, underline: true },
  quote: { fg: 90, italic: true },
  "selector-tag": { fg: 35 },
  "selector-id": { fg: 34 },
  "selector-class": { fg: 33 },
  "selector-attr": { fg: 36 },
  "selector-pseudo": { fg: 36 },
  "template-tag": { fg: 35 },
  "template-variable": { fg: 31 },
  addition: { fg: 32 },
  deletion: { fg: 31 },
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (m) => ENTITIES[m] ?? m);
}

function styleForClasses(classes: string): Style | null {
  for (const cls of classes.split(/\s+/)) {
    // "hljs-title function_" → look up "title"; sub-scopes like "function_" carry no "hljs-" prefix.
    if (!cls.startsWith("hljs-")) continue;
    const style = TOKEN_STYLES[cls.slice(5)];
    if (style) return style;
  }
  return null;
}

function plainLines(code: string): Line[] {
  return code.split("\n").map((line) => [span(line)]);
}

/**
 * Highlight `code` and return one styled line per source line. Unknown or missing
 * languages are returned unstyled (no auto-detection, matching the web renderer).
 */
export function highlightCode(code: string, lang: string | null | undefined): Line[] {
  const language = lang?.toLowerCase();
  if (!language || !hljs.getLanguage(language)) return plainLines(code);

  let html: string;
  try {
    html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return plainLines(code);
  }

  const lines: Line[] = [[]];
  const stack: Style[] = [];
  const tokenPattern = /<span class="([^"]*)">|<\/span>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(html)) !== null) {
    if (match[1] !== undefined) {
      stack.push(styleForClasses(match[1]) ?? stack[stack.length - 1] ?? {});
    } else if (match[2] !== undefined) {
      const style = stack[stack.length - 1] ?? {};
      const parts = decodeEntities(match[2]).split("\n");
      parts.forEach((part, i) => {
        if (i > 0) lines.push([]);
        if (part) lines[lines.length - 1]!.push(span(part, style));
      });
    } else {
      stack.pop();
    }
  }

  return lines;
}

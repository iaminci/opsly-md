import type { Definition, PhrasingContent } from "mdast";
import { span, type Span, type Style } from "./text";

export interface RenderContext {
  /** Columns available to the document. */
  width: number;
  color: boolean;
  /** Show the contents of ```secure fences instead of a mask. */
  reveal: boolean;
  /** Reference-style link/image targets, keyed by normalized identifier. */
  definitions: Map<string, Definition>;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  larr: "←",
  rarr: "→",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1]?.toLowerCase() === "x"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function htmlAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  if (!match) return null;
  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? "");
}

/**
 * Reduce raw HTML to readable text: images become `[image: alt]`, `<br>` and closing
 * block tags become line breaks, comments and remaining tags are dropped.
 */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const alt = htmlAttribute(tag, "alt");
      return alt ? `[image: ${alt}]` : "[image]";
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|table|ul|ol|blockquote|details|summary|pre)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeHtmlEntities(text);
}

function plainText(nodes: PhrasingContent[]): string {
  let out = "";
  for (const node of nodes) {
    if ("value" in node && typeof node.value === "string") out += node.value;
    else if ("children" in node) out += plainText(node.children as PhrasingContent[]);
  }
  return out;
}

/** Only absolute URLs make useful terminal hyperlinks; relative paths have nothing to resolve against. */
function hyperlink(url: string): string | undefined {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : undefined;
}

function linkSpans(
  children: PhrasingContent[],
  url: string,
  style: Style,
  ctx: RenderContext,
): Span[] {
  const linkStyle: Style = { ...style, fg: 34, underline: true, link: hyperlink(url) };
  const label = plainText(children).trim();
  const spans =
    label === ""
      ? [span(url, linkStyle)]
      : renderInline(children, linkStyle, ctx);

  // Not every terminal supports clickable links, so keep the target visible —
  // except for bare URLs and in-page anchors, where it adds nothing.
  const bare = label === url || label === url.replace(/^mailto:/, "");
  if (label !== "" && !bare && !url.startsWith("#")) {
    spans.push(span(" (", { ...style, dim: true }));
    spans.push(span(url, { ...style, dim: true, link: hyperlink(url) }));
    spans.push(span(")", { ...style, dim: true }));
  }
  return spans;
}

function imageSpans(alt: string | null | undefined, url: string, style: Style): Span[] {
  const label = alt?.trim() ? `[image: ${alt.trim()}]` : "[image]";
  return [
    span(label, { ...style, fg: 35, link: hyperlink(url) }),
    span(` (${url})`, { ...style, dim: true }),
  ];
}

/** Render phrasing (inline) nodes to styled spans. A `\n` in a span is a hard line break. */
export function renderInline(
  nodes: PhrasingContent[],
  style: Style,
  ctx: RenderContext,
): Span[] {
  const out: Span[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        // Soft line breaks in the source are just whitespace.
        out.push(span(node.value.replace(/\n/g, " "), style));
        break;
      case "emphasis":
        out.push(...renderInline(node.children, { ...style, italic: true }, ctx));
        break;
      case "strong":
        out.push(...renderInline(node.children, { ...style, bold: true }, ctx));
        break;
      case "delete":
        out.push(...renderInline(node.children, { ...style, strike: true }, ctx));
        break;
      case "inlineCode":
        out.push(span(node.value.replace(/\n/g, " "), { ...style, fg: 33 }));
        break;
      case "inlineMath":
        out.push(span(node.value.replace(/\n/g, " "), { ...style, fg: 35, italic: true }));
        break;
      case "break":
        out.push({ text: "\n", style });
        break;
      case "link":
        out.push(...linkSpans(node.children, node.url, style, ctx));
        break;
      case "linkReference": {
        const def = ctx.definitions.get(node.identifier);
        if (def) out.push(...linkSpans(node.children, def.url, style, ctx));
        else out.push(...renderInline(node.children, style, ctx));
        break;
      }
      case "image":
        out.push(...imageSpans(node.alt, node.url, style));
        break;
      case "imageReference": {
        const def = ctx.definitions.get(node.identifier);
        out.push(...imageSpans(node.alt, def?.url ?? node.identifier, style));
        break;
      }
      case "footnoteReference":
        out.push(span(`[${node.label ?? node.identifier}]`, { ...style, fg: 36 }));
        break;
      case "html": {
        const text = htmlToText(node.value);
        if (text === "\n") out.push({ text: "\n", style });
        else if (text) out.push(span(text.replace(/\n/g, " "), style));
        break;
      }
      default:
        break;
    }
  }

  return out;
}

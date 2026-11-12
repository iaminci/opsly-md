import type {
  Code,
  Definition,
  Heading,
  List,
  ListItem,
  Root,
  RootContent,
  Table,
} from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { remarkPrettyJsonBlocks } from "@/lib/remark-pretty-json-blocks";
import { remarkTreeStructure } from "@/lib/remark-tree-structure";
import { highlightCode } from "./highlight";
import { htmlToText, renderInline, type RenderContext } from "./inline";
import {
  lineWidth,
  pad,
  serialize,
  span,
  wrap,
  type Line,
  type Span,
  type Style,
} from "./text";

export interface RenderOptions {
  width: number;
  color: boolean;
  reveal: boolean;
}

const FRAME: Style = { fg: 90 };
const SECURE_MASK = "•".repeat(16);
const BULLETS = ["•", "◦", "▪"];

const HEADING_STYLES: Record<number, Style> = {
  1: { bold: true, fg: "38;5;228", bg: "48;5;63" },
  2: { bold: true, fg: 94 },
  3: { bold: true, fg: 95 },
  4: { bold: true, fg: 92 },
  5: { bold: true },
  6: { bold: true, dim: true },
};

function prefixLines(lines: Line[], first: Span[], rest: Span[]): Line[] {
  return lines.map((line, i) => [...(i === 0 ? first : rest), ...line]);
}

function renderHeading(node: Heading, width: number, ctx: RenderContext): Line[] {
  // A terminal has one font size, so levels are told apart by colour and weight alone.
  const style = HEADING_STYLES[node.depth] ?? { bold: true };
  if (node.depth !== 1 || !ctx.color) {
    return wrap(renderInline(node.children, style, ctx), width);
  }

  // The title is a filled badge: one cell of padding either side of the text.
  const edge = span(" ", style);
  return wrap(renderInline(node.children, style, ctx), width - 2).map((line) => [
    edge,
    ...line,
    edge,
  ]);
}

function renderCode(node: Code, ctx: RenderContext): Line[] {
  const lang = node.lang?.toLowerCase() ?? "";
  let label = lang === "text" ? "" : (node.lang ?? "");
  let body: Line[];

  if (lang === "secure") {
    if (ctx.reveal) {
      body = node.value.split("\n").map((line) => [span(line)]);
    } else {
      label = "secure · hidden (use --reveal to show)";
      body = [[span(SECURE_MASK, { dim: true })]];
    }
  } else {
    body = highlightCode(node.value, lang);
  }

  return framed(label, body);
}

/** Code-style frame. Body lines are left unwrapped so copied code stays intact. */
function framed(label: string, body: Line[]): Line[] {
  return [
    [span(label ? `┌─ ${label}` : "┌─", FRAME)],
    ...body.map((line) => [span("│ ", FRAME), ...line]),
    [span("└─", FRAME)],
  ];
}

function renderList(node: List, width: number, ctx: RenderContext, depth: number): Line[] {
  const start = node.start ?? 1;
  const lastNumber = start + node.children.length - 1;
  const numberWidth = String(lastNumber).length + 1;
  const out: Line[] = [];

  node.children.forEach((item: ListItem, index) => {
    let marker: Span;
    if (item.checked === true) marker = span("[x]", { fg: 32 });
    else if (item.checked === false) marker = span("[ ]", FRAME);
    else if (node.ordered) marker = span(`${start + index}.`.padStart(numberWidth), { fg: 36 });
    else marker = span(BULLETS[depth % BULLETS.length]!, { fg: 36 });

    const indent = lineWidth([marker]) + 1;
    const body = renderBlocks(item.children, Math.max(10, width - indent), ctx, {
      tight: !item.spread,
      depth: depth + 1,
    });
    const lines = body.length > 0 ? body : [[]];

    if (out.length > 0 && node.spread) out.push([]);
    out.push(...prefixLines(lines, [marker, span(" ")], [span(" ".repeat(indent))]));
  });

  return out;
}

const MIN_COLUMN_WIDTH = 5;

/**
 * Narrow columns one cell at a time, always taking from the widest column that is
 * still above its floor, until the table fits or nothing more can give.
 */
function shrinkColumns(widths: number[], floors: number[], available: number): void {
  let total = widths.reduce((a, b) => a + b, 0);
  while (total > available) {
    let target = -1;
    for (let i = 0; i < widths.length; i++) {
      if (widths[i]! > floors[i]! && (target === -1 || widths[i]! > widths[target]!)) target = i;
    }
    if (target === -1) return;
    widths[target]!--;
    total--;
  }
}

/** Fit columns into `available`, avoiding mid-word breaks while there is room to. */
function fitColumns(natural: number[], longestWord: number[], available: number): number[] {
  const widths = [...natural];
  shrinkColumns(widths, longestWord.map((w, i) => Math.min(natural[i]!, Math.max(MIN_COLUMN_WIDTH, w))), available);
  shrinkColumns(widths, natural.map((w) => Math.min(w, MIN_COLUMN_WIDTH)), available);
  return widths;
}

function renderTable(node: Table, width: number, ctx: RenderContext): Line[] {
  const columnCount = Math.max(...node.children.map((row) => row.children.length), 0);
  if (columnCount === 0) return [];

  const cells: Span[][][] = node.children.map((row, rowIndex) =>
    Array.from({ length: columnCount }, (_, col) => {
      const cell = row.children[col];
      return cell ? renderInline(cell.children, rowIndex === 0 ? { bold: true } : {}, ctx) : [];
    }),
  );

  const natural = Array.from({ length: columnCount }, (_, col) =>
    Math.max(
      1,
      ...cells.map((row) => Math.max(...wrap(row[col]!, Number.MAX_SAFE_INTEGER).map(lineWidth))),
    ),
  );
  const longestWord = Array.from({ length: columnCount }, (_, col) =>
    Math.max(
      1,
      ...cells.flatMap((row) =>
        row[col]!.flatMap((s) => s.text.split(/\s+/).map((word) => lineWidth([span(word)]))),
      ),
    ),
  );
  // Each column costs its content plus " │ " padding, plus one closing border.
  const available = Math.max(columnCount * MIN_COLUMN_WIDTH, width - (columnCount * 3 + 1));
  const widths = fitColumns(natural, longestWord, available);

  const border = (left: string, mid: string, right: string): Line => [
    span(left + widths.map((w) => "─".repeat(w + 2)).join(mid) + right, FRAME),
  ];
  const bar = span("│", FRAME);

  const wrapped = cells.map((row) => row.map((cell, col) => wrap(cell, widths[col]!)));
  const multiLine = wrapped.some((row) => row.some((cell) => cell.length > 1));
  const out: Line[] = [border("┌", "┬", "┐")];

  wrapped.forEach((row, rowIndex) => {
    const height = Math.max(...row.map((cell) => cell.length));
    for (let i = 0; i < height; i++) {
      const line: Line = [bar];
      row.forEach((cell, col) => {
        line.push(span(" "), ...pad(cell[i] ?? [], widths[col]!, node.align?.[col]), span(" "), bar);
      });
      out.push(line);
    }
    const last = rowIndex === wrapped.length - 1;
    if (!last && (rowIndex === 0 || multiLine)) out.push(border("├", "┼", "┤"));
  });

  out.push(border("└", "┴", "┘"));
  return out;
}

function renderBlock(
  node: RootContent,
  width: number,
  ctx: RenderContext,
  depth: number,
): Line[] {
  switch (node.type) {
    case "paragraph":
      return wrap(renderInline(node.children, {}, ctx), width);
    case "heading":
      return renderHeading(node, width, ctx);
    case "code":
      return renderCode(node, ctx);
    case "math":
      return framed("math", node.value.split("\n").map((line) => [span(line, { fg: 35 })]));
    case "blockquote": {
      const inner = renderBlocks(node.children, Math.max(10, width - 2), ctx, { depth });
      const bar = [span("│ ", FRAME)];
      return prefixLines(inner, bar, bar);
    }
    case "list":
      return renderList(node, width, ctx, depth);
    case "table":
      return renderTable(node, width, ctx);
    case "thematicBreak":
      return [[span("─".repeat(width), FRAME)]];
    case "html": {
      const paragraphs = htmlToText(node.value)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return paragraphs.flatMap((text) => wrap([span(text)], width));
    }
    case "footnoteDefinition": {
      const label = span(`[${node.label ?? node.identifier}]`, { fg: 36 });
      const indent = lineWidth([label]) + 1;
      const inner = renderBlocks(node.children, Math.max(10, width - indent), ctx, { depth });
      return prefixLines(inner.length > 0 ? inner : [[]], [label, span(" ")], [span(" ".repeat(indent))]);
    }
    default:
      // `definition` nodes are consumed through ctx.definitions; anything else is not renderable.
      return [];
  }
}

function renderBlocks(
  nodes: RootContent[],
  width: number,
  ctx: RenderContext,
  options: { tight?: boolean; depth?: number } = {},
): Line[] {
  const out: Line[] = [];
  for (const node of nodes) {
    const lines = renderBlock(node, width, ctx, options.depth ?? 0);
    if (lines.length === 0) continue;
    if (out.length > 0 && !options.tight) out.push([]);
    out.push(...lines);
  }
  return out;
}

/** Render Markdown source to terminal text (no trailing newline). */
export function renderMarkdown(source: string, options: RenderOptions): string {
  const input = source.replace(/^﻿/, "");
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkTreeStructure)
    .use(remarkPrettyJsonBlocks);
  const tree = processor.runSync(processor.parse(input), input) as Root;

  const definitions = new Map<string, Definition>();
  visit(tree, "definition", (node) => {
    if (!definitions.has(node.identifier)) definitions.set(node.identifier, node);
  });

  const ctx: RenderContext = { ...options, definitions };
  return renderBlocks(tree.children, options.width, ctx)
    .map((line) => serialize(line, options.color).replace(/\s+$/, ""))
    .join("\n");
}

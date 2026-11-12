import stringWidth from "string-width";

/**
 * Visual attributes for a run of text. `fg` / `bg` are SGR colour parameters: a basic
 * code (30–37, 90–97 / 40–47, 100–107) or an extended one such as "38;5;228".
 */
export interface Style {
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fg?: number | string;
  bg?: number | string;
  /** Target for an OSC 8 terminal hyperlink. */
  link?: string;
}

export interface Span {
  text: string;
  style: Style;
}

export type Line = Span[];

const ESC = "\u001b";
const CONTROL_CHARS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

/**
 * Strip control characters so a document cannot smuggle its own escape sequences
 * (cursor moves, title changes, clipboard writes) into the terminal.
 */
export function sanitize(text: string): string {
  return text.replace(/\t/g, "    ").replace(CONTROL_CHARS, "");
}

export function span(text: string, style: Style = {}): Span {
  return { text: sanitize(text), style };
}

export function width(text: string): number {
  return stringWidth(text);
}

export function lineWidth(line: Line): number {
  let total = 0;
  for (const s of line) total += width(s.text);
  return total;
}

/** Split text wider than `max` into chunks that each fit. */
function hardSplit(text: string, max: number): string[] {
  const chunks: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const ch of Array.from(text)) {
    const w = width(ch);
    if (currentWidth + w > max && current) {
      chunks.push(current);
      current = "";
      currentWidth = 0;
    }
    current += ch;
    currentWidth += w;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Word-wrap styled spans to `max` columns. A `\n` inside a span is a hard break;
 * other whitespace is a break opportunity and is dropped at line edges. Adjacent
 * spans with no whitespace between them (e.g. bold text followed by a comma) form
 * one word and are never separated.
 */
export function wrap(spans: Span[], max: number): Line[] {
  const limit = Math.max(1, max);
  const lines: Line[] = [];
  let current: Line = [];
  let currentWidth = 0;
  let pendingSpace: Span | null = null;
  let word: Span[] = [];
  let wordWidth = 0;

  const newLine = () => {
    lines.push(current);
    current = [];
    currentWidth = 0;
    pendingSpace = null;
  };

  const commitWord = () => {
    if (word.length === 0) return;
    const spaceWidth = pendingSpace ? pendingSpace.text.length : 0;
    if (current.length > 0 && currentWidth + spaceWidth + wordWidth > limit) newLine();
    if (pendingSpace) {
      current.push(pendingSpace);
      currentWidth += pendingSpace.text.length;
      pendingSpace = null;
    }

    if (wordWidth <= limit) {
      current.push(...word);
      currentWidth += wordWidth;
    } else {
      // Too long for any line (a URL, say): fill lines character by character.
      for (const part of word) {
        let rest = part.text;
        while (rest) {
          if (currentWidth >= limit) newLine();
          const chunk = hardSplit(rest, limit - currentWidth)[0]!;
          current.push({ text: chunk, style: part.style });
          currentWidth += width(chunk);
          rest = rest.slice(chunk.length);
        }
      }
    }
    word = [];
    wordWidth = 0;
  };

  for (const s of spans) {
    for (const piece of s.text.split(/(\n|[ ]+)/)) {
      if (piece === "") continue;
      if (piece === "\n") {
        commitWord();
        newLine();
      } else if (piece.trim() === "") {
        commitWord();
        if (current.length > 0) pendingSpace = { text: piece, style: s.style };
      } else {
        word.push({ text: piece, style: s.style });
        wordWidth += width(piece);
      }
    }
  }

  commitWord();
  if (current.length > 0 || lines.length === 0) lines.push(current);
  return lines;
}

function sgr(style: Style): string {
  const codes: (number | string)[] = [];
  if (style.bold) codes.push(1);
  if (style.dim) codes.push(2);
  if (style.italic) codes.push(3);
  if (style.underline) codes.push(4);
  if (style.strike) codes.push(9);
  if (style.fg != null) codes.push(style.fg);
  if (style.bg != null) codes.push(style.bg);
  return codes.length > 0 ? `${ESC}[${codes.join(";")}m` : "";
}

function sameStyle(a: Style, b: Style): boolean {
  return (
    !a.bold === !b.bold &&
    !a.dim === !b.dim &&
    !a.italic === !b.italic &&
    !a.underline === !b.underline &&
    !a.strike === !b.strike &&
    a.fg === b.fg &&
    a.bg === b.bg &&
    a.link === b.link
  );
}

/** Turn a styled line into a string, with ANSI sequences only when `color` is on. */
export function serialize(line: Line, color: boolean): string {
  if (!color) return line.map((s) => s.text).join("");

  // Merge neighbours that share a style so each run is emitted once.
  const runs: Span[] = [];
  for (const s of line) {
    if (s.text === "") continue;
    const last = runs[runs.length - 1];
    if (last && sameStyle(last.style, s.style)) last.text += s.text;
    else runs.push({ text: s.text, style: s.style });
  }

  let out = "";
  for (const s of runs) {
    const open = sgr(s.style);
    let chunk = open ? `${open}${s.text}${ESC}[0m` : s.text;
    if (s.style.link) {
      const url = s.style.link.replace(CONTROL_CHARS, "");
      chunk = `${ESC}]8;;${url}${ESC}\\${chunk}${ESC}]8;;${ESC}\\`;
    }
    out += chunk;
  }
  return out;
}

export type Align = "left" | "right" | "center" | null | undefined;

/** Pad a line with plain spaces to exactly `target` columns. */
export function pad(line: Line, target: number, align: Align = "left"): Line {
  const gap = Math.max(0, target - lineWidth(line));
  if (gap === 0) return line;
  if (align === "right") return [{ text: " ".repeat(gap), style: {} }, ...line];
  if (align === "center") {
    const left = Math.floor(gap / 2);
    return [
      { text: " ".repeat(left), style: {} },
      ...line,
      { text: " ".repeat(gap - left), style: {} },
    ];
  }
  return [...line, { text: " ".repeat(gap), style: {} }];
}

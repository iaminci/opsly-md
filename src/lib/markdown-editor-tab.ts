/** Two-space indent used for markdown list nesting (VS Code / Obsidian style). */
export const MARKDOWN_TAB_INDENT = "  ";

export type TabEditResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

/**
 * Line range touched by a selection, inclusive of partial first/last lines.
 * When the selection ends on a newline, that newline terminates the last line
 * rather than starting an extra empty line in the block.
 */
function getAffectedLineBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { blockStart: number; blockEnd: number } {
  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;

  let effectiveEnd = selectionEnd;
  if (
    effectiveEnd > blockStart &&
    effectiveEnd <= value.length &&
    value[effectiveEnd - 1] === "\n"
  ) {
    effectiveEnd -= 1;
  }

  const lastCharPos = Math.max(blockStart, effectiveEnd - 1);
  const lastLineStart = value.lastIndexOf("\n", lastCharPos) + 1;
  const nextNewline = value.indexOf("\n", lastLineStart);
  const blockEnd = nextNewline === -1 ? value.length : nextNewline;

  return { blockStart, blockEnd };
}

function selectionSpansMultipleLines(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): boolean {
  const startLine = value.lastIndexOf("\n", selectionStart - 1);
  const endLine = value.lastIndexOf("\n", selectionEnd - 1);
  return startLine !== endLine;
}

function leadingSpacesToRemove(line: string): number {
  if (line.startsWith(MARKDOWN_TAB_INDENT)) return MARKDOWN_TAB_INDENT.length;
  if (line.startsWith(" ")) return 1;
  return 0;
}

/** Insert two spaces at the cursor, or replace a single-line selection with two spaces. */
function insertSpacesAtSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): TabEditResult {
  const nextValue =
    value.slice(0, selectionStart) +
    MARKDOWN_TAB_INDENT +
    value.slice(selectionEnd);
  const cursor = selectionStart + MARKDOWN_TAB_INDENT.length;
  return {
    value: nextValue,
    selectionStart: cursor,
    selectionEnd: cursor,
  };
}

/** Prefix every line in the selected block with two spaces. */
function indentLineBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): TabEditResult {
  const { blockStart, blockEnd } = getAffectedLineBlock(
    value,
    selectionStart,
    selectionEnd,
  );
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const indented = lines
    .map((line) => MARKDOWN_TAB_INDENT + line)
    .join("\n");

  const nextValue =
    value.slice(0, blockStart) + indented + value.slice(blockEnd);

  const linesBeforeStart = value
    .slice(blockStart, selectionStart)
    .split("\n").length;
  const linesBeforeEnd = value
    .slice(blockStart, Math.min(selectionEnd, blockEnd))
    .split("\n").length;

  return {
    value: nextValue,
    selectionStart:
      selectionStart + linesBeforeStart * MARKDOWN_TAB_INDENT.length,
    selectionEnd:
      selectionEnd + linesBeforeEnd * MARKDOWN_TAB_INDENT.length,
  };
}

/** Remove exactly two leading spaces from the current line when present. */
function outdentSingleLine(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): TabEditResult {
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const nextNewline = value.indexOf("\n", lineStart);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  const line = value.slice(lineStart, lineEnd);

  if (!line.startsWith(MARKDOWN_TAB_INDENT)) {
    return { value, selectionStart, selectionEnd };
  }

  const nextValue =
    value.slice(0, lineStart) +
    line.slice(MARKDOWN_TAB_INDENT.length) +
    value.slice(lineEnd);

  return {
    value: nextValue,
    selectionStart: Math.max(lineStart, selectionStart - MARKDOWN_TAB_INDENT.length),
    selectionEnd: Math.max(lineStart, selectionEnd - MARKDOWN_TAB_INDENT.length),
  };
}

/**
 * Remove up to two leading spaces from each line in the selected block and
 * shift the selection backward by however many spaces were removed before it.
 */
function outdentLineBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): TabEditResult {
  const { blockStart, blockEnd } = getAffectedLineBlock(
    value,
    selectionStart,
    selectionEnd,
  );
  const lines = value.slice(blockStart, blockEnd).split("\n");

  let pos = blockStart;
  let newSelectionStart = selectionStart;
  let newSelectionEnd = selectionEnd;
  const outdentedLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const remove = leadingSpacesToRemove(line);
    const lineStart = pos;
    const lineEnd = lineStart + line.length;

    if (selectionStart > lineStart) {
      if (selectionStart >= lineEnd) {
        newSelectionStart -= remove;
      } else {
        newSelectionStart -= Math.min(remove, selectionStart - lineStart);
      }
    }

    if (selectionEnd > lineStart) {
      if (selectionEnd >= lineEnd) {
        newSelectionEnd -= remove;
      } else {
        newSelectionEnd -= Math.min(remove, selectionEnd - lineStart);
      }
    }

    outdentedLines.push(line.slice(remove));
    pos = lineEnd + (index < lines.length - 1 ? 1 : 0);
  }

  const nextValue =
    value.slice(0, blockStart) +
    outdentedLines.join("\n") +
    value.slice(blockEnd);

  return {
    value: nextValue,
    selectionStart: newSelectionStart,
    selectionEnd: newSelectionEnd,
  };
}

/**
 * Apply Tab or Shift+Tab the way common markdown editors do:
 * - Tab inserts two spaces, or indents each selected line when the selection spans lines.
 * - Shift+Tab outdents the current line or each line in a multi-line selection.
 */
export function applyMarkdownTabKey(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  shiftKey: boolean,
): TabEditResult {
  const multiLine = selectionSpansMultipleLines(
    value,
    selectionStart,
    selectionEnd,
  );

  if (shiftKey) {
    return multiLine
      ? outdentLineBlock(value, selectionStart, selectionEnd)
      : outdentSingleLine(value, selectionStart, selectionEnd);
  }

  return multiLine
    ? indentLineBlock(value, selectionStart, selectionEnd)
    : insertSpacesAtSelection(value, selectionStart, selectionEnd);
}

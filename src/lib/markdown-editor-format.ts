export type FormatEditResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export type MarkdownFormatAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "inlineCode"
  | "heading1"
  | "heading2"
  | "heading3"
  | "link"
  | "image"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule";

function getAffectedLineBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number
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

function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
  placeholder = "text"
): FormatEditResult {
  const selected = value.slice(selectionStart, selectionEnd);
  const content = selected || placeholder;
  const nextValue =
    value.slice(0, selectionStart) +
    before +
    content +
    after +
    value.slice(selectionEnd);

  if (selected) {
    return {
      value: nextValue,
      selectionStart: selectionStart + before.length,
      selectionEnd: selectionStart + before.length + content.length,
    };
  }

  return {
    value: nextValue,
    selectionStart: selectionStart + before.length,
    selectionEnd: selectionStart + before.length + placeholder.length,
  };
}

function prefixLineBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  ordered = false
): FormatEditResult {
  const { blockStart, blockEnd } = getAffectedLineBlock(
    value,
    selectionStart,
    selectionEnd
  );
  const block = value.slice(blockStart, blockEnd);
  const lines = block.length > 0 ? block.split("\n") : [""];

  const prefixed = lines
    .map((line, index) => {
      const trimmed = line.trimStart();
      const linePrefix = ordered ? `${index + 1}. ` : prefix;
      return trimmed ? `${linePrefix}${trimmed}` : linePrefix.trimEnd();
    })
    .join("\n");

  const nextValue =
    value.slice(0, blockStart) + prefixed + value.slice(blockEnd);

  return {
    value: nextValue,
    selectionStart: blockStart,
    selectionEnd: blockStart + prefixed.length,
  };
}

function setHeading(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  level: 1 | 2 | 3
): FormatEditResult {
  const prefix = "#".repeat(level) + " ";
  const { blockStart, blockEnd } = getAffectedLineBlock(
    value,
    selectionStart,
    selectionEnd
  );
  const block = value.slice(blockStart, blockEnd);
  const lines = block.length > 0 ? block.split("\n") : [""];

  const nextLines = lines.map((line) => {
    const withoutHeading = line.replace(/^\s{0,3}#{1,6}\s+/, "");
    return `${prefix}${withoutHeading}`;
  });

  const nextBlock = nextLines.join("\n");
  const nextValue =
    value.slice(0, blockStart) + nextBlock + value.slice(blockEnd);

  return {
    value: nextValue,
    selectionStart: blockStart,
    selectionEnd: blockStart + nextBlock.length,
  };
}

function insertHorizontalRule(
  value: string,
  selectionStart: number,
  selectionEnd: number
): FormatEditResult {
  const snippet = selectionStart === 0 ? "---\n" : "\n\n---\n";
  const insertAt = selectionEnd;
  const nextValue =
    value.slice(0, insertAt) + snippet + value.slice(insertAt);
  const cursor = insertAt + snippet.length;

  return {
    value: nextValue,
    selectionStart: cursor,
    selectionEnd: cursor,
  };
}

function insertCodeBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number
): FormatEditResult {
  const selected = value.slice(selectionStart, selectionEnd);
  const inner = selected || "code";
  const snippet = `\`\`\`\n${inner}\n\`\`\``;
  const before = selectionStart === 0 ? "" : "\n\n";
  const after = "\n";
  const insertAt = selectionEnd;
  const nextValue =
    value.slice(0, insertAt) + before + snippet + after + value.slice(insertAt);
  const start = insertAt + before.length + 4;
  const end = start + inner.length;

  return {
    value: nextValue,
    selectionStart: start,
    selectionEnd: end,
  };
}

export function applyMarkdownFormat(
  action: MarkdownFormatAction,
  value: string,
  selectionStart: number,
  selectionEnd: number
): FormatEditResult {
  switch (action) {
    case "bold":
      return wrapSelection(value, selectionStart, selectionEnd, "**", "**");
    case "italic":
      return wrapSelection(value, selectionStart, selectionEnd, "*", "*");
    case "strikethrough":
      return wrapSelection(value, selectionStart, selectionEnd, "~~", "~~");
    case "inlineCode":
      return wrapSelection(value, selectionStart, selectionEnd, "`", "`", "code");
    case "link":
      return wrapSelection(
        value,
        selectionStart,
        selectionEnd,
        "[",
        "](url)",
        "text"
      );
    case "image":
      return wrapSelection(
        value,
        selectionStart,
        selectionEnd,
        "![",
        "](url)",
        "alt text"
      );
    case "heading1":
      return setHeading(value, selectionStart, selectionEnd, 1);
    case "heading2":
      return setHeading(value, selectionStart, selectionEnd, 2);
    case "heading3":
      return setHeading(value, selectionStart, selectionEnd, 3);
    case "bulletList":
      return prefixLineBlock(value, selectionStart, selectionEnd, "- ");
    case "orderedList":
      return prefixLineBlock(value, selectionStart, selectionEnd, "", true);
    case "blockquote":
      return prefixLineBlock(value, selectionStart, selectionEnd, "> ");
    case "codeBlock":
      return insertCodeBlock(value, selectionStart, selectionEnd);
    case "horizontalRule":
      return insertHorizontalRule(value, selectionStart, selectionEnd);
  }
}

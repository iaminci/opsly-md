/**
 * Locate and toggle GFM task-list checkboxes and raw HTML checkbox/radio inputs
 * in markdown source. Collection order matches react-markdown render order.
 */

import type { ListItem, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { remarkCodeBlockLang } from "@/lib/remark-code-block-lang";
import { remarkTreeStructure } from "@/lib/remark-tree-structure";
import { normalizeInvalidAtxParagraphBreaks } from "@/lib/utils";

export type FormControlKind = "gfm-task" | "html-checkbox" | "html-radio";

export interface FormControlRef {
  kind: FormControlKind;
  index: number;
  checked: boolean;
  /** Inclusive start of the editable marker in source */
  markerStart: number;
  /** Exclusive end of the editable marker in source */
  markerEnd: number;
  /** Radio group name (html-radio only) */
  name?: string;
}

export interface FormControlEdit {
  startOffset: number;
  endOffset: number;
  replacement: string;
}

export interface ToggleFormControlResult {
  content: string;
  /** Present when the change is a single contiguous replace */
  edit?: FormControlEdit;
}

const GFM_TASK_LINE_RE = /^(\s*(?:[-*+]|\d+\.)\s*)\[([ xX])\]/gm;
const HTML_INPUT_TAG_RE = /<input\b[^>]*\/?>/gi;

function findGfmTaskMarkerInSlice(
  slice: string,
  sliceStart: number
): { markerStart: number; markerEnd: number } | null {
  const markerMatch = /\[([ xX])\]/.exec(slice);
  if (!markerMatch || markerMatch.index === undefined) return null;
  const markerStart = sliceStart + markerMatch.index;
  return {
    markerStart,
    markerEnd: markerStart + markerMatch[0].length,
  };
}

function collectFormControlsByScanning(src: string): FormControlRef[] {
  const controls: FormControlRef[] = [];

  GFM_TASK_LINE_RE.lastIndex = 0;
  let taskMatch: RegExpExecArray | null;
  while ((taskMatch = GFM_TASK_LINE_RE.exec(src)) !== null) {
    const markerStart = taskMatch.index + taskMatch[1].length;
    controls.push({
      kind: "gfm-task",
      index: controls.length,
      checked: taskMatch[2].toLowerCase() === "x",
      markerStart,
      markerEnd: markerStart + 3,
    });
  }

  HTML_INPUT_TAG_RE.lastIndex = 0;
  let htmlMatch: RegExpExecArray | null;
  while ((htmlMatch = HTML_INPUT_TAG_RE.exec(src)) !== null) {
    const tag = htmlMatch[0];
    const type = readInputType(tag);
    if (type !== "checkbox" && type !== "radio") continue;
    const tagStart = htmlMatch.index;
    controls.push({
      kind: type === "radio" ? "html-radio" : "html-checkbox",
      index: controls.length,
      checked: isInputChecked(tag),
      markerStart: tagStart,
      markerEnd: tagStart + tag.length,
      name: type === "radio" ? readInputName(tag) : undefined,
    });
  }

  controls.sort((a, b) => a.markerStart - b.markerStart);
  controls.forEach((control, index) => {
    control.index = index;
  });

  return controls;
}

function markdownToMdast(markdown: string): Root {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkCodeBlockLang)
    .use(remarkTreeStructure)
    .parse(markdown);
  return file as Root;
}

function readInputType(tag: string): string | undefined {
  const match = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
  return (match?.[1] ?? match?.[2] ?? match?.[3])?.toLowerCase();
}

function readInputName(tag: string): string | undefined {
  const match = /\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function isInputChecked(tag: string): boolean {
  if (/\bchecked(?:\s*=\s*(?:"checked"|'checked'|""|''|[^\s>]*))?/i.test(tag)) {
    return true;
  }
  return false;
}

function setInputChecked(tag: string, checked: boolean): string {
  const withoutChecked = tag
    .replace(/\s*\bchecked(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?/gi, "")
    .trimEnd();

  if (!checked) {
    return withoutChecked;
  }

  if (/\/>$/.test(withoutChecked)) {
    return withoutChecked.replace(/\/>$/, " checked />");
  }
  return withoutChecked.replace(/>$/, " checked>");
}

function collectHtmlInputs(
  html: string,
  htmlNodeOffset: number,
  controls: FormControlRef[]
): void {
  HTML_INPUT_TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HTML_INPUT_TAG_RE.exec(html)) !== null) {
    const tag = match[0];
    const type = readInputType(tag);
    if (type !== "checkbox" && type !== "radio") continue;

    const tagStart = htmlNodeOffset + match.index;
    const tagEnd = tagStart + tag.length;
    controls.push({
      kind: type === "radio" ? "html-radio" : "html-checkbox",
      index: controls.length,
      checked: isInputChecked(tag),
      markerStart: tagStart,
      markerEnd: tagEnd,
      name: type === "radio" ? readInputName(tag) : undefined,
    });
  }
}

/**
 * Ordered list of interactive form controls in the document.
 */
export function collectFormControls(markdown: string): FormControlRef[] {
  const src = normalizeInvalidAtxParagraphBreaks(markdown);
  const controls: FormControlRef[] = [];

  let tree: Root;
  try {
    tree = markdownToMdast(src);
  } catch {
    return collectFormControlsByScanning(src);
  }

  visit(tree, (node) => {
    if (node.type === "listItem") {
      const listItem = node as ListItem;
      if (typeof listItem.checked !== "boolean" || !listItem.position) return;

      const { start, end } = listItem.position;
      if (start.offset == null || end.offset == null) return;

      const itemSlice = src.slice(start.offset, end.offset);
      const marker = findGfmTaskMarkerInSlice(itemSlice, start.offset);
      if (!marker) return;

      controls.push({
        kind: "gfm-task",
        index: controls.length,
        checked: listItem.checked,
        markerStart: marker.markerStart,
        markerEnd: marker.markerEnd,
      });
      return;
    }

    if (node.type === "html" && node.position) {
      const { start } = node.position;
      if (start.offset == null) return;
      collectHtmlInputs(node.value, start.offset, controls);
    }
  });

  if (controls.length === 0) {
    return collectFormControlsByScanning(src);
  }

  return controls;
}

function applyReplacement(
  markdown: string,
  startOffset: number,
  endOffset: number,
  replacement: string
): ToggleFormControlResult {
  return {
    content:
      markdown.slice(0, startOffset) + replacement + markdown.slice(endOffset),
    edit: { startOffset, endOffset, replacement },
  };
}

function toggleGfmTask(
  markdown: string,
  control: FormControlRef
): ToggleFormControlResult {
  const replacement = control.checked ? "[ ]" : "[x]";
  return applyReplacement(
    markdown,
    control.markerStart,
    control.markerEnd,
    replacement
  );
}

function toggleHtmlCheckbox(
  markdown: string,
  control: FormControlRef
): ToggleFormControlResult {
  const tag = markdown.slice(control.markerStart, control.markerEnd);
  const replacement = setInputChecked(tag, !control.checked);
  return applyReplacement(
    markdown,
    control.markerStart,
    control.markerEnd,
    replacement
  );
}

function toggleHtmlRadio(
  markdown: string,
  control: FormControlRef,
  controls: FormControlRef[]
): ToggleFormControlResult {
  if (!control.name) {
    return toggleHtmlCheckbox(markdown, control);
  }

  const group = controls.filter(
    (c) => c.kind === "html-radio" && c.name === control.name
  );

  let content = markdown;
  for (const member of group) {
    const tag = content.slice(member.markerStart, member.markerEnd);
    const nextTag = setInputChecked(tag, member.index === control.index);
    if (nextTag === tag) continue;
    content =
      content.slice(0, member.markerStart) +
      nextTag +
      content.slice(member.markerEnd);

    const delta = nextTag.length - (member.markerEnd - member.markerStart);
    if (delta !== 0) {
      for (const other of controls) {
        if (other.markerStart >= member.markerEnd) {
          other.markerStart += delta;
          other.markerEnd += delta;
        }
      }
      member.markerEnd += delta;
    }
    member.checked = member.index === control.index;
  }

  return { content };
}

/**
 * Toggle the form control at `controlIndex` and return updated markdown.
 */
export function toggleFormControl(
  markdown: string,
  controlIndex: number,
  controls?: FormControlRef[]
): ToggleFormControlResult | null {
  const src = normalizeInvalidAtxParagraphBreaks(markdown);
  const list = controls ?? collectFormControls(src);
  let control = list[controlIndex];

  if (!control) {
    const scanned = collectFormControlsByScanning(src);
    control = scanned[controlIndex];
    if (!control) return null;
    return toggleFormControl(src, controlIndex, scanned);
  }

  switch (control.kind) {
    case "gfm-task":
      return toggleGfmTask(src, control);
    case "html-checkbox":
      return toggleHtmlCheckbox(src, control);
    case "html-radio":
      return toggleHtmlRadio(src, control, list);
    default:
      return null;
  }
}

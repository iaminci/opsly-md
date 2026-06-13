"use client";

import * as React from "react";

import { Textarea } from "@/components/ui/textarea";
import { applyMarkdownTabKey } from "@/lib/markdown-editor-tab";
import { cn } from "@/lib/utils";

const textareaChromeClasses = [
  "font-mono text-sm leading-normal",
  "overflow-y-auto overflow-x-hidden native-scrollbar",
  "border-border text-foreground",
].join(" ");

/** Count visual rows per logical line using a shadow textarea (same wrapping as the real one). */
function measureWrappedRowsPerLogicalLine(
  textarea: HTMLTextAreaElement,
): number[] {
  const cs = window.getComputedStyle(textarea);
  const measure = document.createElement("textarea");
  measure.setAttribute("wrap", "soft");
  measure.readOnly = true;
  measure.tabIndex = -1;
  measure.setAttribute("aria-hidden", "true");

  const widthPx = textarea.clientWidth;

  measure.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    "margin:0",
    `width:${widthPx}px`,
    "height:0",
    "min-height:0",
    "max-height:none",
    "resize:none",
    "overflow:hidden",
    `box-sizing:${cs.boxSizing}`,
    `padding:${cs.padding}`,
    `border:${cs.border}`,
    `font:${cs.font}`,
    `line-height:${cs.lineHeight}`,
    `letter-spacing:${cs.letterSpacing}`,
    `tab-size:${cs.tabSize}`,
    `white-space:${cs.whiteSpace}`,
    `overflow-wrap:${cs.overflowWrap}`,
    `word-break:${cs.wordBreak}`,
  ].join(";");

  const fs = (cs as CSSStyleDeclaration & { fieldSizing?: string }).fieldSizing;
  if (fs && "fieldSizing" in measure.style) {
    try {
      (
        measure.style as CSSStyleDeclaration & { fieldSizing?: string }
      ).fieldSizing = fs;
    } catch {
      /* ignore */
    }
  }

  document.body.appendChild(measure);

  try {
    measure.value = "M";
    const singleScroll = measure.scrollHeight;
    measure.value = "M\nM";
    const linePx = Math.max(1, measure.scrollHeight - singleScroll);

    const logical = textarea.value.split("\n");
    return logical.map((line) => {
      if (line.length === 0) return 1;
      measure.value = line;
      const sh = measure.scrollHeight;
      const extraRows = Math.round((sh - singleScroll) / linePx);
      return Math.max(1, 1 + extraRows);
    });
  } finally {
    document.body.removeChild(measure);
  }
}

function visualGutterLabels(
  rowsPerLogical: number[],
  logicalLineCount: number,
): string {
  const w = Math.max(2, String(logicalLineCount).length);
  const cells: string[] = [];
  let n = 1;
  for (const rowCount of rowsPerLogical) {
    for (let r = 0; r < rowCount; r++) {
      cells.push(r === 0 ? String(n).padStart(w, " ") : "".padStart(w, " "));
    }
    n += 1;
  }
  return cells.join("\n");
}

export type LineNumberedTextareaProps = Omit<
  React.ComponentProps<typeof Textarea>,
  "className"
> & {
  /** Classes for the outer bordered wrapper (height, width, etc.). */
  className?: string;
  /** Extra classes merged into the textarea (e.g. `leading-relaxed`). */
  textareaClassName?: string;
};

export const LineNumberedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  LineNumberedTextareaProps
>(function LineNumberedTextarea(
  { className, textareaClassName, value, onScroll, onKeyDown, onChange, ...props },
  ref,
) {
  const gutterRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = React.useRef<{
    start: number;
    end: number;
  } | null>(null);
  const text = value == null ? "" : String(value);

  const logicalLineCount = Math.max(1, text.split("\n").length);

  const mergedRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const [gutterBody, setGutterBody] = React.useState(() =>
    visualGutterLabels(Array(logicalLineCount).fill(1), logicalLineCount),
  );

  const [gutterTypography, setGutterTypography] = React.useState<
    Pick<React.CSSProperties, "font" | "lineHeight" | "letterSpacing">
  >({});

  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    const pending = pendingSelectionRef.current;
    if (el && pending) {
      el.setSelectionRange(pending.start, pending.end);
      pendingSelectionRef.current = null;
    }
  }, [text]);

  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const sync = () => {
      try {
        const cs = window.getComputedStyle(el);
        const rows = measureWrappedRowsPerLogicalLine(el);
        setGutterBody(visualGutterLabels(rows, rows.length));
        setGutterTypography({
          font: cs.font,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
        });
      } catch {
        setGutterBody(
          visualGutterLabels(Array(logicalLineCount).fill(1), logicalLineCount),
        );
      }
    };

    sync();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(sync);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, logicalLineCount, textareaClassName, className]);

  const gutterCh = Math.max(2, String(logicalLineCount).length) + 1;

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    onScroll?.(e);
    const g = gutterRef.current;
    if (g) g.scrollTop = e.currentTarget.scrollTop;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.key !== "Tab") return;

    // Tab / Shift+Tab stay in the editor (no browser focus cycling).
    e.preventDefault();

    const textarea = e.currentTarget;
    const result = applyMarkdownTabKey(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
      e.shiftKey,
    );

    if (result.value === textarea.value) return;

    pendingSelectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
    };

    onChange?.({
      ...e,
      target: { ...textarea, value: result.value },
      currentTarget: { ...textarea, value: result.value },
    } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 leading-normal overflow-hidden rounded-base border-2 border-border bg-secondary-background",
        className,
      )}
    >
      <div
        ref={gutterRef}
        className="shrink-0 overflow-hidden border-r border-border py-2 pl-2 pr-2.5 text-muted-foreground select-none tabular-nums"
        style={{ width: `${gutterCh}ch` }}
        aria-hidden
      >
        <pre
          className="m-0 text-right whitespace-pre"
          style={{
            margin: 0,
            ...gutterTypography,
          }}
        >
          {gutterBody}
        </pre>
      </div>
      <Textarea
        ref={mergedRef}
        value={value}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onChange={onChange}
        className={cn(
          "min-h-0 min-w-0 flex-1 resize-y rounded-none border-0 bg-transparent px-2 py-2 pr-3 shadow-none",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          textareaChromeClasses,
          textareaClassName,
        )}
        {...props}
      />
    </div>
  );
});

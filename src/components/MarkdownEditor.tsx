"use client";

import { useLayoutEffect, useRef } from "react";
import {
  Bold,
  ChevronDown,
  Code,
  Code2,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { LineNumberedTextarea } from "@/components/LineNumberedTextarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  applyMarkdownFormat,
  type MarkdownFormatAction,
} from "@/lib/markdown-editor-format";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const toolbarButtonClassName =
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={toolbarButtonClassName}
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return (
    <div
      className="mx-1 hidden h-4 w-px shrink-0 bg-border/80 sm:block"
      aria-hidden
    />
  );
}

function MarkdownFormatToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}) {
  const pendingSelectionRef = useRef<{
    start: number;
    end: number;
  } | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const pending = pendingSelectionRef.current;
    if (!textarea || !pending) return;
    textarea.setSelectionRange(pending.start, pending.end);
    textarea.focus();
    pendingSelectionRef.current = null;
  }, [value, textareaRef]);

  const apply = (action: MarkdownFormatAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const result = applyMarkdownFormat(
      action,
      value,
      textarea.selectionStart,
      textarea.selectionEnd
    );

    pendingSelectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
    };
    onChange(result.value);
  };

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-0.5"
      role="toolbar"
      aria-label="Markdown formatting"
    >
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(toolbarButtonClassName, "gap-0.5 px-1.5")}
                aria-label="Heading"
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="text-base font-bold leading-none">H</span>
                <ChevronDown className="size-4 shrink-0" strokeWidth={2.5} />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Heading</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-[8rem]">
          <DropdownMenuItem onClick={() => apply("heading1")}>
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => apply("heading2")}>
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => apply("heading3")}>
            Heading 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarButton label="Bold" onClick={() => apply("bold")}>
        <Bold className="size-4" strokeWidth={2.5} />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => apply("italic")}>
        <Italic className="size-4" strokeWidth={2.5} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Quote" onClick={() => apply("blockquote")}>
        <Quote className="size-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Code" onClick={() => apply("inlineCode")}>
        <Code className="size-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Link" onClick={() => apply("link")}>
        <Link className="size-4" strokeWidth={2} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Bullet list" onClick={() => apply("bulletList")}>
        <List className="size-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" onClick={() => apply("orderedList")}>
        <ListOrdered className="size-4" strokeWidth={2} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Code block" onClick={() => apply("codeBlock")}>
        <Code2 className="size-4" strokeWidth={2} />
      </ToolbarButton>
    </div>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Type markdown here…",
  className,
  autoFocus = false,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      className={cn(
        "markdown-editor flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border-2 border-border bg-background",
        className
      )}
    >
      <div className="flex shrink-0 items-center border-b-2 border-border bg-input px-2 py-1.5">
        <MarkdownFormatToolbar
          textareaRef={textareaRef}
          value={value}
          onChange={onChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        <LineNumberedTextarea
          ref={textareaRef}
          autoFocus={autoFocus}
          embedded
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="h-full min-h-0 leading-relaxed"
          textareaClassName="h-full min-h-[12rem] resize-y leading-relaxed placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

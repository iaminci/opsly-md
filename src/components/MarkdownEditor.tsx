"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  Bold,
  ChevronDown,
  Code,
  Code2,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { LineNumberedTextarea } from "@/components/LineNumberedTextarea";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
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

type EditorTab = "write" | "preview";

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

function EditorTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative -mb-px border-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "rounded-t-md border-border border-b-background bg-background text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
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
      className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-0.5 py-0.5"
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
                <Heading className="size-4" strokeWidth={2} />
                <ChevronDown className="size-3 opacity-60" />
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
  const [tab, setTab] = useState<EditorTab>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      className={cn(
        "markdown-editor flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border-2 border-border bg-background",
        className
      )}
    >
      <div className="flex shrink-0 items-end gap-3 border-b-2 border-border bg-input px-3 pt-1.5">
        <div className="flex shrink-0 items-end">
          <EditorTabButton
            active={tab === "write"}
            onClick={() => setTab("write")}
          >
            Write
          </EditorTabButton>
          <EditorTabButton
            active={tab === "preview"}
            onClick={() => setTab("preview")}
          >
            Preview
          </EditorTabButton>
        </div>
        {tab === "write" ? (
          <MarkdownFormatToolbar
            textareaRef={textareaRef}
            value={value}
            onChange={onChange}
          />
        ) : (
          <div className="min-w-0 flex-1 pb-2" aria-hidden />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        {tab === "write" ? (
          <LineNumberedTextarea
            ref={textareaRef}
            autoFocus={autoFocus}
            embedded
            showLineNumbers={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className="h-full min-h-0 leading-relaxed"
            textareaClassName="h-full min-h-[12rem] resize-y leading-relaxed placeholder:text-muted-foreground"
          />
        ) : (
          <div className="native-scrollbar h-full min-h-[12rem] overflow-y-auto px-4 py-3">
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

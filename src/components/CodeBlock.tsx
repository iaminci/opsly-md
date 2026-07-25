"use client";

import { cn, reactNodeToPlainText } from "@/lib/utils";
import {
  FENCED_CODE_INNER_CODE_CLASSNAME,
  FencedCodeShell,
  ToolbarCopyButton,
} from "./secure-fence";

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  node?: unknown;
}

function extractLanguage(className?: string): string | undefined {
  const match = /language-(\w+)/.exec(className ?? "");
  if (!match?.[1]) return undefined;
  const lang = match[1].toLowerCase();
  if (lang === "text" || lang === "plaintext" || lang === "txt") return undefined;
  return lang;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const code = reactNodeToPlainText(children).replace(/\n$/, "");
  const language = extractLanguage(className);

  return (
    <FencedCodeShell
      language={language}
      toolbarRight={<ToolbarCopyButton textToCopy={code} />}
      preProps={{
        className: "overflow-x-auto p-0",
        children: (
          <code className={cn(FENCED_CODE_INNER_CODE_CLASSNAME, className)}>
            {children}
          </code>
        ),
      }}
    />
  );
}

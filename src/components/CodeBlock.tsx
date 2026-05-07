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

export function CodeBlock({ className, children }: CodeBlockProps) {
  const code = reactNodeToPlainText(children).replace(/\n$/, "");

  return (
    <FencedCodeShell
      toolbarRight={<ToolbarCopyButton textToCopy={code} />}
      preProps={{
        className: "overflow-x-auto p-0",
        children: (
          <code
            className={cn(FENCED_CODE_INNER_CODE_CLASSNAME, className)}
          >
            {children}
          </code>
        ),
      }}
    />
  );
}

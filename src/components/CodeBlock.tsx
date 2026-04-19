"use client";

import { useCallback, useState } from "react";
import { cn, reactNodeToPlainText } from "@/lib/utils";

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  node?: unknown;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const code = reactNodeToPlainText(children).replace(/\n$/, "");

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="group relative my-4">
      <pre className="overflow-x-auto rounded-md bg-[#0d1117] p-4 text-sm font-mono whitespace-pre">
        <code className={cn("font-mono", className)}>{children}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-700 group-hover:opacity-100 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-200"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  OPSLY_MASK_TOGGLE_ATTR,
  useSecureFenceBehavior,
} from "opsly-mask";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Set by the markdown host (` ```secure ` → hast div`) so clipboard can include the fenced body without DOM scrape. */
export const SecureFenceExtrasContext = createContext<{ copyPlain?: string | null } | null>(
  null,
);

/**
 * Inner fenced `<code>`: same `hljs` shell `rehype-highlight` applies so
 * imported `highlight.js/styles/github-dark.min.css` gets identical surface/foreground.
 */
export const FENCED_CODE_INNER_CODE_CLASSNAME =
  "hljs block w-full p-5 text-sm font-mono whitespace-pre";

/** One shared toolbar row for every fenced code block (normal + secure). */
const TOOLBAR_ROW =
  "not-prose flex min-h-9 shrink-0 flex-wrap items-center justify-end gap-2 border-b border-border bg-zinc-900 px-2 py-1 dark:bg-zinc-950";

/** Shared chip styling: copy + icon actions align to the same height. */
const toolbarActionBase =
  "inline-flex h-7 shrink-0 items-center justify-center rounded border border-zinc-600 bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600";

/** Inline copy control — same visual system as the reveal control. */
export function ToolbarCopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);
  const normalized = textToCopy.replace(/\n$/, "");

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(normalized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [normalized]);

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(toolbarActionBase, "px-2 text-xs font-medium")}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlockToolbar({ children }: { children: ReactNode }) {
  return <div className={TOOLBAR_ROW}>{children}</div>;
}

/**
 * Single shell for all fenced code: opt out of `.prose pre` margins/fonts, toolbar + body.
 * Normal and secure blocks differ only by `toolbarRight` content.
 */
export function FencedCodeShell({
  toolbarRight,
  preProps,
}: {
  toolbarRight?: ReactNode;
  preProps: ComponentProps<"pre">;
}) {
  const { children, className: preClass, ...restPre } = preProps;
  return (
    <div
      data-fenced-code
      className="not-prose my-4 flex w-full max-w-full min-w-0 flex-col overflow-hidden rounded-md border-2 border-border"
    >
      {toolbarRight != null ? <CodeBlockToolbar>{toolbarRight}</CodeBlockToolbar> : null}
      <pre
        {...restPre}
        className={cn(
          "m-0 overflow-x-auto rounded-none border-0 bg-transparent p-0 font-mono whitespace-pre",
          preClass,
        )}
      >
        {children}
      </pre>
    </div>
  );
}

/**
 * `components.pre` for secure block (`data-opsly-mask`): same shell + toolbar as normal blocks, plus reveal.
 */
export function SecureFencePreChrome(
  props: ComponentProps<"pre"> & { "data-opsly-mask"?: boolean },
) {
  const { children, className: preClass, ...rest } = props;
  const extras = useContext(SecureFenceExtrasContext);
  const copyPlain =
    extras?.copyPlain !== undefined && extras?.copyPlain !== null ? extras.copyPlain : undefined;

  const ctx = useSecureFenceBehavior();

  const toolbarRight = useMemo(() => {
    const copy =
      typeof copyPlain === "string" && copyPlain !== "" ? (
        <ToolbarCopyButton textToCopy={copyPlain} />
      ) : null;

    if (!ctx) {
      return copy;
    }

    return (
      <>
        <button
          type="button"
          {...{ [OPSLY_MASK_TOGGLE_ATTR]: true }}
          className={cn(toolbarActionBase, "w-7 min-w-7 p-0")}
          aria-label={ctx.revealed ? "Hide protected content" : "Show protected content"}
          aria-pressed={ctx.revealed}
          aria-controls={ctx.contentId}
          onClick={ctx.toggle}
        >
          {ctx.revealed ? (
            <EyeOff className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          ) : (
            <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          )}
        </button>
        {copy}
      </>
    );
  }, [copyPlain, ctx]);

  const preProps = {
    ...rest,
    className: cn("shadow-none outline-none ring-0", preClass),
    children,
  };

  return <FencedCodeShell toolbarRight={toolbarRight} preProps={preProps} />;
}

"use client";

import { useCallback, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { OPSLY_MASK_TOGGLE_ATTR } from "opsly-mask";
import {
  FENCED_CODE_INNER_CODE_CLASSNAME,
  FencedCodeShell,
  ToolbarCopyButton,
} from "@/components/secure-fence";
import { cn } from "@/lib/utils";

const SECRETS = [
  { key: "AWS_ACCESS_KEY", value: "AKIAEXAMPLEKEY12" },
  { key: "DATABASE_PASSWORD", value: "prod-db-password" }
] as const;

/** Matches opsly-mask: single fixed-length mask for the entire fence body. */
const MASKED_OUTPUT = "•".repeat(16);

const MARKDOWN_SOURCE = SECRETS.map(({ key, value }) => `${key}=${value}`).join("\n");

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 font-heading text-[9px] font-medium uppercase tracking-wider text-muted">
      {children}
    </p>
  );
}

export function OpslyMaskPreview({ className }: { className?: string }) {
  const [revealed, setRevealed] = useState(false);

  const toggle = useCallback(() => {
    setRevealed((current) => !current);
  }, []);

  const outputContent = revealed ? MARKDOWN_SOURCE : MASKED_OUTPUT;

  const toolbarRight = (
    <>
      <button
        type="button"
        {...{ [OPSLY_MASK_TOGGLE_ATTR]: true }}
        className="fenced-code-action fenced-code-action-icon"
        aria-label={revealed ? "Hide protected content" : "Show protected content"}
        aria-pressed={revealed}
        onClick={toggle}
      >
        {revealed ? (
          <EyeOff className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        ) : (
          <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        )}
      </button>
      <ToolbarCopyButton textToCopy={MARKDOWN_SOURCE} />
    </>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-base border-2 border-border bg-card shadow-shadow",
        className
      )}
    >
      <div className="flex h-8 items-center gap-2 border-b-2 border-border bg-secondary-background px-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full border border-border bg-muted/40" />
          <span className="size-2.5 rounded-full border border-border bg-muted/40" />
          <span className="size-2.5 rounded-full border border-border bg-muted/40" />
        </div>
        <span className="ml-2 font-heading text-[10px] font-medium uppercase tracking-wider text-muted">
          Secrets.md
        </span>
      </div>

      <div className="space-y-3 bg-background px-4 py-3.5 sm:px-5 sm:py-4">
        <div>
          <SectionLabel>Markdown Source</SectionLabel>
          <div className="overflow-hidden rounded-base border-2 border-border bg-secondary-background/80">
            <pre className="m-0 overflow-x-auto p-3 font-mono text-[10px] leading-relaxed text-foreground sm:text-[11px]">
              <code>
                <span className="text-muted-foreground">```</span>
                <span className="text-primary">secure</span>
                {"\n"}
                {MARKDOWN_SOURCE}
                {"\n"}
                <span className="text-muted-foreground">```</span>
              </code>
            </pre>
          </div>
        </div>

        <hr className="border-border" />

        <div>
          <SectionLabel>Rendered Output</SectionLabel>
          <div className="w-full [&_[data-fenced-code]]:my-0">
            <FencedCodeShell
              language="secure"
              toolbarRight={toolbarRight}
              preProps={
                {
                  "data-opsly-mask": true,
                  "data-revealed": revealed ? "true" : "false",
                  role: "group",
                  "aria-label": revealed ? "Revealed secrets" : "Masked secrets",
                  children: (
                    <code
                      className={cn(
                        FENCED_CODE_INNER_CODE_CLASSNAME,
                        "w-full !p-3.5 text-[10px] leading-relaxed sm:text-[11px]"
                      )}
                    >
                      {outputContent}
                    </code>
                  ),
                } as ComponentProps<"pre"> & { "data-opsly-mask"?: boolean }
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

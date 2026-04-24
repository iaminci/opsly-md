import { loadMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MarkdownSectionProps {
  file: string;
  className?: string;
  /** Opt-in CTA link classification (primary/secondary) for this section. */
  ctaLinks?: boolean;
}

/**
 * Renders a markdown file from `/content` as a homepage section.
 *
 * Layout is owned by React: every section gets a consistent top border and
 * vertical rhythm so content stays anchored to the same left edge as the
 * hero, without boxing each block individually.
 */
export async function MarkdownSection({
  file,
  className,
  ctaLinks = false,
}: MarkdownSectionProps) {
  const content = await loadMarkdown(file);
  return (
    <section
      className={cn("mt-16 border-t-2 border-border pt-16", className)}
    >
      <MarkdownRenderer content={content} ctaLinks={ctaLinks} />
    </section>
  );
}

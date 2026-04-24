import { loadMarkdown } from "@/lib/markdown";
import { MarkdownRenderer } from "./MarkdownRenderer";

/**
 * Homepage hero. Renders `hero.md` (logo + tagline + CTA row) with a small
 * file-path label above the content — a subtle "README" cue that frames the
 * page as documentation-shaped product copy rather than a generic landing.
 */
export async function Hero() {
  const content = await loadMarkdown("hero.md");
  return (
    <section className="hero pb-4">
      <div
        aria-hidden
        className="mb-6 font-mono text-foreground uppercase tracking-[0.18em] text-muted"
      >
        /homepage.md
      </div>
      <MarkdownRenderer content={content} ctaLinks />
    </section>
  );
}

import { cn } from "@/lib/utils";

const FEATURE_CARDS = [
  {
    index: "01",
    title: "LOCAL FIRST",
    line: "Your notes stay with you.",
    detail: "No account. No backend required.",
    dominant: true,
  },
  {
    index: "02",
    title: "MARKDOWN FIRST",
    line: "Write without friction.",
    detail: "GFM, code, Mermaid, KaTeX and more.",
    dominant: false,
  },
  {
    index: "03",
    title: "SECURE BLOCKS",
    line: "Protect sensitive knowledge.",
    detail: "Encrypt what should stay private.",
    dominant: false,
  },
  {
    index: "04",
    title: "SEARCH",
    line: "Find knowledge instantly.",
    detail: "Search across documents, sections and workspaces.",
    dominant: false,
  },
] as const;

export function HeroFeatureStack({ className }: { className?: string }) {
  return (
    <div className={cn("hero-stack", className)} aria-label="Product principles">
      <div className="hero-stack__stage">
        {FEATURE_CARDS.map((card, index) => (
          <article
            key={card.index}
            className={cn(
              "hero-stack__card",
              `hero-stack__card--${index}`,
              card.dominant && "hero-stack__card--dominant",
            )}
          >
            <p className="hero-stack__eyebrow">
              <span className="text-primary">{card.index}</span>
              <span className="text-muted-foreground" aria-hidden>
                {" — "}
              </span>
              <span className="text-primary">{card.title}</span>
            </p>
            <h3 className="hero-stack__line">{card.line}</h3>
            <p className="hero-stack__detail">{card.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ROADMAP_PAGE, ROADMAP_SECTIONS } from "@/lib/roadmap";
import { RoadmapSection } from "@/components/roadmap/RoadmapSection";

export function RoadmapPage() {
  return (
    <main className="mx-auto w-full max-w-[52rem] pt-10 sm:pt-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to home
      </Link>

      <header className="mt-8 space-y-3 sm:mt-10">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {ROADMAP_PAGE.title}
        </h1>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {ROADMAP_PAGE.intro.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </header>

      <div className="my-8 border-b border-border sm:my-10" aria-hidden />

      {ROADMAP_SECTIONS.map((section) => (
        <RoadmapSection key={section.id} section={section} />
      ))}

      <section
        id="principles"
        aria-labelledby="principles-heading"
        className="pt-8 sm:pt-10"
      >
        <h2
          id="principles-heading"
          className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {ROADMAP_PAGE.principlesTitle}
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-foreground sm:text-base">
          {ROADMAP_PAGE.principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

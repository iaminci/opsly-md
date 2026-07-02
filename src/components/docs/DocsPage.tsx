"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { DOCS_PAGE, DOCS_SECTIONS } from "@/lib/docs";
import { cn } from "@/lib/utils";

export function DocsPage() {
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
          {DOCS_PAGE.title}
        </h1>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {DOCS_PAGE.intro.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </header>

      <div className="my-8 border-b border-border sm:my-10" aria-hidden />

      {DOCS_SECTIONS.map((section, index) => (
        <section
          key={section.id}
          aria-labelledby={`${section.id}-content`}
          className={cn(
            "py-8 sm:py-10",
            index < DOCS_SECTIONS.length - 1 && "border-b border-border"
          )}
        >
          <div id={`${section.id}-content`}>
            <MarkdownRenderer content={section.content} />
          </div>
        </section>
      ))}
    </main>
  );
}

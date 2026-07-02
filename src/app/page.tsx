import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroScreenshot } from "@/components/HeroScreenshot";
import { OpslyMaskPreview } from "@/components/OpslyMaskPreview";
import { Button } from "@/components/ui/button";
import { HomeRoadmapCard } from "@/components/roadmap/HomeRoadmapCard";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  FileCode2,
  FileText,
  HardDrive,
  Sparkles,
} from "lucide-react";

const homeTitle = "Opsly MD — A local-first Markdown workspace.";
const homeDescription =
  "Runs entirely in your browser — no accounts, no servers, no tracking.";

const ogImage = "/favicon-64.png";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    type: "website",
    url: "/",
    images: [{ url: ogImage, width: 64, height: 64, alt: "Opsly MD" }],
  },
  twitter: {
    card: "summary",
    title: homeTitle,
    description: homeDescription,
    images: [ogImage],
  },
};

const APP_URL = "/app?loadSample=1";

const HOME_CONTAINER =
  "mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-10 xl:px-12";

const proofStripItems = [
  { icon: FileText, label: "WRITE" },
  { icon: HardDrive, label: "ORGANIZE" },
  { icon: FileCode2, label: "NAVIGATE" },
  { icon: Sparkles, label: "RETRIEVE" },
] as const;

const maskFeature = {
  number: "01",
  title: "Opsly Mask",
  lineGroups: [
    [
      "Store credentials, API keys, and deployment notes without leaving your documentation.",
    ],
    ["Hide secrets by default."],
    ["Reveal when needed."],
  ],
  variant: "mask" as const,
  reversed: false,
};

const featureCards = [
  {
    number: "02",
    title: "Organize",
    lineGroups: [
      ["Workspaces for projects."],
      ["Folders and notes that scale with you."],
      ["Everything stays in plain Markdown."],
    ],
  },
  {
    number: "03",
    title: "Find",
    lineGroups: [
      ["Find notes instantly."],
      ["Search titles, content, and folders from one place."],
      ["Stay in Markdown."],
    ],
  },
] as const;

type MockupVariant = "hero" | "mask";

function ProductMockup({
  variant = "hero",
  className,
}: {
  variant?: MockupVariant;
  className?: string;
}) {
  const mockup =
    variant === "mask" ? (
      <OpslyMaskPreview />
    ) : (
      <HeroScreenshot className={className} />
    );

  if (variant === "hero") {
    return mockup;
  }

  return <div className={cn("w-full", className)}>{mockup}</div>;
}

function HeroSection() {
  return (
    <section className="pb-14 pt-14 sm:pb-20 sm:pt-16">
      <div className="grid items-stretch gap-8 lg:grid-cols-[2fr_3fr] lg:gap-8">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <h1 className="font-heading text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-foreground">
            Your Knowledge
            <br />
            <span className="inline-block bg-primary px-2 py-0.5 text-primary-foreground">
              In plain text.
            </span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Notes, documentation, and structured knowledge in a
            <br className="hidden sm:block" />
            Markdown-first workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 pb-8 sm:mt-10 sm:pb-10">
            <Button variant="default" size="lg" className="shadow-reverted hover:bg-primary-hover hover:text-black" asChild>
              <Link href={APP_URL}>
                Start Writing
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-6">
            {proofStripItems.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground"
              >
                <span className="flex size-7 items-center justify-center rounded-base border-2 border-border bg-card shadow-shadow">
                  <Icon className="size-3.5 text-primary" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 lg:flex">
          <ProductMockup variant="hero" className="w-full lg:h-full" />
        </div>
      </div>
    </section>
  );
}

function FeatureSection({
  number,
  title,
  lines,
  lineGroups,
  variant,
  reversed = false,
  accent,
  sectionId,
}: {
  number: string;
  title: string;
  lines?: string[];
  lineGroups?: string[][];
  variant: MockupVariant;
  reversed?: boolean;
  accent?: string;
  sectionId?: string;
}) {
  const isMask = variant === "mask";

  return (
    <section
      id={sectionId}
      className={cn(
        "grid gap-8 border-t-2 border-border py-14 sm:gap-10 sm:py-16 lg:grid-cols-2 lg:gap-12",
        isMask ? "items-center lg:items-stretch" : "items-center",
        reversed && "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1"
      )}
    >
      <div
        className={cn(
          "min-w-0 pl-6 sm:pl-8",
          reversed ? "lg:pl-28" : "lg:pl-40",
          isMask ? "flex flex-col justify-center" : "space-y-4"
        )}
      >
        <div className={cn("flex items-center", isMask ? "gap-4" : "gap-3")}>
          <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-background font-heading text-sm font-bold text-primary shadow-shadow">
            {number}
          </span>
          <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
        </div>
        {lineGroups ? (
          <div className="mt-7 text-base leading-snug text-muted-foreground sm:text-lg">
            {lineGroups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className={cn("space-y-1", groupIndex > 0 && "mt-2")}
              >
                {group.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1 text-base text-muted-foreground sm:text-lg">
            {lines?.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        {accent ? (
          <p className="inline-block border-2 border-border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-shadow">
            {accent}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">
        <ProductMockup variant={variant} />
      </div>
    </section>
  );
}

const featureCardClassName =
  "flex h-full flex-col rounded-base border border-border bg-background p-6 shadow-shadow sm:p-8";

function FeatureCard({
  number,
  title,
  lineGroups,
}: {
  number: string;
  title: string;
  lineGroups: readonly (readonly string[])[];
}) {
  return (
    <article className={featureCardClassName}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-background font-heading text-sm font-bold text-primary shadow-shadow">
          {number}
        </span>
        <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
      </div>
      <div className="mt-7 text-base leading-snug text-muted-foreground sm:text-lg">
        {lineGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={cn("space-y-1", groupIndex > 0 && "mt-3")}
          >
            {group.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}

function FeatureCardsSection({
  cards,
}: {
  cards: typeof featureCards;
}) {
  return (
    <section className="border-t-2 border-border py-10 sm:py-12">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        {cards.map((card) => (
          <FeatureCard key={card.number} {...card} />
        ))}
        <HomeRoadmapCard number="04" />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className={HOME_CONTAINER}>
        <SiteHeader />
        <main>
          <HeroSection />
          <div id="features" className="[&>section:first-child]:!pt-8 sm:[&>section:first-child]:!pt-10">
            <FeatureSection {...maskFeature} />
            <FeatureCardsSection cards={featureCards} />
          </div>
          <SiteFooter />
        </main>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { FindScreenshot } from "@/components/FindScreenshot";
import { HeroScreenshot } from "@/components/HeroScreenshot";
import { OpslyMaskPreview } from "@/components/OpslyMaskPreview";
import { RoadmapPreview } from "@/components/RoadmapPreview";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/HeaderLogo";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ChevronRight,
  FileCode2,
  FileText,
  FolderIcon,
  HardDrive,
  Layers,
  Search,
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
const GITHUB_URL = "https://github.com/iaminci/opsly-md";

const HOME_CONTAINER =
  "mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-10 xl:px-12";

const proofStripItems = [
  { icon: FileText, label: "WRITE" },
  { icon: HardDrive, label: "ORGANIZE" },
  { icon: FileCode2, label: "NAVIGATE" },
  { icon: Sparkles, label: "RETRIEVE" },
] as const;

const features = [
  {
    number: "01",
    title: "Opsly Mask",
    lineGroups: [
      [
        "Store credentials, API keys, and deployment notes without leaving your documentation.",
      ],
      [
        "Hide secrets by default."
      ],
      [
        "Reveal when needed."
      ],
    ],
    variant: "mask" as const,
    reversed: false,
  },
  {
    number: "02",
    title: "Organize",
    lineGroups: [
      ["Workspaces for projects."],
      ["Folders and notes that scale with you."],
      ["Everything stays in plain Markdown."]
    ],
    variant: "organize" as const,
    reversed: true,
  },
  {
    number: "03",
    title: "Find",
    lineGroups: [
      ["Find notes instantly."],
      ["Search titles, content, and folders from one place."],
      ["Stay in Markdown."]
    ],
    variant: "find" as const,
    reversed: false,
  },
  {
    number: "04",
    title: "Roadmap",
    lineGroups: [
      ["The goal is not more features."],
      ["The goal is better Markdown."],
      ["Everything on this roadmap must earn its place."],
    ],
    variant: "roadmap" as const,
    reversed: true,
    sectionId: "roadmap",
  },
];

const footerLinks = [
  { href: GITHUB_URL, label: "GitHub", external: true },
] as const;

type MockupVariant = "hero" | "mask" | "organize" | "find" | "roadmap";

function MockupChrome({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
        <HeaderLogo className="ml-2 h-4 w-auto opacity-80" />
      </div>
      {children}
    </div>
  );
}

function MockupSidebar({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r-2 border-border bg-sidebar text-sidebar-foreground",
        compact ? "w-[140px]" : "w-[168px]"
      )}
    >
      <div className="border-b-2 border-border px-2.5 py-2">
        <div className="flex items-center gap-1.5 rounded-base border-2 border-border bg-background px-2 py-1 text-[10px] text-muted">
          <Search className="size-3 shrink-0" />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-hidden p-2 text-[10px]">
        <div>
          <p className="mb-1 px-1 font-heading text-[9px] uppercase tracking-wider text-muted">
            Vault
          </p>
          <div className="space-y-0.5">
            {["Inbox", "Projects", "Areas", "Resources", "Archive"].map(
              (name, i) => (
                <div
                  key={name}
                  className={cn(
                    "flex items-center gap-1 rounded-base px-1.5 py-0.5",
                    i === 1 && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  )}
                >
                  <ChevronRight className="size-2.5 shrink-0 opacity-60" />
                  <Layers className="size-2.5 shrink-0 text-primary" />
                  <span className="truncate">{name}</span>
                </div>
              )
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 px-1 font-heading text-[9px] uppercase tracking-wider text-muted">
            Notes
          </p>
          <div className="space-y-0.5">
            {[
              { title: "MCP Architecture", active: true },
              { title: "Weekly Review", active: false },
              { title: "API Design", active: false },
            ].map(({ title, active }) => (
              <div
                key={title}
                className={cn(
                  "flex items-center gap-1 rounded-base px-1.5 py-0.5",
                  active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                )}
              >
                <FileText className="size-2.5 shrink-0 text-primary" />
                <span className="truncate">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function OrganizeMockup() {
  const notes = [
    { title: "MCP Architecture", folder: "Projects / Dev", ago: "2d ago" },
    { title: "Weekly Review", folder: "Areas / Work", ago: "5d ago" },
    { title: "API Design Notes", folder: "Projects / Dev", ago: "1w ago" },
    { title: "Reading List", folder: "Resources", ago: "2w ago" },
  ];

  return (
    <MockupChrome className="w-full">
      <div className="flex aspect-[16/9] min-h-[220px]">
        <MockupSidebar compact />
        <div className="min-w-0 flex-1 bg-background">
          <div className="divide-y-2 divide-border">
            {notes.map((note) => (
              <div
                key={note.title}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    {note.title}
                  </p>
                  <p className="flex items-center gap-1 truncate text-[9px] text-muted">
                    <FolderIcon className="size-2.5 shrink-0" />
                    {note.folder}
                  </p>
                </div>
                <span className="shrink-0 text-[9px] text-muted">{note.ago}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupChrome>
  );
}

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
    ) : variant === "organize" ? (
      <OrganizeMockup />
    ) : variant === "find" ? (
      <FindScreenshot />
    ) : variant === "roadmap" ? (
      <RoadmapPreview />
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
            <Button variant="neutral" size="lg" className="hover:bg-primary" asChild>
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
          <div className="mt-7 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {lineGroups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className={cn("space-y-2", groupIndex > 0 && "mt-6")}
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

function FooterSection() {
  return (
    <footer className="mt-10 border-t-2 border-border sm:mt-12">
      <div className="grid gap-8 py-6 sm:grid-cols-3 sm:items-center sm:gap-6 sm:py-8 text-muted-foreground">
        <p>
          Opsly MD
        </p>
        <p>Markdown-first. Local-first. Open source.</p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
          {footerLinks.map(({ href, label, external }) =>
            external ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ) : (
              <Link
                key={label}
                href={href}
                className="transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            )
          )}
        </nav>
      </div>
    </footer>
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
            {features.map((feature) => (
              <FeatureSection key={feature.number} {...feature} />
            ))}
          </div>
          <FooterSection />
        </main>
      </div>
    </div>
  );
}

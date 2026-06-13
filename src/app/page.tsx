import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/GitHubIcon";
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
  Unlock,
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

const heroProof = [
  { icon: HardDrive, label: "Local First" },
  { icon: FileCode2, label: "Open Format" },
  { icon: Unlock, label: "No Lock-In" },
] as const;

const proofStripItems = [
  { icon: FileText, label: "100% Markdown" },
  { icon: HardDrive, label: "Local First" },
  { icon: FileCode2, label: "Open Format" },
  { icon: Sparkles, label: "AI Ready" },
] as const;

const features = [
  {
    number: "01",
    title: "Write",
    lines: ["Plain markdown.", "Fast editing.", "Live preview."],
    variant: "write" as const,
    reversed: false,
  },
  {
    number: "02",
    title: "Organize",
    lines: ["Folders.", "Search.", "Structure."],
    variant: "organize" as const,
    reversed: true,
  },
  {
    number: "03",
    title: "Remember",
    lines: ["Knowledge that stays accessible."],
    variant: "remember" as const,
    reversed: false,
  },
  {
    number: "04",
    title: "Retrieve",
    lines: ["Ask questions.", "Find answers."],
    variant: "retrieve" as const,
    reversed: true,
    accent: "Your knowledge. Always in reach.",
  },
];

const footerLinks = [
  { href: GITHUB_URL, label: "GitHub", external: true },
  { href: "/app", label: "Docs", external: false },
  { href: "#", label: "Privacy", external: false },
] as const;

type MockupVariant = "hero" | "write" | "organize" | "remember" | "retrieve";

const MCP_EDITOR_LINES = [
  "# MCP Architecture",
  "",
  "## Overview",
  "Model Context Protocol connects",
  "AI assistants to external tools.",
  "",
  "## Components",
  "- **Server** — exposes tools",
  "- **Client** — invokes tools",
  "- **Transport** — JSON-RPC",
];

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
          <span>Search vault…</span>
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

function MockupEditor({ lines = MCP_EDITOR_LINES }: { lines?: string[] }) {
  return (
    <div className="min-w-0 flex-1 border-r-2 border-border bg-secondary-background p-3 font-mono text-[9px] leading-relaxed text-foreground">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-2">
          <span className="w-4 shrink-0 select-none text-right text-muted">{i + 1}</span>
          <span
            className={cn(
              line.startsWith("# ") && "font-heading font-bold text-foreground",
              line.startsWith("## ") && "font-heading font-bold text-foreground",
              line.startsWith("- ") && "text-muted-foreground"
            )}
          >
            {line || "\u00A0"}
          </span>
        </div>
      ))}
    </div>
  );
}

function MockupPreview() {
  return (
    <div className="min-w-0 flex-1 overflow-hidden bg-background p-3 text-[10px] leading-relaxed">
      <h1 className="mb-2 font-heading text-sm font-bold text-foreground">
        MCP Architecture
      </h1>
      <h2 className="mb-1.5 font-heading text-xs font-bold text-foreground">
        Overview
      </h2>
      <p className="mb-2 text-muted-foreground">
        Model Context Protocol connects AI assistants to external tools.
      </p>
      <h2 className="mb-1.5 font-heading text-xs font-bold text-foreground">
        Components
      </h2>
      <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
        <li>
          <strong className="text-foreground">Server</strong> — exposes tools
        </li>
        <li>
          <strong className="text-foreground">Client</strong> — invokes tools
        </li>
        <li>
          <strong className="text-foreground">Transport</strong> — JSON-RPC
        </li>
      </ul>
    </div>
  );
}

function HeroMockup() {
  return (
    <MockupChrome className="w-full">
      <div className="flex aspect-[16/10] min-h-[280px]">
        <MockupSidebar />
        <MockupEditor />
        <MockupPreview />
      </div>
    </MockupChrome>
  );
}

function WriteMockup() {
  return (
    <MockupChrome className="w-full">
      <div className="flex aspect-[16/9] min-h-[220px]">
        <MockupEditor
          lines={[
            "# Writing is thinking",
            "",
            "Plain markdown. No distractions.",
            "",
            "> Capture ideas before they fade.",
          ]}
        />
        <MockupPreview />
      </div>
    </MockupChrome>
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
          <div className="border-b-2 border-border px-3 py-2">
            <div className="flex items-center gap-2 rounded-base border-2 border-border bg-secondary-background px-2 py-1 text-[10px] text-muted">
              <Search className="size-3" />
              <span>Search notes…</span>
            </div>
          </div>
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

function RememberMockup() {
  const nodes = [
    { label: "MCP Architecture", x: "50%", y: "42%", active: true },
    { label: "API Design", x: "22%", y: "28%", active: false },
    { label: "Weekly Review", x: "78%", y: "30%", active: false },
    { label: "Transport Layer", x: "18%", y: "68%", active: false },
    { label: "Tool Registry", x: "72%", y: "65%", active: false },
    { label: "JSON-RPC", x: "50%", y: "78%", active: false },
  ];

  return (
    <MockupChrome className="w-full">
      <div className="relative aspect-[16/9] min-h-[220px] bg-secondary-background">
        <p className="absolute left-3 top-2 font-heading text-[9px] uppercase tracking-wider text-muted">
          Graph View
        </p>
        <svg className="absolute inset-0 size-full" aria-hidden>
          <line x1="50%" y1="42%" x2="22%" y2="28%" stroke="var(--border)" strokeWidth="1.5" />
          <line x1="50%" y1="42%" x2="78%" y2="30%" stroke="var(--border)" strokeWidth="1.5" />
          <line x1="50%" y1="42%" x2="18%" y2="68%" stroke="var(--border)" strokeWidth="1.5" />
          <line x1="50%" y1="42%" x2="72%" y2="65%" stroke="var(--border)" strokeWidth="1.5" />
          <line x1="50%" y1="42%" x2="50%" y2="78%" stroke="var(--border)" strokeWidth="1.5" />
        </svg>
        {nodes.map((node) => (
          <div
            key={node.label}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-base border-2 border-border px-2 py-1 text-[9px] shadow-shadow",
              node.active
                ? "bg-primary font-medium text-primary-foreground"
                : "bg-card text-foreground"
            )}
            style={{ left: node.x, top: node.y }}
          >
            {node.label}
          </div>
        ))}
      </div>
    </MockupChrome>
  );
}

function RetrieveMockup() {
  return (
    <MockupChrome className="w-full">
      <div className="flex aspect-[16/9] min-h-[220px] flex-col bg-background">
        <div className="flex-1 space-y-2 overflow-hidden p-3">
          <div className="ml-auto max-w-[85%] rounded-base border-2 border-border bg-primary px-2.5 py-1.5 text-[10px] text-primary-foreground shadow-shadow">
            What did I write about MCP last month?
          </div>
          <div className="space-y-1.5">
            {[
              { title: "MCP Architecture", snippet: "Transport layer uses JSON-RPC…" },
              { title: "API Design Notes", snippet: "Tool registry pattern for MCP…" },
            ].map((hit) => (
              <div
                key={hit.title}
                className="rounded-base border-2 border-border bg-secondary-background px-2.5 py-2"
              >
                <p className="text-[10px] font-medium text-foreground">{hit.title}</p>
                <p className="text-[9px] text-muted-foreground">{hit.snippet}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t-2 border-border p-2">
          <div className="rounded-base border-2 border-border bg-secondary-background px-2.5 py-1.5 text-[10px] text-muted">
            Ask about your notes…
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
    variant === "write" ? (
      <WriteMockup />
    ) : variant === "organize" ? (
      <OrganizeMockup />
    ) : variant === "remember" ? (
      <RememberMockup />
    ) : variant === "retrieve" ? (
      <RetrieveMockup />
    ) : (
      <HeroMockup />
    );

  return <div className={cn("w-full", className)}>{mockup}</div>;
}

function HeroSection() {
  return (
    <section className="pb-12 pt-8 sm:pb-16 sm:pt-12">
      <div className="grid items-center gap-10 lg:grid-cols-[2fr_3fr] lg:gap-12">
        <div className="min-w-0 space-y-6">
          <h1 className="font-heading text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-foreground">
            Your thoughts.
            <br />
            <span className="inline-block bg-primary px-2 py-0.5 text-primary-foreground">
              In plain text.
            </span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            A fast, focused workspace for notes,
            <br className="hidden sm:block" />
            documentation, and knowledge.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="neutral" size="lg" className="hover:bg-primary" asChild>
              <Link href={APP_URL}>
                Start Writing
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="neutral" size="lg" asChild>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <GitHubIcon className="size-4" />
                GitHub
              </a>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
            {heroProof.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 lg:scale-[1.02] lg:origin-left">
          <ProductMockup variant="hero" />
        </div>
      </div>
    </section>
  );
}

function ProofStrip() {
  return (
    <section className="border-y-2 border-border bg-secondary-background py-5 shadow-shadow">
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-12">
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
    </section>
  );
}

function FeatureSection({
  number,
  title,
  lines,
  variant,
  reversed = false,
  accent,
}: {
  number: string;
  title: string;
  lines: string[];
  variant: MockupVariant;
  reversed?: boolean;
  accent?: string;
}) {
  return (
    <section
      className={cn(
        "grid items-center gap-8 border-t-2 border-border py-14 sm:gap-10 sm:py-16 lg:grid-cols-2 lg:gap-12",
        reversed && "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1"
      )}
    >
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-background font-heading text-sm font-bold text-primary shadow-shadow">
            {number}
          </span>
          <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
        </div>
        <div className="space-y-1 text-base text-muted-foreground sm:text-lg">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
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
    <footer className="mt-16 border-t-2 border-border bg-primary text-primary-foreground">
      <div className="flex flex-col items-start justify-between gap-6 py-8 sm:flex-row sm:items-center">
        <Link
          href="/"
          aria-label="Opsly MD"
          className="shrink-0 font-heading text-lg font-bold leading-none no-underline hover:opacity-90 sm:text-xl"
        >
          <span className="opacity-90">#</span> OPSLY MD
        </Link>
        <p className="text-sm font-medium opacity-90">
          Open source. Local-first. Built for lasting notes.
        </p>
        <nav className="flex flex-wrap items-center gap-5 text-sm font-medium">
          {footerLinks.map(({ href, label, external }) =>
            external ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {label}
              </a>
            ) : (
              <Link
                key={label}
                href={href}
                className="underline-offset-4 hover:underline"
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
      <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-8">
        <SiteHeader />
      </div>
      <main>
        <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-8">
          <HeroSection />
        </div>
        <ProofStrip />
        <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-8">
          <div id="features">
            {features.map((feature) => (
              <FeatureSection key={feature.number} {...feature} />
            ))}
          </div>
          <div id="use-cases" className="sr-only" aria-hidden />
          <FooterSection />
        </div>
      </main>
    </div>
  );
}

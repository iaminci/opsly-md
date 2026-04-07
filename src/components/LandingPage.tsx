"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  FolderTree,
  Search,
  FileCode,
  Workflow,
  SquareRadical,
  Download,
  Shield,
  Database,
  AlertTriangleIcon,
  Github,
  FileText,
  FolderOpen,
  Moon,
  ArrowRight,
} from "lucide-react";

const DEMO_MARKDOWN = `# Kubernetes Deployment

\`\`\`bash
kubectl apply -f deployment.yaml
\`\`\`

\`\`\`mermaid
graph LR
A --> B
\`\`\`
`;

const CORE_PRINCIPLES = [
  {
    icon: Database,
    title: "Local-first",
    description: "Documents stay inside your browser storage.",
  },
  {
    icon: Shield,
    title: "No Accounts",
    description: "Open the app and start writing immediately.",
  },
  {
    icon: Shield,
    title: "Privacy-first",
    description: "No analytics, tracking, or backend services.",
  },
];

const CAPABILITIES = [
  {
    icon: FileCode,
    title: "Markdown Rendering",
    description: "GitHub-flavored Markdown with syntax highlighting.",
  },
  {
    icon: Workflow,
    title: "Mermaid Diagrams",
    description: "Render flowcharts and diagrams inside documents.",
  },
  {
    icon: SquareRadical,
    title: "Math Support",
    description: "KaTeX rendering for technical documentation.",
  },
  {
    icon: FolderOpen,
    title: "Workspaces",
    description: "Separate environments for different projects.",
  },
  {
    icon: FolderTree,
    title: "Nested Folders",
    description: "Organize documents like a filesystem.",
  },
  {
    icon: Search,
    title: "Fast Search",
    description: "Search across all documents instantly.",
  },
  {
    icon: Download,
    title: "Import / Export",
    description: "Backup workspaces as JSON.",
  },
  {
    icon: Moon,
    title: "Dark Mode",
    description: "Comfortable reading for long documents.",
  },
];

function LandingPageScreenshot({ className }: { className?: string }) {
  const altBase =
    "Opsly MD interface with workspaces sidebar, rendered Markdown, and on-page navigation";
  return (
    <>
      <img
        src="/opsly-md-light.png"
        alt={`${altBase} in light mode`}
        className={cn("w-full object-contain dark:hidden", className)}
      />
      <img
        src="/opsly-md-dark.png"
        alt={`${altBase} in dark mode`}
        className={cn("hidden w-full object-contain dark:block", className)}
      />
    </>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span>Opsly</span>
          <span className="text-orange-500 dark:text-orange-400">MD</span>
        </Link>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/iaminci/opsly-md"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline"}))}
          >
            <Github className="size-4" />
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.15),transparent)]" />
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Local-first Markdown Workspaces
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
          Write, organize and render Markdown documents directly in your browser.
        </p>
        <p className="mt-2 text-lg text-muted-foreground">
          No accounts. No cloud. Your documents stay on your device.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/app?loadSample=1"
            className={cn(buttonVariants({ size: "lg" }), "bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700")}
          >
            View Example Workspace
          </Link>
        </div>
        <div className="mt-16 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg ring-1 ring-border/30 dark:ring-border/50">
          <LandingPageScreenshot />
        </div>
      </div>
    </section>
  );
}

function LiveMarkdownDemo() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Live Markdown Demo
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Markdown rendering, code blocks, and diagrams.
        </p>
        <div className="mt-12 grid gap-0 overflow-hidden rounded-xl border border-border/50 bg-card lg:grid-cols-2">
          <div className="border-b border-border/50 lg:border-b-0 lg:border-r">
            <div className="border-b border-border/50 bg-muted/30 px-4 py-2 font-mono text-xs text-muted-foreground">
              Input
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-foreground whitespace-pre">
              {DEMO_MARKDOWN}
            </pre>
          </div>
          <div>
            <div className="border-b border-border/50 bg-muted/30 px-4 py-2 font-mono text-xs text-muted-foreground">
              Rendered output
            </div>
            <div className="overflow-y-auto max-h-[400px] p-4">
              <MarkdownRenderer content={DEMO_MARKDOWN} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InterfaceOverview() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Interface Overview
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          A documentation-style layout built for developers.
        </p>
        <div className="mt-12 relative">
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg ring-1 ring-border/30 dark:ring-border/50">
            <LandingPageScreenshot />
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Card className="ring-1 ring-border/50 ring-orange-500/30">
              <CardHeader className="pb-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <FolderTree className="size-5 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-base">Sidebar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Organize documents in workspaces and folders.
                </p>
              </CardContent>
            </Card>
            <Card className="ring-1 ring-border/50 ring-orange-500/30">
              <CardHeader className="pb-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <FileText className="size-5 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-base">Markdown Renderer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Clean document reading experience.
                </p>
              </CardContent>
            </Card>
            <Card className="ring-1 ring-border/50 ring-orange-500/30">
              <CardHeader className="pb-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Search className="size-5 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-base">On-page Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Auto-generated table of contents for long documents.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function CorePrinciples() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Core Principles
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          The philosophy behind Opsly MD.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {CORE_PRINCIPLES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="ring-1 ring-border/50">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10 dark:bg-orange-500/20">
                  <Icon className="size-5 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Capabilities
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="ring-1 ring-border/50">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function LocalStorageTransparency() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Your documents are stored locally
        </h2>
        <Card className="mt-8 border-amber-500/50 bg-amber-50/50 ring-1 ring-amber-500/30 dark:border-amber-600/50 dark:bg-amber-950/20 dark:ring-amber-500/20">
          <CardContent className="flex gap-4 pt-6">
            <AlertTriangleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">
                Opsly MD stores data directly in your browser using IndexedDB.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                If browser storage is cleared, documents may be removed.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Export workspaces regularly to keep backups.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Architecture() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Architecture
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Technical transparency for developers.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <Card className="ring-1 ring-border/50">
            <CardHeader>
              <CardTitle className="text-base">Markdown processing pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm text-muted-foreground">
                <div>Markdown</div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="size-4 text-orange-500" />
                </div>
                <div>react-markdown</div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="size-4 text-orange-500" />
                </div>
                <div>remark plugins</div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="size-4 text-orange-500" />
                </div>
                <div>rehype plugins</div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="size-4 text-orange-500" />
                </div>
                <div>rendered document</div>
              </div>
            </CardContent>
          </Card>
          <Card className="ring-1 ring-border/50">
            <CardHeader>
              <CardTitle className="text-base">Storage system</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm text-muted-foreground">
                <div>SQLite (sql.js WASM)</div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="size-4 text-orange-500" />
                </div>
                <div>IndexedDB</div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="size-4 text-orange-500" />
                </div>
                <div>browser storage</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center">
        <p className="text-m text-muted-foreground">
          Copyright &copy; 2026 Opsly MD
        </p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <LiveMarkdownDemo />
        <InterfaceOverview />
        <CorePrinciples />
        <Capabilities />
        <LocalStorageTransparency />
        <Architecture />
      </main>
      <Footer />
    </div>
  );
}

import Link from "next/link";
import { HeaderLogo } from "@/components/HeaderLogo";
import { GitHubIcon } from "@/components/GitHubIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GITHUB_URL = "https://github.com/iaminci/opsly-md";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/roadmap", label: "Roadmap" },
] as const;

export function SiteHeader() {
  return (
    <header className="w-full border-b-2 border-border">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
        <Link
          href="/"
          aria-label="Opsly MD"
          className="flex min-w-0 items-center leading-none no-underline hover:opacity-90"
        >
          <HeaderLogo className="h-8 w-auto shrink-0 sm:h-10" />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="neutral"
                size="icon-sm"
                className="bg-background text-foreground hover:text-foreground"
                asChild
              >
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on GitHub"
                >
                  <GitHubIcon className="size-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              View on GitHub
            </TooltipContent>
          </Tooltip>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

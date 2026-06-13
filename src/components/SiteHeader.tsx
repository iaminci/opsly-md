import Link from "next/link";
import { HeaderLogo } from "@/components/HeaderLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const APP_URL = "/app?loadSample=1";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#use-cases", label: "Use Cases" },
  { href: "/app", label: "Docs" },
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

import { HeaderLogo } from "@/components/HeaderLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Minimal product header. Sits in the `LandingPage` content column; bottom
 * border is only as wide as that column, not the viewport. Same hairline as
 * the footer and `MarkdownSection` dividers.
 */
export function SiteHeader() {
  return (
    <header className="w-full border-b-2 border-border">
      <div className="flex min-h-16 items-center justify-between gap-4 py-2">
        <a
          href="/"
          aria-label="Opsly MD"
          className="flex min-w-0 items-center leading-none no-underline hover:opacity-90"
        >
          <HeaderLogo className="h-8 w-auto shrink-0 sm:h-12" />
        </a>
        <nav className="flex items-center gap-4">
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

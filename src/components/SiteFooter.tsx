import Link from "next/link";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/iaminci/opsly-md";

const footerLinks = [
  { href: GITHUB_URL, label: "GitHub", external: true },
] as const;

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn("mt-auto border-t-2 border-border", className)}>
      <div className="grid gap-8 py-6 text-muted-foreground sm:grid-cols-3 sm:items-center sm:gap-6 sm:py-8">
        <p>Opsly MD</p>
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

import Link from "next/link";

const GITHUB_URL = "https://github.com/iaminci/opsly-md";

const footerLinks = [
  { href: GITHUB_URL, label: "GitHub", external: true },
] as const;

export function SiteFooter() {
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

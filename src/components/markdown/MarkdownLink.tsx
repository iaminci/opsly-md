import { ExternalLink } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  if (href.startsWith("#") || href.startsWith("/") || href.startsWith("mailto:")) {
    return false;
  }
  return /^https?:\/\//i.test(href) || href.startsWith("//");
}

interface MarkdownLinkProps extends ComponentProps<"a"> {
  href?: string;
  className?: string;
  children?: ReactNode;
}

export function MarkdownLink({ href, className, children, ...props }: MarkdownLinkProps) {
  const external = isExternalHref(href);

  return (
    <a
      href={href}
      className={cn(external && "markdown-external-link", className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
      {external ? (
        <>
          <ExternalLink className="markdown-external-link-icon" strokeWidth={2} aria-hidden />
          <span className="sr-only"> (opens in new tab)</span>
        </>
      ) : null}
    </a>
  );
}

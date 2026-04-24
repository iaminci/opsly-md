import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

interface LandingPageProps {
  children: React.ReactNode;
}

/**
 * Site shell for the homepage. One max-width column wraps header, main, and
 * footer so horizontal rules (header, section dividers, footer) are the same
 * width and inset from the viewport, not full-bleed.
 */
export function LandingPage({ children }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/*
        Single content column: all horizontal lines (header border, section
        dividers, footer border) share this width and stop short of the
        viewport edges — not full-bleed.
      */}
      <div className="mx-auto w-full max-w-[960px] px-6 sm:px-8">
        <SiteHeader />
        <main className="pt-8 sm:pt-10">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

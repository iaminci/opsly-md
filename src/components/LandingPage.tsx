import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ThemeToggleHomepage } from "@/components/ThemeToggle";

interface LandingPageProps {
  content: string;
}

export function LandingPage({ content }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggleHomepage />
      </div>
      <div className="mx-auto max-w-[860px] px-6 py-12 sm:px-8 sm:py-16">
        <MarkdownRenderer content={content} ctaLinks />
      </div>
    </div>
  );
}

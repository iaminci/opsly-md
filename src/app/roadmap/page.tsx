import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RoadmapPage } from "@/components/roadmap/RoadmapPage";

const title = "Roadmap — Opsly MD";
const description =
  "What Opsly MD ships today, what is in progress, and what is planned next.";

const ogImage = "/favicon-64.png";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/roadmap",
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/roadmap",
    images: [{ url: ogImage, width: 64, height: 64, alt: "Opsly MD" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: [ogImage],
  },
};

const PAGE_CONTAINER =
  "mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-10 xl:px-12";

export default function RoadmapRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className={`${PAGE_CONTAINER} flex flex-1 flex-col`}>
        <SiteHeader />
        <main className="flex flex-1 flex-col">
          <RoadmapPage />
          <SiteFooter />
        </main>
      </div>
    </div>
  );
}

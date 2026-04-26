import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { LandingPage } from "@/components/LandingPage";
import { MarkdownSection } from "@/components/MarkdownSection";

const homeTitle = "Opsly MD — A local-first Markdown workspace.";
const homeDescription =
  "Runs entirely in your browser — no accounts, no servers, no tracking.";

const ogImage = "/favicon-64.png";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    type: "website",
    url: "/",
    images: [{ url: ogImage, width: 64, height: 64, alt: "Opsly MD" }],
  },
  twitter: {
    card: "summary",
    title: homeTitle,
    description: homeDescription,
    images: [ogImage],
  },
};

export default function Home() {
  return (
    <LandingPage>
      <Hero />
      <MarkdownSection file="what-you-can-do.md" />
      <MarkdownSection file="why.md" />
      <MarkdownSection file="who-this-is-for.md" />
      <MarkdownSection file="what-it-feels-like.md" />
      <MarkdownSection file="how-it-works.md" />
    </LandingPage>
  );
}

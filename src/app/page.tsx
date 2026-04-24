import { Hero } from "@/components/Hero";
import { LandingPage } from "@/components/LandingPage";
import { MarkdownSection } from "@/components/MarkdownSection";

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

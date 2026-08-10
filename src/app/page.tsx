import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroFeatureStack } from "@/components/HeroFeatureStack";
import { Button } from "@/components/ui/button";
import "@/styles/home-editorial.css";

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

const APP_URL = "/app";

const HOME_CONTAINER =
  "mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-10 xl:px-12";

export default function Home() {
  return (
    <div className="home-page flex min-h-screen flex-col text-foreground">
      <div className={`${HOME_CONTAINER} flex flex-1 flex-col`}>
        <SiteHeader />
        <main className="flex-1">
          <section className="grid items-center gap-10 border-b-2 border-border py-14 sm:gap-12 sm:py-16 lg:min-h-[min(100svh-5rem,44rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:py-16 xl:gap-16">
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="font-heading text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-foreground">
                Your Knowledge
                <br />
                <span className="mt-1 inline-block bg-primary px-2 py-0.5 text-primary-foreground">
                  In plain text.
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
                Notes, documentation, and structured knowledge in a
                Markdown-first workspace.
              </p>
              <div className="mt-8 sm:mt-10">
                <Button
                  variant="default"
                  size="lg"
                  className="shadow-reverted hover:bg-primary-hover hover:text-black"
                  asChild
                >
                  <Link href={APP_URL}>
                    Start Writing
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <HeroFeatureStack className="min-w-0" />
          </section>

          <section
            className="home-idea"
            aria-labelledby="idea-heading"
          >
            <div className="home-idea__layout">
              <div className="home-idea__aside">
                <div
                  className="home-idea__workspace"
                  aria-hidden="true"
                >
                  <div className="home-idea__tree">
                    <p className="home-idea__tree-root">OPSLY MD</p>
                    <ul className="home-idea__tree-list">
                      <li className="home-idea__tree-folder">
                        <span className="home-idea__tree-label">projects</span>
                        <ul>
                          <li className="home-idea__tree-active">
                            architecture.md
                          </li>
                          <li>decisions.md</li>
                        </ul>
                      </li>
                      <li className="home-idea__tree-folder">
                        <span className="home-idea__tree-label">notes</span>
                        <ul>
                          <li>ideas.md</li>
                          <li>meeting-notes.md</li>
                        </ul>
                      </li>
                      <li>README.md</li>
                    </ul>
                  </div>
                  <div className="home-idea__doc">
                    <p className="home-idea__doc-title">Architecture</p>
                    <p className="home-idea__doc-h2">Overview</p>
                    <p className="home-idea__doc-body">
                      The system consists of three main components…
                    </p>
                    <p className="home-idea__doc-h2">Decisions</p>
                    <ul className="home-idea__doc-list">
                      <li>Keep the workspace simple</li>
                      <li>Store documents as Markdown</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="home-idea__primary">
                <p className="home-idea__eyebrow">The idea</p>
                <h2 id="idea-heading" className="home-idea__statement">
                  A simple place for your knowledge.
                </h2>
                <p className="home-idea__support">
                  Opsly MD brings writing, organization, and Markdown together in
                  one focused workspace.
                </p>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkTreeStructure } from "@/lib/remark-tree-structure";
import { remarkCodeBlockLang } from "@/lib/remark-code-block-lang";
import {
  buildHeadingIdQueueMap,
  buildHeadingManifest,
  takeNextHeadingId,
} from "@/lib/heading-manifest";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn, normalizeInvalidAtxParagraphBreaks, reactNodeToPlainText } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { MermaidDiagram } from "./MermaidDiagram";
import type { Components } from "react-markdown";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.min.css";

interface MarkdownRendererProps {
  content: string;
  /**
   * When true, links are classified into CTA buttons by `href`:
   * - `/app*` → primary button
   * - any `github.com` URL → secondary button
   * Used on the homepage only so user document rendering is unaffected.
   */
  ctaLinks?: boolean;
}

function isMermaidCode(lang: string | undefined): boolean {
  return lang?.toLowerCase() === "mermaid";
}

function classifyCtaLink(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href.startsWith("/app")) return "cta cta-primary text-background";
  if (/(^https?:)?\/\/([^/]+\.)?github\.com\//i.test(href)) {
    return "cta cta-secondary";
  }
  return undefined;
}

export function MarkdownRenderer({ content, ctaLinks = false }: MarkdownRendererProps) {
  const normalizedContent = useMemo(
    () => normalizeInvalidAtxParagraphBreaks(content),
    [content]
  );
  const manifest = useMemo(
    () => buildHeadingManifest(normalizedContent),
    [normalizedContent]
  );
  const idQueueMap = useMemo(() => buildHeadingIdQueueMap(manifest), [manifest]);
  /** Fresh each render so heading id assignment never reuses counts from a prior render. */
  const consumedIdsRef = useRef(new Map<string, number>());
  consumedIdsRef.current = new Map();

  const components: Components = useMemo(
    () => ({
      a({ href, className, children, ...props }) {
        const ctaClass = ctaLinks ? classifyCtaLink(href) : undefined;
        return (
          <a
            href={href}
            className={cn(className, ctaClass)}
            {...props}
          >
            {children}
          </a>
        );
      },
      code({ node, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className ?? "");
        const lang = match?.[1];
        const code = reactNodeToPlainText(children).replace(/\n$/, "");
        // Block: has language class, or contains newlines (fenced block without language)
        const isBlock =
          Boolean(className?.includes("language-")) || /\n/.test(code);

        if (isBlock && isMermaidCode(lang)) {
          return <MermaidDiagram chart={code} />;
        }

        if (isBlock) {
          return (
            <CodeBlock className={className} node={node} {...props}>
              {children}
            </CodeBlock>
          );
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      pre({ children }) {
        return <>{children}</>;
      },
      h1: ({ id: idProp, children, node: _node, ...rest }) => {
        const id =
          (typeof idProp === "string" && idProp) ||
          takeNextHeadingId(
            1,
            reactNodeToPlainText(children),
            idQueueMap,
            consumedIdsRef.current
          );
        return (
          <h1 id={id} {...rest}>
            {children}
          </h1>
        );
      },
      h2: ({ children }) => {
        const id = takeNextHeadingId(
          2,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return <h2 id={id}>{children}</h2>;
      },
      h3: ({ children }) => {
        const id = takeNextHeadingId(
          3,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return <h3 id={id}>{children}</h3>;
      },
      h4: ({ children }) => {
        const id = takeNextHeadingId(
          4,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return <h4 id={id}>{children}</h4>;
      },
      h5: ({ children }) => {
        const id = takeNextHeadingId(
          5,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return <h5 id={id}>{children}</h5>;
      },
      h6: ({ children }) => {
        const id = takeNextHeadingId(
          6,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return <h6 id={id}>{children}</h6>;
      },
    }),
    [idQueueMap, ctaLinks]
  );

  return (
    <article
      className={cn(
        "prose prose-zinc dark:prose-invert max-w-none min-w-0 break-words",
        "[&_h1]:!text-foreground [&_h2]:!text-foreground [&_h3]:!text-foreground",
        "[&_h4]:!text-foreground [&_h5]:!text-foreground [&_h6]:!text-foreground",
        "[&_p]:!text-foreground [&_ul]:!text-foreground [&_ol]:!text-foreground [&_li]:!text-foreground",
        /* Caution blockquotes: p/li must stay destructive (beats [&_p]:!text-foreground) */
        "[&_blockquote_p]:!text-destructive [&_blockquote_li]:!text-destructive",
        "[&_strong]:!text-foreground [&_em]:!text-foreground",
        "[&_blockquote_strong]:!text-inherit [&_blockquote_em]:!text-inherit",
        "[&_figcaption]:!text-foreground [&_th]:!text-foreground [&_td]:!text-muted-foreground",
        /* Links default to primary; exclude `.cta` so homepage CTAs can use cta-primary / cta-secondary colors */
        "[&_a:not(.cta)]:!text-primary"
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkCodeBlockLang, remarkTreeStructure]}
        rehypePlugins={[
          rehypeKatex,
          [rehypeHighlight, { plainText: ["text", "plaintext", "txt", "tree"] }],
          rehypeRaw,
        ]}
        components={components}
      >
        {normalizedContent}
      </ReactMarkdown>
    </article>
  );
}

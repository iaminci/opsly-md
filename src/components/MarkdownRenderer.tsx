"use client";

import { useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkTreeStructure } from "@/lib/remark-tree-structure";
import { remarkCodeBlockLang } from "@/lib/remark-code-block-lang";
import { buildHeadingManifest, slugifyHeadingText } from "@/lib/heading-manifest";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { normalizeInvalidAtxParagraphBreaks, reactNodeToPlainText } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { MermaidDiagram } from "./MermaidDiagram";
import type { Components } from "react-markdown";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.min.css";

interface MarkdownRendererProps {
  content: string;
}

function isMermaidCode(lang: string | undefined): boolean {
  return lang?.toLowerCase() === "mermaid";
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const normalizedContent = useMemo(
    () => normalizeInvalidAtxParagraphBreaks(content),
    [content]
  );
  const manifest = useMemo(
    () => buildHeadingManifest(normalizedContent),
    [normalizedContent]
  );
  const headingIndexRef = useRef(0);
  headingIndexRef.current = 0;

  const components: Components = useMemo(
    () => ({
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
      h1: ({ children }) => {
        const entry = manifest[headingIndexRef.current++];
        const id =
          entry?.id ?? slugifyHeadingText(reactNodeToPlainText(children));
        return <h1 id={id}>{children}</h1>;
      },
      h2: ({ children }) => {
        const entry = manifest[headingIndexRef.current++];
        const id =
          entry?.id ?? slugifyHeadingText(reactNodeToPlainText(children));
        return <h2 id={id}>{children}</h2>;
      },
      h3: ({ children }) => {
        const entry = manifest[headingIndexRef.current++];
        const id =
          entry?.id ?? slugifyHeadingText(reactNodeToPlainText(children));
        return <h3 id={id}>{children}</h3>;
      },
      h4: ({ children }) => {
        const entry = manifest[headingIndexRef.current++];
        const id =
          entry?.id ?? slugifyHeadingText(reactNodeToPlainText(children));
        return <h4 id={id}>{children}</h4>;
      },
      h5: ({ children }) => {
        const entry = manifest[headingIndexRef.current++];
        const id =
          entry?.id ?? slugifyHeadingText(reactNodeToPlainText(children));
        return <h5 id={id}>{children}</h5>;
      },
      h6: ({ children }) => {
        const entry = manifest[headingIndexRef.current++];
        const id =
          entry?.id ?? slugifyHeadingText(reactNodeToPlainText(children));
        return <h6 id={id}>{children}</h6>;
      },
    }),
    [manifest]
  );

  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none">
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

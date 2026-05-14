"use client";

import { useMemo, useRef, type ComponentProps, createElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
  OPSLY_MASK_DATA_ATTR,
  SecureBlock,
  createSafeCodeComponent,
  type MarkdownCodeProps,
  opslyMaskRemarkPlugins,
  opslyMaskRemarkRehypeOptions,
} from "opsly-mask";
import { remarkTreeStructure } from "@/lib/remark-tree-structure";
import { remarkCodeBlockLang } from "@/lib/remark-code-block-lang";
import { remarkPrettyJsonBlocks } from "@/lib/remark-pretty-json-blocks";
import {
  buildHeadingIdQueueMap,
  buildHeadingManifest,
  takeNextHeadingId,
} from "@/lib/heading-manifest";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as RehypeSanitizeSchema } from "rehype-sanitize";
import { cn, normalizeInvalidAtxParagraphBreaks, reactNodeToPlainText } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import {
  FENCED_CODE_INNER_CODE_CLASSNAME,
  SecureFenceExtrasContext,
  SecureFencePreChrome,
} from "./secure-fence";
import { MermaidDiagram } from "./MermaidDiagram";
import type { Components } from "react-markdown";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.min.css";

/**
 * After `rehype-raw`, prose like `std::vector<int>` becomes fake HTML elements (`vector`, `int`, …)
 * that React rejects. `rehype-sanitize` unwraps unknown tags into text and strips unsafe attrs.
 * Schema extensions: KaTeX (span styles, optional SVG), highlight.js (spans), homepage `hero.md` (div.cta-row).
 * Heading `id` is not clobber-prefixed so TOC/hash links stay stable.
 */
const markdownRehypeSanitizeSchema: RehypeSanitizeSchema = {
  ...defaultSchema,
  clobber: (defaultSchema.clobber ?? []).filter((p) => p !== "id" && p !== "name"),
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
    div: [...(defaultSchema.attributes?.div ?? []), "className", "dataOpslyMask"],
    span: ["className", "style"],
    svg: [
      "xmlns",
      "width",
      "height",
      "viewBox",
      "preserveAspectRatio",
      "className",
      "style",
      "fill",
      "stroke",
      "strokeLinecap",
      "strokeLinejoin",
      "strokeWidth",
      "ariaHidden",
      "focusable",
    ],
    path: ["d", "className", "style", "fill", "stroke", "strokeLinecap", "strokeLinejoin", "strokeWidth"],
    g: ["className", "style"],
    line: ["x1", "y1", "x2", "y2", "className", "style"],
    rect: ["x", "y", "width", "height", "className", "style"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "svg",
    "path",
    "g",
    "line",
    "polyline",
    "polygon",
    "circle",
    "ellipse",
    "rect",
  ],
};

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

function isSecureFenceHostDiv(props: object): boolean {
  const p = props as Record<string, unknown>;
  const set = (v: unknown) => v !== undefined && v !== false && v !== null;
  const camel = p.dataOpslyMask;
  const hyphen = p[OPSLY_MASK_DATA_ATTR];
  return set(camel) || set(hyphen);
}

/**
 * Mirrors opsly-mask's createOpslyMarkdownComponents, wires ```secure``` to {@link SecureFencePreChrome},
 * Copy text is supplied via {@link SecureFenceExtrasContext} on the fenced-body host `div`.
 */
function mergeOpslyMarkdownComponentsWithSecureCopy(base: Components | undefined): Components {
  const userDiv = base?.div;
  const userPre = base?.pre;
  const rawCode = base?.code;
  const safeCode = createSafeCodeComponent(rawCode, userPre);

  return {
    ...(base ?? {}),
    code: safeCode,
    div(props) {
      const { className, children, ...rest } = props;
      if (isSecureFenceHostDiv(props)) {
        const copyPlain = reactNodeToPlainText(children).replace(/\n$/, "");
        return (
          <SecureFenceExtrasContext.Provider value={{ copyPlain }}>
            <SecureBlock pre={SecureFencePreChrome} code={safeCode}>
              {children}
            </SecureBlock>
          </SecureFenceExtrasContext.Provider>
        );
      }
      if (typeof userDiv === "function") {
        const Comp = userDiv;
        return (
          <Comp className={className} {...rest}>
            {children}
          </Comp>
        );
      }
      if (typeof userDiv === "string") {
        return createElement(userDiv, { className, ...rest }, children);
      }
      return (
        <div className={className} {...rest}>
          {children}
        </div>
      );
    },
  };
}

export function MarkdownRenderer({ content, ctaLinks = false }: MarkdownRendererProps) {
  /** Same normalization pipeline as TOC (`buildHeadingManifest` normalizes again; cheap and idempotent). */
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

  const baseComponents = useMemo(
    (): Components => ({
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
      code(codeProps: MarkdownCodeProps) {
        const { node, className, children, inline, ...props } = codeProps;
        void inline;
        const match = /language-(\w+)/.exec(className ?? "");
        const lang = match?.[1];
        const code = reactNodeToPlainText(children).replace(/\n$/, "");
        // Block: has language class, or contains newlines (fenced block without language)
        const isBlock =
          Boolean(className?.includes("language-")) || /\n/.test(code);

        if (isBlock && isMermaidCode(lang)) {
          return <MermaidDiagram chart={code} />;
        }

        /* Secure fences: identical inner surface to {@link CodeBlock} / hljs fences. */
        if (isBlock && lang?.toLowerCase() === "secure") {
          return (
            <code
              className={cn(FENCED_CODE_INNER_CODE_CLASSNAME, className)}
              {...props}
            >
              {children}
            </code>
          );
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
      pre(props: ComponentProps<"pre"> & { "data-opsly-mask"?: boolean }) {
        if (props["data-opsly-mask"]) {
          return <SecureFencePreChrome {...props} />;
        }
        return <>{props.children}</>;
      },
      h1: ({ id: idProp, children, node, ...rest }) => {
        void node;
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

  const components = useMemo(() => mergeOpslyMarkdownComponentsWithSecureCopy(baseComponents), [baseComponents]);

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
        remarkPlugins={[
          remarkGfm,
          ...opslyMaskRemarkPlugins.slice(1),
          remarkMath,
          remarkCodeBlockLang,
          remarkPrettyJsonBlocks,
          remarkTreeStructure,
        ]}
        remarkRehypeOptions={opslyMaskRemarkRehypeOptions()}
        rehypePlugins={[
          rehypeKatex,
          [rehypeHighlight, { plainText: ["text", "plaintext", "txt", "tree"] }],
          rehypeRaw,
          [rehypeSanitize, markdownRehypeSanitizeSchema],
        ]}
        components={components}
      >
        {normalizedContent}
      </ReactMarkdown>
    </article>
  );
}

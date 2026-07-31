"use client";

import { useMemo, useRef, type ComponentProps, type RefObject, createElement } from "react";
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
import { useDocumentSearchHighlight } from "@/hooks/useDocumentSearchHighlight";
import { cn, normalizeInvalidAtxParagraphBreaks, reactNodeToPlainText } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { HeadingAnchor } from "./markdown/HeadingAnchor";
import { MarkdownLink } from "./markdown/MarkdownLink";
import { InteractiveFormInput } from "./markdown/InteractiveFormInput";
import {
  collectFormControls,
  toggleFormControl,
} from "@/lib/markdown-form-controls";
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
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      "checked",
      "name",
      "value",
      ["type", "checkbox", "radio"],
    ],
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
  /** Active sidebar search query; highlights prose matches when set. */
  searchQuery?: string;
  /** Index of the match styled as active (for jump-to-match / future next/prev). */
  activeMatchIndex?: number;
  articleRef?: RefObject<HTMLElement | null>;
  onMatchCountChange?: (count: number) => void;
  /** When set, GFM task-list checkboxes and HTML checkbox/radio inputs update source. */
  onContentChange?: (content: string, edit?: { startOffset: number; endOffset: number; replacement: string }) => void;
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

export function MarkdownRenderer({
  content,
  ctaLinks = false,
  searchQuery = "",
  activeMatchIndex = 0,
  articleRef: articleRefProp,
  onMatchCountChange,
  onContentChange,
}: MarkdownRendererProps) {
  const internalArticleRef = useRef<HTMLElement>(null);
  const articleRef = articleRefProp ?? internalArticleRef;

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

  const formControls = useMemo(
    () => collectFormControls(normalizedContent),
    [normalizedContent]
  );
  const formControlIndexRef = useRef(0);
  formControlIndexRef.current = 0;

  const handleFormControlToggle = useMemo(() => {
    if (!onContentChange) return undefined;
    return (controlIndex: number) => {
      const result = toggleFormControl(
        normalizedContent,
        controlIndex,
        formControls
      );
      if (!result) return;
      onContentChange(result.content, result.edit);
    };
  }, [formControls, normalizedContent, onContentChange]);

  const interactiveFormControls = Boolean(onContentChange);

  const baseComponents = useMemo(
    (): Components => ({
      a({ href, className, children, ...props }) {
        const ctaClass = ctaLinks ? classifyCtaLink(href) : undefined;
        if (ctaClass) {
          return (
            <a href={href} className={cn(className, ctaClass)} {...props}>
              {children}
            </a>
          );
        }
        return (
          <MarkdownLink href={href} className={className} {...props}>
            {children}
          </MarkdownLink>
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

        /* Secure block: identical inner surface to {@link CodeBlock} / hljs fences. */
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
        void rest;
        const id =
          (typeof idProp === "string" && idProp) ||
          takeNextHeadingId(
            1,
            reactNodeToPlainText(children),
            idQueueMap,
            consumedIdsRef.current
          );
        return (
          <HeadingAnchor level={1} id={id}>
            {children}
          </HeadingAnchor>
        );
      },
      h2: ({ children }) => {
        const id = takeNextHeadingId(
          2,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return (
          <HeadingAnchor level={2} id={id}>
            {children}
          </HeadingAnchor>
        );
      },
      h3: ({ children }) => {
        const id = takeNextHeadingId(
          3,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return (
          <HeadingAnchor level={3} id={id}>
            {children}
          </HeadingAnchor>
        );
      },
      h4: ({ children }) => {
        const id = takeNextHeadingId(
          4,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return (
          <HeadingAnchor level={4} id={id}>
            {children}
          </HeadingAnchor>
        );
      },
      h5: ({ children }) => {
        const id = takeNextHeadingId(
          5,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return (
          <HeadingAnchor level={5} id={id}>
            {children}
          </HeadingAnchor>
        );
      },
      h6: ({ children }) => {
        const id = takeNextHeadingId(
          6,
          reactNodeToPlainText(children),
          idQueueMap,
          consumedIdsRef.current
        );
        return (
          <HeadingAnchor level={6} id={id}>
            {children}
          </HeadingAnchor>
        );
      },
      table({ children, ...props }) {
        return (
          <div className="markdown-table-wrap markdown-wide not-prose">
            <table {...props}>{children}</table>
          </div>
        );
      },
      input({ type, checked, disabled, name, className, node, ...props }) {
        void node;
        const isFormControl = type === "checkbox" || type === "radio";

        if (
          isFormControl &&
          interactiveFormControls &&
          handleFormControlToggle
        ) {
          const controlIndex = formControlIndexRef.current;
          formControlIndexRef.current += 1;

          return (
            <InteractiveFormInput
              type={type}
              checked={checked}
              disabled={disabled}
              name={name}
              className={className}
              controlIndex={controlIndex}
              interactive
              onFormControlToggle={handleFormControlToggle}
              {...props}
            />
          );
        }

        return (
          <input
            type={type}
            checked={checked}
            disabled={disabled}
            name={name}
            className={className}
            {...props}
          />
        );
      },
      li({ className, children, ...props }) {
        const isTaskItem =
          typeof className === "string" && className.includes("task-list-item");

        if (
          isTaskItem &&
          interactiveFormControls &&
          handleFormControlToggle
        ) {
          const controlIndex = formControlIndexRef.current;

          return (
            <li
              className={cn(className, "markdown-task-list-item--interactive")}
              onClick={(event) => {
                if (event.target instanceof HTMLInputElement) return;
                handleFormControlToggle(controlIndex);
              }}
              {...props}
            >
              {children}
            </li>
          );
        }

        return (
          <li className={className} {...props}>
            {children}
          </li>
        );
      },
    }),
    [idQueueMap, ctaLinks, handleFormControlToggle, interactiveFormControls]
  );

  const components = useMemo(() => mergeOpslyMarkdownComponentsWithSecureCopy(baseComponents), [baseComponents]);

  const searchMountKey = searchQuery.trim()
    ? `${normalizedContent}\0${searchQuery}`
    : normalizedContent;

  useDocumentSearchHighlight(articleRef, {
    searchQuery,
    activeMatchIndex,
    mountKey: searchMountKey,
    enabled: searchQuery.trim().length > 0,
    onMatchCountChange,
  });

  return (
    <article
      ref={articleRef}
      className={cn(
        "markdown-content prose prose-zinc dark:prose-invert mx-auto min-w-0 w-full break-words"
      )}
    >
      <ReactMarkdown
        key={searchMountKey}
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

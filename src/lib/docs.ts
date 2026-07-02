import {
  HOME_MARKDOWN_PREVIEW,
  SAMPLE_MARKDOWN,
} from "@/lib/sample-document";

export const DOCS_PAGE = {
  title: "Documentation",
  intro: [
    "Live examples of Markdown rendering in Opsly MD.",
    "This page mirrors the sample documents shipped with the app.",
  ],
} as const;

export type DocsSectionData = {
  id: string;
  content: string;
};

export const DOCS_SECTIONS: DocsSectionData[] = [
  { id: "welcome", content: SAMPLE_MARKDOWN },
  { id: "renderer-preview", content: HOME_MARKDOWN_PREVIEW },
];

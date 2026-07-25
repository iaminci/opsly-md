import { Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeadingAnchorProps {
  level: HeadingLevel;
  id?: string;
  children: ReactNode;
}

const HEADING_TAGS: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4" | "h5" | "h6"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
};

export function HeadingAnchor({ level, id, children }: HeadingAnchorProps) {
  const Tag = HEADING_TAGS[level];

  return (
    <Tag id={id} className={cn(id && "heading-anchor")}>
      {children}
      {id ? (
        <a
          href={`#${id}`}
          className="heading-anchor-link"
          aria-label="Link to this section"
        >
          <Link2 className="heading-anchor-link-icon" strokeWidth={2} aria-hidden />
        </a>
      ) : null}
    </Tag>
  );
}

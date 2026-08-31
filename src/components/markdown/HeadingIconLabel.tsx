import {
  AlertTriangle,
  Blocks,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderTree,
  Handshake,
  Hammer,
  Lightbulb,
  LockKeyhole,
  Mail,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Wrench,
  ChartNoAxesColumn,
  type LucideIcon,
} from "lucide-react";
import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const HEADING_ICON_MAP: Array<[string, LucideIcon]> = [
  ["🏗️", Blocks],
  ["🏗", Blocks],
  ["🚀", Rocket],
  ["📧", Mail],
  ["🔄", RefreshCw],
  ["🔧", Wrench],
  ["📊", ChartNoAxesColumn],
  ["🛠️", Hammer],
  ["🛠", Hammer],
  ["🔍", Search],
  ["📋", ClipboardList],
  ["🤝", Handshake],
  ["📄", FileText],
  ["📁", FolderTree],
  ["⚙️", Settings],
  ["⚙", Settings],
  ["🔐", LockKeyhole],
  ["🔒", LockKeyhole],
  ["✅", CheckCircle2],
  ["⚠️", AlertTriangle],
  ["⚠", AlertTriangle],
  ["🧪", FlaskConical],
  ["💡", Lightbulb],
];

function matchHeadingIcon(text: string) {
  const leadingTrimmed = text.trimStart();
  for (const [emoji, Icon] of HEADING_ICON_MAP) {
    if (!leadingTrimmed.startsWith(emoji)) continue;
    return {
      Icon,
      text: leadingTrimmed.slice(emoji.length).trimStart(),
    };
  }
  return null;
}

export function HeadingIconLabel({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const match = matchHeadingIcon(text);
  if (!match) return <>{text}</>;

  const { Icon, text: cleanText } = match;
  return (
    <span className={cn("inline-flex min-w-0 items-baseline gap-1.5", className)}>
      <Icon className="size-[1em] shrink-0 self-center text-primary" strokeWidth={1.9} aria-hidden />
      <span>{cleanText}</span>
    </span>
  );
}

export function HeadingIconChildren({ children }: { children: ReactNode }) {
  const parts = Children.toArray(children);
  const textIndex = parts.findIndex((part) => typeof part === "string");
  if (textIndex === -1) return <>{children}</>;

  const match = matchHeadingIcon(parts[textIndex] as string);
  if (!match) return <>{children}</>;

  const { Icon, text } = match;
  parts[textIndex] = text;

  return (
    <>
      <Icon
        className="mr-[0.35em] inline-block size-[0.9em] align-[-0.06em] text-primary"
        strokeWidth={1.9}
        aria-hidden
      />
      {parts}
    </>
  );
}

import clsx, { type ClassValue } from "clsx";
import { twMerge, type ClassNameValue } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClassNameProp<TState = unknown> =
  | string
  | undefined
  | ((state: TState) => string | undefined);

/**
 * Merge static classes with Base UI `className`, which may be a function of component state.
 */
export function cnState<TState = unknown>(
  ...parts: [...ClassNameValue[], ClassNameProp<TState>]
): (state: TState) => string {
  const className = parts[parts.length - 1] as ClassNameProp<TState>;
  const bases = parts.slice(0, -1) as ClassNameValue[];
  return (state: TState) =>
    cn(
      ...bases,
      typeof className === "function" ? className(state) : className
    );
}

export function getFirstHeading(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].replace(/#+\s*$/, "").trim() : null;
}

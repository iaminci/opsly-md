import type { SVGProps } from "react";

/**
 * Wordmark logo used in the site header. Renders the `#OPSLY MD` mark as SVG
 * text in the theme's heading font (Fira Code) so the glyph follows light/dark
 * theme tokens and visually matches the surrounding header typography.
 */
export function HeaderLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 56"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      {...props}
    >
      <text
        x="0"
        y="44"
        fontFamily="var(--font-fira-code), ui-monospace, monospace"
        fontWeight="800"
        fontSize="48"
        letterSpacing="0"
      >
        <tspan fill="var(--primary)" fontStyle="italic">
          #
        </tspan>
        <tspan fill="var(--foreground)" dx="8">
          OPSLY
        </tspan>
        <tspan fill="var(--primary)" dx="12">
          MD
        </tspan>
      </text>
    </svg>
  );
}

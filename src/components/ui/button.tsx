"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Neo-brutalist motion + offset shadow (RetroUI-style) */
const brutalShell =
  "border-2 border-foreground shadow-[4px_4px_0_0_#000] transition-all duration-200 hover:translate-y-1 hover:shadow-md active:translate-y-2 active:translate-x-1 active:shadow-none dark:shadow-[4px_4px_0_0_#f5f5f5] dark:hover:shadow-md"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius)] bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: cn(
          brutalShell,
          "bg-primary text-primary-foreground hover:bg-primary-hover"
        ),
        secondary: cn(
          brutalShell,
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover"
        ),
        outline: cn(
          brutalShell,
          "border-foreground bg-background text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30"
        ),
        ghost:
          "border-2 border-transparent hover:bg-accent hover:text-accent-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive: cn(
          brutalShell,
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-destructive/30"
        ),
        link: "border-transparent bg-transparent text-primary underline-offset-4 shadow-none hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 py-2 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-[min(var(--radius-md),10px)] px-3 py-1 text-xs in-data-[slot=button-group]:rounded-[var(--radius)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3.5 py-1.5 text-[0.8rem] in-data-[slot=button-group]:rounded-[var(--radius)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-5 py-2.5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10 p-2",
        "icon-xs":
          "size-8 rounded-[min(var(--radius-md),10px)] p-1.5 in-data-[slot=button-group]:rounded-[var(--radius)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-[min(var(--radius-md),12px)] p-2 in-data-[slot=button-group]:rounded-[var(--radius)]",
        "icon-lg": "size-11 p-2.5",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        class: "h-auto min-h-0 px-0 py-0 hover:translate-y-0 active:translate-y-0 active:translate-x-0",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={(state) =>
        cn(
          buttonVariants({ variant, size }),
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  )
}

export { Button, buttonVariants }

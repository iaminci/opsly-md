"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronRight } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item> & {
  variant?: "default" | "nested"
}) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      data-variant={variant}
      className={cn(
        "border-none shadow-none",
        variant === "nested" && "pl-0",
        className
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  triggerVariant,
  isActive,
  hideTriggerChevron = false,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  triggerVariant?: "section" | "tree"
  isActive?: boolean
  /** When true, the default trailing chevron is omitted (e.g. chevron lives inside a custom first control). */
  hideTriggerChevron?: boolean
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "min-w-0 flex flex-1 items-center gap-2.5 text-left text-base border-border focus-visible:ring-[3px] rounded-base transition-all [&[data-state=open]>svg:last-child]:rotate-90 disabled:pointer-events-none disabled:opacity-50",
          triggerVariant === "section" && !isActive && "text-muted-foreground p-2 hover:bg-sidebar-accent font-normal",
          triggerVariant === "section" && isActive && "bg-sidebar-accent text-primary p-2 border-2 border-border hover:bg-sidebar-accent",
          triggerVariant === "tree" && !isActive && "bg-transparent text-muted-foreground font-normal p-1 hover:bg-sidebar-accent",
          triggerVariant === "tree" && isActive && "bg-transparent text-primary p-1 hover:bg-sidebar-accent",
          !triggerVariant && "bg-transparent text-muted-foreground font-normal p-1.5 hover:bg-sidebar-accent",
          className,
        )}
        {...props}
      >
        {children}
        {!hideTriggerChevron ? (
          <ChevronRight className="pointer-events-none size-5 shrink-0 transition-transform duration-200" />
        ) : null}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden bg-transparent text-sm font-normal transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down [&[data-state=open]]:overflow-visible"
      {...props}
    >
      <div className={cn("p-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
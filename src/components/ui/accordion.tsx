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
        variant === "nested" && "border-l border-sidebar-border pl-2",
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
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  triggerVariant?: "section" | "tree"
  isActive?: boolean
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "min-w-0 flex flex-1 items-center justify-between text-left text-base border-border focus-visible:ring-[3px] rounded-base transition-all [&[data-state=open]>svg]:rotate-90 disabled:pointer-events-none disabled:opacity-50",
          className,
          triggerVariant === "section" && !isActive && "bg-muted text-sidebar-foreground font-heading font-bold p-2",
          triggerVariant === "section" && isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-heading font-bold p-2 border-2 border-border",
          triggerVariant === "tree" && !isActive && "bg-transparent text-sidebar-foreground font-base p-1",
          triggerVariant === "tree" && isActive && "bg-transparent text-sidebar-primary font-base p-1",
          !triggerVariant && "bg-transparent text-sidebar-foreground font-base p-1.5",
        )}
        {...props}
      >
        {children}
        <ChevronRight className="pointer-events-none size-5 shrink-0 transition-transform duration-200" />
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
      className="overflow-hidden bg-transparent text-sm font-base transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("p-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
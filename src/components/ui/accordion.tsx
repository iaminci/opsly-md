"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import * as React from "react"

import { cn } from "@/lib/utils"

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col gap-0", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item> & {
  variant?: "default" | "nested"
}) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      data-variant={variant}
      className={cn(
        "overflow-visible border-0 bg-transparent shadow-none",
        variant === "default" && "mb-1.5 last:mb-0",
        variant === "nested" && "mb-0 last:mb-0",
        className,
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  triggerVariant = "section",
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  triggerVariant?: "section" | "tree"
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        data-trigger-variant={triggerVariant}
        className={cn(
          "group flex min-h-10 w-full flex-1 items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm font-medium transition-colors",
          "text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50",
          triggerVariant === "section" && [
            "font-heading font-bold",
            "bg-sidebar-primary text-sidebar-primary-foreground shadow-none",
            "hover:brightness-[0.97]",
          ],
          triggerVariant === "tree" && [
            "bg-transparent hover:bg-sidebar-accent/40",
          ],
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn(
            "pointer-events-none ml-auto size-4 shrink-0 transition-transform duration-200",
            triggerVariant === "section" &&
              "-rotate-90 text-sidebar-primary-foreground group-data-[state=open]:rotate-0",
            triggerVariant === "tree" &&
              "-rotate-90 text-sidebar-foreground group-data-[state=open]:rotate-0",
          )}
        />
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
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div
        className={cn(
          "pb-1 text-sm font-medium leading-snug text-foreground",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

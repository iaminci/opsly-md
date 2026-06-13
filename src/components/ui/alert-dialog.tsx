"use client"

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Neo-brutalist panel — colors follow theme (`globals.css`: --popover, --border, --shadow). */
const alertDialogSurface =
  "border-2 border-border bg-popover text-popover-foreground shadow-shadow"

const alertDialogOverlayClasses =
  "fixed inset-0 isolate z-50 bg-black/20 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    data-slot="alert-dialog-overlay"
    className={cn(alertDialogOverlayClasses, className)}
    {...props}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    size?: "default" | "sm"
  }
>(({ className, size = "default", ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      data-slot="alert-dialog-content"
      data-size={size}
      className={cn(
        "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-full min-w-0 -translate-x-1/2 -translate-y-1/2 gap-4 overflow-x-hidden overflow-y-auto rounded-base px-5 pt-5 pb-6 pr-6 text-popover-foreground outline-none duration-100",
        "box-border max-h-[90dvh] overscroll-contain",
        alertDialogSurface,
        "data-[size=default]:max-w-md data-[size=sm]:max-w-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex min-w-0 flex-col gap-2 text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex w-full min-w-0 flex-row flex-wrap items-center justify-start gap-2 pt-1 sm:justify-end sm:gap-3",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-foreground *:[svg:not([class*='size-'])]:size-6",
        className
      )}
      {...props}
    />
  )
}

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    data-slot="alert-dialog-title"
    className={cn(
      "break-words text-lg font-bold leading-snug tracking-tight text-popover-foreground",
      className
    )}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    data-slot="alert-dialog-description"
    className={cn(
      "min-w-0 break-words text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-2 *:[a]:hover:text-foreground",
      className
    )}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

/** Same box model for Cancel + Action so heights always match (overrides size `py-*`). */
const alertDialogFooterButtonBase =
  "box-border h-10 min-h-10 max-h-10 shrink-0 !py-0"

const alertDialogActionClassName = cn(
  alertDialogFooterButtonBase,
  "border-2 border-border bg-background text-destructive shadow-shadow hover:!bg-main hover:text-black hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
)

const alertDialogCancelClassName = cn(
  alertDialogFooterButtonBase,
  "border-2 border-border !bg-background text-foreground shadow-shadow hover:!bg-background hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
)

function AlertDialogAction({
  className,
  variant = "ghost",
  size,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialogAction> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.AlertDialogAction asChild>
      <Button
        data-slot="alert-dialog-action"
        variant={variant}
        size={size}
        className={cn(alertDialogActionClassName, className)}
        {...props}
      />
    </AlertDialogPrimitive.AlertDialogAction>
  )
}

function AlertDialogCancel({
  className,
  variant = "neutral",
  size,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialogCancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.AlertDialogCancel asChild>
      <Button
        data-slot="alert-dialog-cancel"
        variant={variant}
        size={size}
        className={cn(alertDialogCancelClassName, className)}
        {...props}
      />
    </AlertDialogPrimitive.AlertDialogCancel>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}

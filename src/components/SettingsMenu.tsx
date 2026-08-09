"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  Download,
  Lock,
  MessageSquare,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeSettingsControl } from "@/components/ThemeSettingsControl";
import { openFeedbackForm } from "@/components/Feedback";
import { cn } from "@/lib/utils";

const settingsActionButtonClassName =
  "w-full min-w-0 justify-center rounded-md border-2 border-border text-primary shadow-none hover:border-border hover:bg-primary hover:text-black hover:translate-x-0 hover:translate-y-0";

interface SettingsMenuProps {
  onOpenChange?: (open: boolean) => void;
  documentStackEnabled: boolean;
  onDocumentStackEnabledChange: (enabled: boolean) => void;
  workspacesEnabled: boolean;
  onWorkspacesEnabledChange: (enabled: boolean) => void;
  onImport: () => void;
  onExport: (mode: "plain" | "encrypted") => void;
  onDeleteAll: () => void;
  deleteLabel: string;
}

function SettingsSection({
  title,
  children,
  className,
  titleClassName,
  contentClassName,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      <h3
        className={cn(
          "text-xs font-heading uppercase tracking-wide text-muted-foreground",
          titleClassName,
        )}
      >
        {title}
      </h3>
      <div className={cn("mt-3", contentClassName)}>{children}</div>
    </section>
  );
}

export function SettingsMenu({
  onOpenChange,
  documentStackEnabled,
  onDocumentStackEnabledChange,
  workspacesEnabled,
  onWorkspacesEnabledChange,
  onImport,
  onExport,
  onDeleteAll,
  deleteLabel,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [exportOptionsOpen, setExportOptionsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverOffset, setPopoverOffset] = useState({ side: 16, align: -8 });

  const updatePopoverOffset = useCallback(() => {
    const trigger = triggerRef.current;
    const mainContent = document.querySelector('[data-slot="sidebar-inset"]');
    if (!trigger || !mainContent) return;

    const triggerRect = trigger.getBoundingClientRect();
    const mainRect = mainContent.getBoundingClientRect();

    setPopoverOffset({
      side: Math.max(8, mainRect.left - triggerRect.right),
      align: triggerRect.bottom - mainRect.bottom,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    updatePopoverOffset();
    window.addEventListener("resize", updatePopoverOffset);
    return () => window.removeEventListener("resize", updatePopoverOffset);
  }, [open, updatePopoverOffset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      updatePopoverOffset();
    } else {
      setExportOptionsOpen(false);
    }
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const closeAnd = (action?: () => void) => {
    action?.();
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Settings"
          aria-expanded={open}
        >
          <Settings className="size-4 shrink-0 text-primary" />
          Settings
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        sideOffset={popoverOffset.side}
        alignOffset={popoverOffset.align}
        avoidCollisions={false}
        collisionPadding={{ top: 16, right: 16, left: 16, bottom: 8 }}
        onPointerDownOutside={(e) => {
          const target = e.target;
          if (
            target instanceof Element &&
            target.closest("[data-theme-settings-control]")
          ) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target;
          if (
            target instanceof Element &&
            target.closest("[data-theme-settings-control]")
          ) {
            e.preventDefault();
          }
        }}
        className="w-[min(21rem,calc(100vw-2rem))] rounded-lg border-2 border-border bg-popover p-0 font-base shadow-shadow"
      >
        <div className="native-scrollbar max-h-[min(70vh,28rem)] overflow-y-auto">
          <div className="flex flex-col gap-5 px-4 py-4">
            <SettingsSection title="General">
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsActionButtonClassName}
                  onClick={() => closeAnd(openFeedbackForm)}
                >
                  <MessageSquare className="size-4 shrink-0" />
                  Give Feedback
                </Button>
                <div className="flex items-center justify-between gap-3 py-0.5">
                  <span className="text-sm font-medium text-foreground">Theme</span>
                  <ThemeSettingsControl />
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-3 py-0.5">
                  <span className="text-sm font-medium text-foreground">Stack Docs</span>
                  <Switch
                    size="sm"
                    checked={documentStackEnabled}
                    onCheckedChange={onDocumentStackEnabledChange}
                    aria-label="Stack viewed documents when closing"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 py-0.5">
                  <span className="text-sm font-medium text-foreground">Workspaces</span>
                  <Switch
                    size="sm"
                    checked={workspacesEnabled}
                    onCheckedChange={onWorkspacesEnabledChange}
                    aria-label="Enable workspaces"
                  />
                </label>
              </div>
            </SettingsSection>

            <SettingsSection title="Data" contentClassName="mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsActionButtonClassName}
                  onClick={() => closeAnd(onImport)}
                >
                  <Upload className="size-4 shrink-0" />
                  Import
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsActionButtonClassName}
                  onClick={() => setExportOptionsOpen((current) => !current)}
                >
                  <Download className="size-4 shrink-0" />
                  Export
                </Button>
              </div>
              {exportOptionsOpen ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={settingsActionButtonClassName}
                    onClick={() => closeAnd(() => onExport("plain"))}
                  >
                    <Download className="size-4 shrink-0" />
                    Plain
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={settingsActionButtonClassName}
                    onClick={() => closeAnd(() => onExport("encrypted"))}
                  >
                    <Lock className="size-4 shrink-0" />
                    Encrypted
                  </Button>
                </div>
              ) : null}
            </SettingsSection>

            <SettingsSection
              title="Danger Zone"
              className="border-t border-border/50 pt-4"
              titleClassName="text-destructive"
              contentClassName="mt-2"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  settingsActionButtonClassName,
                  "text-destructive hover:bg-destructive focus-visible:ring-destructive [&_svg]:text-destructive hover:[&_svg]:text-black",
                )}
                onClick={() => closeAnd(onDeleteAll)}
              >
                <Trash2 className="size-4 shrink-0" />
                {deleteLabel}
              </Button>
            </SettingsSection>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Info,
  Lock,
  MessageSquare,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeSettingsControl } from "@/components/ThemeSettingsControl";
import { useTheme, type ThemePalette } from "@/components/ThemeProvider";
import { openFeedbackForm } from "@/components/Feedback";
import { cn } from "@/lib/utils";

const settingsDataButtonClassName =
  "h-9 w-full min-w-0 justify-center rounded-md border-2 border-border text-primary shadow-none hover:border-border hover:bg-primary hover:text-black hover:translate-x-0 hover:translate-y-0";

const settingsExportGroupClassName =
  "box-border flex w-full min-w-0 flex-col overflow-hidden rounded-md border-2 border-border text-primary shadow-none";

const settingsExportRowClassName = "flex w-full min-w-0";

const settingsExportMainClassName =
  "inline-flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-sm font-base text-primary transition-colors hover:bg-primary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const settingsExportArrowClassName =
  "inline-flex h-full w-9 shrink-0 items-center justify-center border-l-2 border-border bg-primary text-foreground transition-colors hover:bg-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const settingsExportMenuItemClassName =
  "inline-flex h-9 w-full min-w-0 items-center justify-start gap-2 border-t-2 border-border px-3 text-sm font-base text-primary transition-colors hover:bg-primary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const EXPERIMENT_PALETTES: { id: ThemePalette; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "monochrome", label: "Mono" },
  { id: "monokai", label: "Monokai" },
];

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

function SettingsInfoTooltip({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={ariaLabel}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[14rem]">
        {children}
      </TooltipContent>
    </Tooltip>
  );
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
  const { palette, setPalette } = useTheme();

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
        className="w-[min(25rem,calc(100vw-2rem))] rounded-lg border-2 border-border bg-popover p-0 font-base shadow-shadow"
      >
        <div className="native-scrollbar max-h-[min(70vh,35rem)] overflow-y-auto">
          <div className="flex flex-col gap-5 px-4 py-4">
            <SettingsSection title="General">
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsDataButtonClassName}
                  onClick={() => closeAnd(openFeedbackForm)}
                >
                  <MessageSquare className="size-4 shrink-0" />
                  Give Feedback
                </Button>
                <div className="flex flex-col gap-2 py-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">Theme Presets</span>
                      <SettingsInfoTooltip ariaLabel="About theme presets">
                        Temporary color palettes for testing
                      </SettingsInfoTooltip>
                    </div>
                    <ThemeSettingsControl />
                  </div>
                  <div
                    role="group"
                    aria-label="Experimental palette"
                    className="grid grid-cols-3 gap-1.5"
                  >
                    {EXPERIMENT_PALETTES.map((option) => {
                      const active = palette === option.id;
                      return (
                        <Button
                          key={option.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-pressed={active}
                          className={cn(
                            "h-8 min-w-0 justify-center rounded-md border-2 px-1 text-xs shadow-none hover:translate-x-0 hover:translate-y-0",
                            active
                              ? "border-border bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                              : "border-border text-foreground hover:bg-sidebar-accent",
                          )}
                          onClick={() => setPalette(option.id)}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="stack-docs-switch"
                      className="cursor-pointer text-sm font-medium text-foreground"
                    >
                      Stack Docs
                    </label>
                    <SettingsInfoTooltip ariaLabel="About stack docs">
                      Return to the previously opened document when closing
                    </SettingsInfoTooltip>
                  </div>
                  <Switch
                    id="stack-docs-switch"
                    size="sm"
                    checked={documentStackEnabled}
                    onCheckedChange={onDocumentStackEnabledChange}
                    aria-label="Stack viewed documents when closing"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="workspaces-switch"
                      className="cursor-pointer text-sm font-medium text-foreground"
                    >
                      Workspaces
                    </label>
                    <SettingsInfoTooltip ariaLabel="About workspaces">
                      Keep documents organized by workspace
                    </SettingsInfoTooltip>
                  </div>
                  <Switch
                    id="workspaces-switch"
                    size="sm"
                    checked={workspacesEnabled}
                    onCheckedChange={onWorkspacesEnabledChange}
                    aria-label="Enable workspaces"
                  />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Data" contentClassName="mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsDataButtonClassName}
                  onClick={() => closeAnd(onImport)}
                >
                  <Upload className="size-4 shrink-0" />
                  Import
                </Button>
                <div
                  className={cn(
                    settingsExportGroupClassName,
                    !exportOptionsOpen && "h-9",
                  )}
                >
                  <div
                    className={cn(
                      settingsExportRowClassName,
                      exportOptionsOpen ? "h-9" : "h-full",
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        settingsExportMainClassName,
                        exportOptionsOpen ? "justify-start" : "justify-center",
                      )}
                      onClick={() => closeAnd(() => onExport("plain"))}
                    >
                      <Download className="size-4 shrink-0" />
                      Export
                    </button>
                    <button
                      type="button"
                      className={settingsExportArrowClassName}
                      aria-label="Export options"
                      aria-expanded={exportOptionsOpen}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setExportOptionsOpen((current) => !current)}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-foreground transition-transform",
                          exportOptionsOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </div>
                  {exportOptionsOpen ? (
                    <>
                      <button
                        type="button"
                        className={settingsExportMenuItemClassName}
                        onClick={() => closeAnd(() => onExport("plain"))}
                      >
                        <Download className="size-4 shrink-0" />
                        Plain
                      </button>
                      <button
                        type="button"
                        className={settingsExportMenuItemClassName}
                        onClick={() => closeAnd(() => onExport("encrypted"))}
                      >
                        <Lock className="size-4 shrink-0" />
                        Encrypted
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
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
                  settingsDataButtonClassName,
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

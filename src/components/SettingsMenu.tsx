"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  MessageSquare,
  Settings,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  workspaceControlChromeClassName,
  workspaceSwitcherDropdownContentClassName,
} from "@/components/WorkspaceSwitcher";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeSettingsControl } from "@/components/ThemeSettingsControl";
import { useTheme, type ThemePalette } from "@/components/ThemeProvider";
import { openFeedbackForm, useSettingsFeedbackView, SettingsFeedbackPanel, feedbackPanelWidthClassName, feedbackPanelMaxHeightClassName } from "@/components/Feedback";
import { ExportPanelContent, type ExportMode } from "@/components/ExportPanelContent";
import { DeletePanelContent } from "@/components/DeletePanelContent";
import { cn } from "@/lib/utils";

const settingsDataButtonBaseClassName =
  "h-9 w-full min-w-0 justify-center rounded-md border-2 border-border shadow-none hover:border-border hover:translate-x-0 hover:translate-y-0";

export const settingsDataButtonClassName = cn(
  settingsDataButtonBaseClassName,
  "text-primary hover:bg-sidebar-accent hover:text-foreground"
);

const settingsDestructiveButtonClassName = cn(
  settingsDataButtonBaseClassName,
  "text-destructive hover:!bg-destructive hover:!text-destructive-foreground focus-visible:ring-destructive [&_svg]:text-destructive hover:[&_svg]:!text-destructive-foreground"
);

const EXPERIMENT_PALETTES: { id: ThemePalette; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "monokai", label: "Monokai" },
];

interface SettingsMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  documentStackEnabled: boolean;
  onDocumentStackEnabledChange: (enabled: boolean) => void;
  workspacesEnabled: boolean;
  onWorkspacesEnabledChange: (enabled: boolean) => void;
  onImport: () => void;
  deleteLabel: string;
  exportPanel?: {
    open: boolean;
    workspaces: { id: string; name: string }[];
    selectedIds: Set<string>;
    onOpen: () => void;
    onClose: () => void;
    onToggleWorkspace: (id: string) => void;
    onToggleSelectAll: () => void;
    onExport: (mode: ExportMode) => void;
  };
  deletePanel?: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    onOpen: () => void;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
  };
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

function SettingsBackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      Back to settings
    </button>
  );
}

function SettingsToggleRow({
  id,
  label,
  tooltip,
  tooltipAriaLabel,
  checked,
  onCheckedChange,
  switchAriaLabel,
  disabled,
}: {
  id: string;
  label: string;
  tooltip: React.ReactNode;
  tooltipAriaLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  switchAriaLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium text-foreground",
            disabled ? "cursor-default opacity-60" : "cursor-pointer",
          )}
        >
          {label}
        </label>
        <SettingsInfoTooltip ariaLabel={tooltipAriaLabel}>{tooltip}</SettingsInfoTooltip>
      </div>
      <Switch
        id={id}
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={switchAriaLabel}
        disabled={disabled}
      />
    </div>
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
  open: openProp,
  onOpenChange,
  documentStackEnabled,
  onDocumentStackEnabledChange,
  workspacesEnabled,
  onWorkspacesEnabledChange,
  onImport,
  deleteLabel,
  exportPanel,
  deletePanel,
}: SettingsMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, openProp]
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverOffset, setPopoverOffset] = useState({ side: 16, align: -8 });
  const { palette, setPalette, glitchEnabled, setGlitchEnabled } = useTheme();
  const feedback = useSettingsFeedbackView();
  const [additionalFeaturesOpen, setAdditionalFeaturesOpen] = useState(false);
  const activePaletteLabel =
    EXPERIMENT_PALETTES.find((option) => option.id === palette)?.label ?? "Default";

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

  const shouldIgnoreSettingsDismiss = () =>
    document.documentElement.dataset.themeTransition === "mode";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && shouldIgnoreSettingsDismiss()) return;

    if (nextOpen) {
      updatePopoverOffset();
    } else {
      feedback.close();
      exportPanel?.onClose();
      deletePanel?.onClose();
      setAdditionalFeaturesOpen(false);
    }
    setOpen(nextOpen);
  };

  const preventDismissDuringThemeToggle = (e: {
    preventDefault: () => void;
    target: EventTarget | null;
  }) => {
    if (shouldIgnoreSettingsDismiss()) {
      e.preventDefault();
      return;
    }
    const target = e.target;
    if (
      target instanceof Element &&
      (target.closest("[data-settings-popover]") ||
        target.closest("[data-theme-settings-control]") ||
        target.closest("[data-theme-palette-dropdown]"))
    ) {
      e.preventDefault();
    }
  };

  const panelTall = feedback.open || exportPanel?.open || deletePanel?.open || additionalFeaturesOpen;
  const popoverWidthClassName = feedback.open
    ? feedbackPanelWidthClassName
    : "w-[min(25rem,calc(100vw-2rem))]";

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
          <span className="min-w-0 flex-1 text-left">Settings</span>
          <ChevronRight className="size-4 shrink-0 text-primary" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent
        data-settings-popover
        side="right"
        align="end"
        sideOffset={popoverOffset.side}
        alignOffset={popoverOffset.align}
        avoidCollisions={false}
        collisionPadding={{ top: 16, right: 16, left: 16, bottom: 8 }}
        onPointerDownOutside={preventDismissDuringThemeToggle}
        onInteractOutside={preventDismissDuringThemeToggle}
        onFocusOutside={preventDismissDuringThemeToggle}
        className={cn(
          "rounded-lg border-2 border-border bg-popover p-0 font-base shadow-shadow",
          popoverWidthClassName
        )}
      >
        <div
          className={cn(
            "native-scrollbar overflow-y-auto",
            panelTall
              ? feedbackPanelMaxHeightClassName
              : "max-h-[min(70vh,35rem)]"
          )}
        >
          {feedback.open ? (
            <SettingsFeedbackPanel
              open={feedback.open}
              loading={feedback.loading}
              schema={feedback.schema}
              onBack={feedback.back}
              onClose={() => closeAnd()}
            />
          ) : exportPanel?.open ? (
            <ExportPanelContent
              workspaces={exportPanel.workspaces}
              selectedIds={exportPanel.selectedIds}
              onToggleWorkspace={exportPanel.onToggleWorkspace}
              onToggleSelectAll={exportPanel.onToggleSelectAll}
              onExport={exportPanel.onExport}
              onBack={exportPanel.onClose}
            />
          ) : deletePanel?.open ? (
            <DeletePanelContent
              title={deletePanel.title}
              description={deletePanel.description}
              confirmLabel={deletePanel.confirmLabel}
              onConfirm={deletePanel.onConfirm}
              onBack={deletePanel.onClose}
            />
          ) : additionalFeaturesOpen ? (
            <div className="flex flex-col gap-5 px-4 py-4">
              <SettingsBackButton onBack={() => setAdditionalFeaturesOpen(false)} />
              <div className="border-t border-border/50" aria-hidden />
              <SettingsSection title="Additional Features">
                <SettingsToggleRow
                  id="stack-docs-switch"
                  label="Stack Docs"
                  tooltip="Return to the previously opened document when closing"
                  tooltipAriaLabel="About stack docs"
                  checked={documentStackEnabled}
                  onCheckedChange={onDocumentStackEnabledChange}
                  switchAriaLabel="Stack viewed documents when closing"
                />
              </SettingsSection>
              <SettingsSection title="Experimental">
                <SettingsToggleRow
                  id="palette-glitch-switch"
                  label="Glitch"
                  tooltip="Flash accent colors when switching theme presets"
                  tooltipAriaLabel="About glitch"
                  checked={glitchEnabled}
                  onCheckedChange={setGlitchEnabled}
                  switchAriaLabel="Play glitch animation when changing theme presets"
                />
              </SettingsSection>
              <SettingsSection title="Coming Soon">
                <SettingsToggleRow
                  id="eight-bit-sidebar-switch"
                  label="8 bit sidebar"
                  tooltip="A pixel-style sidebar. Not available yet"
                  tooltipAriaLabel="About 8 bit sidebar"
                  checked={false}
                  onCheckedChange={() => {}}
                  switchAriaLabel="8 bit sidebar (coming soon)"
                  disabled
                />
              </SettingsSection>
            </div>
          ) : (
          <div className="flex flex-col gap-5 px-4 py-4">
            <SettingsSection title="General">
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsDataButtonClassName}
                  onClick={() => {
                    feedback.prepare();
                    openFeedbackForm("settings");
                  }}
                >
                  <MessageSquare className="size-4 shrink-0" />
                  Give Feedback
                </Button>
                <div className="flex items-center justify-between gap-3 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">Theme Presets</span>
                    <SettingsInfoTooltip ariaLabel="About theme presets">
                      Temporary color palettes for testing
                    </SettingsInfoTooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          data-theme-palette-dropdown
                          aria-label="Theme preset"
                          className={cn(
                            "flex h-9 min-w-[7.5rem] items-center gap-2 px-3 text-left text-sm font-medium text-foreground",
                            workspaceControlChromeClassName,
                          )}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <span className="min-w-0 flex-1 truncate">{activePaletteLabel}</span>
                          <ChevronDown className="size-4 shrink-0 text-primary" aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={4}
                        className={cn(workspaceSwitcherDropdownContentClassName, "min-w-[7.5rem]")}
                        data-theme-palette-dropdown
                      >
                        <div className="p-1">
                          {EXPERIMENT_PALETTES.map((option) => (
                            <DropdownMenuItem
                              key={option.id}
                              onClick={() => setPalette(option.id)}
                              className={cn(
                                "cursor-pointer",
                                palette === option.id &&
                                  "bg-sidebar-accent font-semibold text-primary",
                              )}
                            >
                              <span className="truncate">{option.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ThemeSettingsControl />
                  </div>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsDataButtonClassName}
                  onClick={() => exportPanel?.onOpen()}
                >
                  <Download className="size-4 shrink-0" />
                  Export
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Danger Zone"
              className="border-t border-border/50 pt-4"
              titleClassName="text-destructive"
              contentClassName="mt-2"
            >
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsDestructiveButtonClassName}
                  onClick={() => deletePanel?.onOpen()}
                >
                  <Trash2 className="size-4 shrink-0" />
                  {deleteLabel}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={settingsDataButtonClassName}
                  onClick={() => setAdditionalFeaturesOpen(true)}
                >
                  <Sparkles className="size-4 shrink-0" />
                  Additional Features
                </Button>
              </div>
            </SettingsSection>
          </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

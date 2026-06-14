"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Upload, Download, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentStackEnabled: boolean;
  onDocumentStackEnabledChange: (enabled: boolean) => void;
  onImport: () => void;
  onExport: () => void;
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
      <div className={cn("mt-4", contentClassName)}>{children}</div>
    </section>
  );
}

const settingsActionButtonClassName =
  "w-full min-w-0 justify-center rounded-md border-2 border-border text-primary shadow-none hover:border-border hover:bg-primary hover:text-black hover:translate-x-0 hover:translate-y-0";

export function SettingsModal({
  open,
  onOpenChange,
  documentStackEnabled,
  onDocumentStackEnabledChange,
  onImport,
  onExport,
  onDeleteAll,
  deleteLabel,
}: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden px-0 pb-6 pt-0 duration-150 sm:max-w-[31rem] data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]"
        overlayClassName="bg-background/20 supports-backdrop-filter:bg-background/10"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b-2 border-border px-6 py-5">
          <DialogTitle className="flex min-w-0 items-center gap-2.5">
            <Settings
              className="size-4 shrink-0 text-primary"
              aria-hidden
            />
            Settings
          </DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="neutral"
              size="icon-sm"
              className="shrink-0 bg-background text-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Close settings"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
          <DialogDescription className="sr-only">
            Application settings and data management
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-8 px-6 pt-7">
          <SettingsSection title="General">
            <label className="inline-flex w-fit cursor-pointer items-center gap-8 py-0.5">
              <span className="text-sm font-medium text-foreground">
                Stack Docs
              </span>
              <Switch
                size="sm"
                checked={documentStackEnabled}
                onCheckedChange={onDocumentStackEnabledChange}
                aria-label="Stack viewed documents when closing"
              />
            </label>
          </SettingsSection>

          <SettingsSection title="Data" contentClassName="mt-5">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={settingsActionButtonClassName}
                onClick={onImport}
              >
                <Upload className="size-4 shrink-0" />
                Import
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={settingsActionButtonClassName}
                onClick={onExport}
              >
                <Download className="size-4 shrink-0" />
                Export
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Danger Zone"
            className="border-t border-border/50 pt-10"
            titleClassName="text-destructive"
            contentClassName="mt-5"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                settingsActionButtonClassName,
                "text-destructive hover:bg-destructive focus-visible:ring-destructive [&_svg]:text-destructive hover:[&_svg]:text-black",
              )}
              onClick={onDeleteAll}
            >
              <Trash2 className="size-4 shrink-0" />
              {deleteLabel}
            </Button>
          </SettingsSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

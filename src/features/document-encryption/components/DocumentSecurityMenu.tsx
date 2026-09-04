"use client";

import { useState } from "react";
import {
  ChevronRight,
  FileLock2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { workspaceIconActionClassName } from "@/components/WorkspaceSwitcher";
import { DocumentSecurityState } from "../types";

export interface DocumentSecurityMenuProps {
  securityState: DocumentSecurityState;
  isEncryptedAtRest: boolean;
  statusLabel: string;
  className?: string;
  onEncryptDocument?: () => void;
  onLockNow?: () => void;
  onUnlock?: () => void;
  onRemoveEncryption?: () => void;
}

type ToolbarVisual = "not-encrypted" | "locked" | "unlocked";

function getToolbarVisual(
  securityState: DocumentSecurityState,
  isEncryptedAtRest: boolean
): ToolbarVisual {
  if (!isEncryptedAtRest) return "not-encrypted";
  if (securityState === DocumentSecurityState.Unlocked) return "unlocked";
  return "locked";
}

const STATUS_DOT_CLASS: Record<ToolbarVisual, string | null> = {
  "not-encrypted": "bg-red-500",
  locked: "bg-muted-foreground",
  unlocked: "bg-emerald-500",
};

function SecuritySection({
  title,
  children,
  className,
  titleClassName,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      <h3
        className={cn(
          "text-xs font-heading uppercase tracking-wide text-muted-foreground",
          titleClassName
        )}
      >
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ComingSoonRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm text-muted-foreground">
      <span>{label}</span>
      <span className="shrink-0 text-[0.65rem] uppercase tracking-wide opacity-80">
        Coming Soon
      </span>
    </div>
  );
}

function FileLockOpenIcon({
  className,
  "aria-hidden": ariaHidden,
}: {
  className?: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden={ariaHidden}
    >
      <path d="M4 9.8V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.7.7L19.3 6.3A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M5 17v-2a2 2 0 0 1 3.4-1.4" />
      <rect width="8" height="5" x="3" y="17" rx="1" />
    </svg>
  );
}

function ToolbarLockIcon({ visual }: { visual: ToolbarVisual }) {
  if (visual === "not-encrypted") {
    return <FileLockOpenIcon className="size-6" aria-hidden />;
  }
  if (visual === "unlocked") {
    return <FileLockOpenIcon className="size-6" aria-hidden />;
  }
  return <FileLock2 className="size-6 shrink-0" strokeWidth={2} aria-hidden />;
}

function AccessContext({
  icon: Icon,
  headline,
  helper,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  headline: string;
  helper: string;
}) {
  return (
    <div className="flex items-start gap-2.5 px-2" role="status">
      <Icon className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{headline}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{helper}</p>
      </div>
    </div>
  );
}

function ActionRow({
  label,
  description,
  onClick,
  className,
}: {
  label: string;
  description: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-base border-2 border-border bg-background px-3 py-2.5 text-left transition-colors",
        "hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 self-center text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}

function DangerActionRow({
  label,
  description,
  onClick,
  disabled = false,
  disabledReason,
}: {
  label: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            disabled ? "text-muted-foreground" : "text-destructive"
          )}
        >
          {label}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
        {disabled && disabledReason && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {disabledReason}
          </p>
        )}
      </div>
      {!disabled && onClick && (
        <ChevronRight
          className="size-4 shrink-0 self-center text-destructive/70"
          aria-hidden
        />
      )}
    </>
  );

  if (disabled || !onClick) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 opacity-70">
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-base border-2 border-transparent px-2 py-2.5 text-left transition-colors",
        "hover:border-destructive hover:bg-destructive/10 focus-visible:border-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
      )}
    >
      {body}
    </button>
  );
}

export function DocumentSecurityMenu({
  securityState,
  isEncryptedAtRest,
  statusLabel,
  className,
  onEncryptDocument,
  onLockNow,
  onUnlock,
  onRemoveEncryption,
}: DocumentSecurityMenuProps) {
  const [open, setOpen] = useState(false);
  const visual = getToolbarVisual(securityState, isEncryptedAtRest);
  const dotClass = STATUS_DOT_CLASS[visual];
  const isPlain = !isEncryptedAtRest;
  const isLocked =
    isEncryptedAtRest && securityState === DocumentSecurityState.Encrypted;
  const isUnlocked =
    isEncryptedAtRest && securityState === DocumentSecurityState.Unlocked;

  const closeAnd = (action?: () => void) => {
    action?.();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                workspaceIconActionClassName,
                "relative shrink-0 border-0 bg-transparent !text-primary hover:border-0",
                className
              )}
              aria-label={`Document security: ${statusLabel}. Click to open.`}
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <ToolbarLockIcon visual={visual} />
              {dotClass && (
                <span
                  className={cn(
                    "absolute bottom-1 right-1 size-1.5 rounded-full ring-1 ring-background",
                    dotClass
                  )}
                  aria-hidden
                />
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" className="max-w-[14rem] text-center">
          <p className="font-medium">{statusLabel}</p>
          <p className="text-muted-foreground">Click to open Document Security</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={12}
        collisionPadding={8}
        className="w-[min(22rem,calc(100vw-2rem))] rounded-base border-2 border-border bg-popover p-0 font-base shadow-shadow"
      >
        <div className="border-b-2 border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="size-4 shrink-0 text-primary" aria-hidden />
            Document Security
          </h2>
        </div>

        <div className="native-scrollbar max-h-[min(70vh,26rem)] overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-6">
            <SecuritySection title="Access">
              {isPlain && (
                <>
                  <AccessContext
                    icon={FileLockOpenIcon}
                    headline="Document is not encrypted"
                    helper="This document is currently stored as plain Markdown."
                  />
                  {onEncryptDocument && (
                    <ActionRow
                      className="mt-4"
                      label="Encrypt"
                      description="Encrypt this document with a passphrase. The encrypted document will be stored as a .opsly file extension."
                      onClick={() => closeAnd(onEncryptDocument)}
                    />
                  )}
                </>
              )}
              {isLocked && (
                <>
                  <AccessContext
                    icon={FileLock2}
                    headline="Document is encrypted and locked"
                    helper="Unlock the document to view, edit, and export plain Markdown."
                  />
                  {onUnlock && (
                    <ActionRow
                      className="mt-4"
                      label="Unlock"
                      description="After unlocking, decrypted content exists only in memory. Saving re-encrypts automatically."
                      onClick={() => closeAnd(onUnlock)}
                    />
                  )}
                </>
              )}
              {isUnlocked && (
                <AccessContext
                  icon={FileLockOpenIcon}
                  headline="Document is currently unlocked"
                  helper=""
                />
              )}
            </SecuritySection>

            {isEncryptedAtRest && (onLockNow || onRemoveEncryption) && (
              <SecuritySection
                title="Security"
                className="border-t-2 border-border pt-6"
              >
                {isUnlocked && onLockNow && (
                  <ActionRow
                    label="Lock Now"
                    description="Locks the document again."
                    onClick={() => closeAnd(onLockNow)}
                  />
                )}
                {onRemoveEncryption && (
                  <div className={isUnlocked && onLockNow ? "mt-3" : undefined}>
                    <DangerActionRow
                      label="Remove Encryption"
                      description="Removes encryption permanently."
                      disabled={!isUnlocked}
                      disabledReason={
                        !isUnlocked
                          ? "Unlock the document to remove encryption."
                          : undefined
                      }
                      onClick={
                        isUnlocked
                          ? () => closeAnd(onRemoveEncryption)
                          : undefined
                      }
                    />
                  </div>
                )}
              </SecuritySection>
            )}

            <SecuritySection
              title="Coming Soon"
              className="border-t-2 border-border pt-6"
            >
              <ComingSoonRow label="Change Passphrase" />
              <ComingSoonRow label="Auto Lock" />
            </SecuritySection>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

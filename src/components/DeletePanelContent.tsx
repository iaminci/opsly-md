"use client";

import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { feedbackPanelMaxHeightClassName } from "@/components/Feedback";
import { cn } from "@/lib/utils";

const deleteCancelButtonClassName = cn(
  "h-8 shrink-0 justify-center rounded-md border-2 border-border bg-background px-3 text-sm text-foreground shadow-none transition-colors",
  "hover:border-border hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0 hover:translate-y-0"
);

const deleteConfirmButtonClassName = cn(
  "h-8 shrink-0 justify-center rounded-md border-2 border-border bg-background px-3 text-sm text-destructive shadow-none transition-colors",
  "hover:!border-border hover:!bg-destructive hover:!text-destructive-foreground hover:translate-x-0 hover:translate-y-0"
);

export interface DeletePanelContentProps {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onBack: () => void;
}

export function DeletePanelContent({
  title,
  description,
  confirmLabel,
  onConfirm,
  onBack,
}: DeletePanelContentProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("native-scrollbar overflow-y-auto", feedbackPanelMaxHeightClassName)}>
      <div className="flex flex-col gap-5 px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          Back to settings
        </button>
        <div className="border-t border-border/50" aria-hidden />

        <section className="flex flex-col">
          <h3 className="text-sm font-heading font-semibold leading-snug text-foreground">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </section>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={deleteCancelButtonClassName}
            onClick={onBack}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={deleteConfirmButtonClassName}
            disabled={submitting}
            onClick={() => void handleConfirm()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Deleting…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_MAX_IMAGE_BYTES,
  type FeedbackFormSchema,
  submitNativeFeedback,
} from "@/lib/feedback-form";
import { feedbackPanelMaxHeightClassName } from "@/components/Feedback";
import { cn } from "@/lib/utils";

const feedbackButtonHoverClassName =
  "hover:border-border hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0 hover:translate-y-0";

const feedbackActionButtonClassName = cn(
  "h-8 shrink-0 justify-center rounded-md border-2 border-border bg-background px-3 text-sm text-foreground shadow-none transition-colors",
  feedbackButtonHoverClassName
);

const typeButtonClassName = cn(
  "h-9 justify-center rounded-md border-2 border-border bg-background text-foreground shadow-none transition-colors",
  feedbackButtonHoverClassName
);

function getCategoryButtonLayout(choices: string[]) {
  if (choices.length !== 2) {
    return choices.map((choice) => ({ choice, compact: false }));
  }
  const [compactChoice, wideChoice] = [...choices].sort(
    (a, b) => a.length - b.length
  );
  return [
    { choice: compactChoice, compact: true },
    { choice: wideChoice, compact: false },
  ];
}

function FeedbackSection({
  title,
  requirement,
  children,
  className,
}: {
  title: string;
  requirement?: "required" | "optional";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      <h3 className="text-xs font-heading uppercase tracking-wide text-muted-foreground">
        {title}
        {requirement && (
          <span className="normal-case tracking-normal">
            {" "}
            ({requirement})
          </span>
        )}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export interface FeedbackPanelContentProps {
  loading: boolean;
  schema: FeedbackFormSchema | null;
  showBack?: boolean;
  onBack?: () => void;
  onClose: () => void;
}

export function FeedbackPanelContent({
  loading,
  schema,
  showBack = false,
  onBack,
  onClose,
}: FeedbackPanelContentProps) {
  const [category, setCategory] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategory(null);
    setComments("");
    setImage(null);
    setSubmitting(false);
    setDragOver(false);
  }, [schema?.formConfigurationId]);

  useEffect(() => {
    if (!image) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const maxCommentLength = schema?.maxCommentLength ?? 5000;
  const canSubmit =
    !!schema &&
    !!category &&
    comments.trim().length > 0 &&
    comments.length <= maxCommentLength &&
    !submitting &&
    !loading;

  const setImageFile = (file: File | null) => {
    if (!file) {
      setImage(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please attach an image file.");
      return;
    }
    if (file.size > FEEDBACK_MAX_IMAGE_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    setImage(file);
  };

  const handleSubmit = async () => {
    if (!schema || !category) return;
    const trimmed = comments.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await submitNativeFeedback(schema, {
        category,
        comments: trimmed,
        image,
      });
      toast.success("Thanks for your feedback!");
      onClose();
    } catch (error) {
      console.error("[Feedback]", error);
      toast.error("Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "native-scrollbar overflow-y-auto",
        showBack ? undefined : feedbackPanelMaxHeightClassName
      )}
    >
      <div className="flex flex-col gap-5 px-4 py-4">
        {showBack && onBack && (
          <>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
              Back to settings
            </button>
            <div className="border-t border-border/50" aria-hidden />
          </>
        )}

        {loading || !schema ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Loading feedback form…
          </div>
        ) : (
          <>
            <FeedbackSection title="Type" requirement="required">
              <div className="flex flex-col items-start gap-2">
                {getCategoryButtonLayout(schema.categoryChoices).map(
                  ({ choice, compact }) => {
                    const selected = category === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setCategory(choice)}
                        className={cn(
                          typeButtonClassName,
                          compact
                            ? "w-[8.75rem] shrink-0 px-2 text-sm"
                            : "w-auto max-w-full shrink-0 whitespace-nowrap px-3 text-sm",
                          selected &&
                            "border-primary bg-primary/10 text-primary"
                        )}
                      >
                        {choice}
                      </button>
                    );
                  }
                )}
              </div>
            </FeedbackSection>

            <FeedbackSection title="Comments" requirement="required">
              <div className="space-y-2">
                <label htmlFor="feedback-comments" className="sr-only">
                  Comments
                </label>
                <Textarea
                  id="feedback-comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter in detail…"
                  maxLength={maxCommentLength}
                  className="min-h-[8rem] resize-y font-mono text-sm shadow-none"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {comments.length} (0 – {maxCommentLength.toLocaleString()})
                </p>
              </div>
            </FeedbackSection>

            {schema.imageQuestionId && (
              <FeedbackSection title="Attachment" requirement="optional">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImageFile(file);
                    e.target.value = "";
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0] ?? null;
                    setImageFile(file);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:bg-sidebar-accent",
                    dragOver && "border-primary bg-sidebar-accent"
                  )}
                >
                  {imagePreviewUrl ? (
                    <>
                      <img
                        src={imagePreviewUrl}
                        alt="Selected attachment preview"
                        className="max-h-28 max-w-full rounded-md object-contain"
                      />
                      <p className="text-sm font-medium text-foreground">
                        {image?.name}
                      </p>
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImage(null);
                        }}
                      >
                        Remove image
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="size-5 text-primary" aria-hidden />
                      <p className="text-sm font-medium text-foreground">
                        Click to browse or drag &amp; drop
                      </p>
                      <p className="text-xs text-muted-foreground">Max 5 MB</p>
                    </>
                  )}
                </div>
              </FeedbackSection>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={feedbackActionButtonClassName}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(feedbackActionButtonClassName, "text-primary")}
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

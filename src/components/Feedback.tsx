"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { _encatch } from "@encatch/web-sdk";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FeedbackPanelContent } from "@/components/FeedbackPanelContent";
import {
  parseFeedbackFormConfig,
  type FeedbackFormSchema,
} from "@/lib/feedback-form";
import { cn } from "@/lib/utils";

const ENCATCH_WEB_HOST = "https://form.encatch.com";
const ENCATCH_API_KEY =
  "en_ZpxFYPlKUQq7zjg70QVJ1FDK4mvUXTKGioh1VSmGaYc3gDh8Rx8YUqEYqYS27cd7M4gkgIBcQb6FPfV_709035e6";
const FEEDBACK_FORM_ID = "a2b01181-50e9-4daf-b06e-e07453b69d70";

const feedbackPanelClassName =
  "w-[min(30rem,calc(100vw-2rem))] rounded-lg border-2 border-border bg-popover p-0 font-base shadow-shadow";

export const feedbackPanelWidthClassName =
  "w-[min(30rem,calc(100vw-2rem))]";

export const feedbackPanelMaxHeightClassName =
  "max-h-[min(75vh,40rem)]";

type FeedbackOpenTarget = "standalone" | "settings";

let encatchInitialized = false;
let encatchErrorSubscribed = false;
let pendingSchema: FeedbackFormSchema | null = null;
let openTarget: FeedbackOpenTarget = "standalone";

let requestOpenStandalone: (() => void) | null = null;
let requestOpenSettings: (() => void) | null = null;

function resolveTheme(): "light" | "dark" {
  const stored = localStorage.getItem("md-viewer-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  return prefersDark ? "dark" : "light";
}

function ensureEncatchInit(theme: "light" | "dark") {
  if (encatchInitialized) {
    _encatch.setTheme(theme);
    return;
  }

  _encatch.init(ENCATCH_API_KEY, {
    webHost: ENCATCH_WEB_HOST,
    theme,
    onBeforeShowForm: (payload) => {
      const schema = parseFeedbackFormConfig(payload.formConfig);
      if (!schema) {
        toast.error("Feedback form could not be loaded.");
        return true;
      }

      pendingSchema = schema;
      if (openTarget === "settings") {
        requestOpenSettings?.();
      } else {
        requestOpenStandalone?.();
      }
      return false;
    },
  });
  encatchInitialized = true;

  if (!encatchErrorSubscribed) {
    encatchErrorSubscribed = true;
    _encatch.on((eventType, payload) => {
      if (eventType !== "form:error") return;
      toast.error("Feedback could not be sent. Please try again.");
      console.warn("[Encatch]", eventType, payload);
    });
  }
}

function dismissFeedbackForm() {
  _encatch.dismissForm(FEEDBACK_FORM_ID);
  pendingSchema = null;
}

export function openFeedbackForm(target: FeedbackOpenTarget = "standalone") {
  if (typeof window === "undefined") return;
  openTarget = target;
  pendingSchema = null;
  ensureEncatchInit(resolveTheme());
  _encatch.showForm(FEEDBACK_FORM_ID);
}

export function registerSettingsFeedbackHost(open: (() => void) | null) {
  requestOpenSettings = open;
}

function useFeedbackPanelPosition(open: boolean) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const sidebar = document.querySelector('[data-slot="sidebar"]');
      const mainContent = document.querySelector('[data-slot="sidebar-inset"]');
      if (!mainContent) return;

      const mainRect = mainContent.getBoundingClientRect();
      const sidebarRect = sidebar?.getBoundingClientRect();
      const left = sidebarRect
        ? Math.max(16, sidebarRect.right + 8)
        : mainRect.left + 16;
      const top = Math.max(16, mainRect.top + 16);
      const maxHeight = Math.max(240, mainRect.bottom - top - 16);

      setStyle({
        left,
        top,
        maxHeight,
      });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  return style;
}

export function FeedbackHost() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<FeedbackFormSchema | null>(null);
  const panelStyle = useFeedbackPanelPosition(open);

  const openStandalone = useCallback(() => {
    setSchema(pendingSchema);
    setLoading(!pendingSchema);
    setOpen(true);
  }, []);

  useEffect(() => {
    requestOpenStandalone = openStandalone;
    return () => {
      requestOpenStandalone = null;
    };
  }, [openStandalone]);

  useEffect(() => {
    ensureEncatchInit(theme);
  }, [theme]);

  const handleClose = () => {
    setOpen(false);
    setLoading(false);
    setSchema(null);
    dismissFeedbackForm();
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        aria-label="Close feedback"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-label="Give feedback"
        className={cn("fixed z-50 overflow-hidden", feedbackPanelClassName)}
        style={panelStyle}
      >
        <FeedbackPanelContent
          loading={loading}
          schema={schema}
          onClose={handleClose}
        />
      </div>
    </>
  );
}

export function SettingsFeedbackPanel({
  open,
  loading,
  schema,
  onBack,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  schema: FeedbackFormSchema | null;
  onBack: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <FeedbackPanelContent
      loading={loading}
      schema={schema}
      showBack
      onBack={onBack}
      onClose={onClose}
    />
  );
}

export function useSettingsFeedbackView() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<FeedbackFormSchema | null>(null);

  const prepare = useCallback(() => {
    setOpen(true);
    setLoading(true);
    setSchema(null);
  }, []);

  const openFromSettings = useCallback(() => {
    setSchema(pendingSchema);
    setLoading(!pendingSchema);
    setOpen(true);
  }, []);

  useEffect(() => {
    registerSettingsFeedbackHost(openFromSettings);
    return () => registerSettingsFeedbackHost(null);
  }, [openFromSettings]);

  const close = useCallback(() => {
    setOpen(false);
    setLoading(false);
    setSchema(null);
    dismissFeedbackForm();
  }, []);

  const back = useCallback(() => {
    setOpen(false);
    setLoading(false);
    setSchema(null);
    dismissFeedbackForm();
  }, []);

  return { open, loading, schema, prepare, close, back };
}

export function Feedback() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="neutral"
          size="icon-sm"
          aria-label="Bugs/Feedback"
          className="bg-background"
          onClick={() => openFeedbackForm("standalone")}
        >
          <MessageSquare className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">
        Bugs/Feedback
      </TooltipContent>
    </Tooltip>
  );
}

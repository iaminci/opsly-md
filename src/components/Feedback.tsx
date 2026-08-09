"use client";

import { useEffect } from "react";
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

/** Must match where Encatch hosts `/s/web-sdk-form`. Without this, localhost uses the current origin and the iframe loads a non-existent path (blank/black modal). */
const ENCATCH_WEB_HOST = "https://form.encatch.com";

const ENCATCH_API_KEY =
  "en_ZpxFYPlKUQq7zjg70QVJ1FDK4mvUXTKGioh1VSmGaYc3gDh8Rx8YUqEYqYS27cd7M4gkgIBcQb6FPfV_709035e6";
const FEEDBACK_FORM_ID = "a2b01181-50e9-4daf-b06e-e07453b69d70";

let encatchInitialized = false;
let encatchErrorSubscribed = false;

function syncEncatch(theme: "light" | "dark") {
  ensureEncatchInit(theme);
  _encatch.setTheme(theme);
}

function ensureEncatchInit(theme: "light" | "dark") {
  if (encatchInitialized) return;
  _encatch.init(ENCATCH_API_KEY, {
    webHost: ENCATCH_WEB_HOST,
    theme,
  });
  encatchInitialized = true;

  if (!encatchErrorSubscribed) {
    encatchErrorSubscribed = true;
    _encatch.on((eventType, payload) => {
      if (eventType !== "form:error") return;
      _encatch.dismissForm();
      toast.error(
        "Feedback could not load. If this persists, confirm your Encatch web API key, form ID, and allowed domains in the Encatch dashboard.",
      );
      console.warn("[Encatch]", eventType, payload);
    });
  }
}

export function openFeedbackForm() {
  const stored = localStorage.getItem("md-viewer-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme: "light" | "dark" =
    stored === "dark"
      ? "dark"
      : stored === "light"
        ? "light"
        : prefersDark
          ? "dark"
          : "light";
  syncEncatch(theme);
  _encatch.showForm(FEEDBACK_FORM_ID);
}

export function Feedback() {
  const { theme } = useTheme();

  useEffect(() => {
    syncEncatch(theme);
  }, [theme]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="neutral"
          size="icon-sm"
          aria-label="Bugs/Feedback"
          className="bg-background"
          onClick={openFeedbackForm}
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

"use client";

import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { _encatch } from "@encatch/web-sdk";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Must match where Encatch hosts `/s/web-sdk-form`. Without this, localhost uses the current origin and the iframe loads a non-existent path (blank/black modal). */
const ENCATCH_WEB_HOST = "https://app.encatch.com";

const ENCATCH_API_KEY =
  "en_ZpxFYPbO3bWnmWovUrZ7matMJYgewwbt61DOePMhhTuBnwn3yEkFvxGVYXerGuWGynywCQdG2cebEzZ_357c68bc";
const FEEDBACK_FORM_ID = "a2b01181-50e9-4daf-b06e-e07453b69d70";

let encatchInitialized = false;
let encatchErrorSubscribed = false;

function encatchThemeFromDocument(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function ensureEncatchInit() {
  if (encatchInitialized) return;
  _encatch.init(ENCATCH_API_KEY, {
    webHost: ENCATCH_WEB_HOST,
    theme: encatchThemeFromDocument(),
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

export function Feedback() {
  useEffect(() => {
    ensureEncatchInit();
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="neutral"
          size="icon-sm"
          aria-label="Bugs/Feedback"
          className="bg-background"
          onClick={() => {
            ensureEncatchInit();
            _encatch.showForm(FEEDBACK_FORM_ID,);
          }}
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

"use client";

import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function useModifierKeyLabel(): "⌘" | "Ctrl" {
  const [label, setLabel] = useState<"⌘" | "Ctrl">("Ctrl");

  useEffect(() => {
    setLabel(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl");
  }, []);

  return label;
}

export function MultiSelectToolbarInfo() {
  const modifierKey = useModifierKeyLabel();

  return (
    <SidebarMenuItem className="w-auto shrink-0">
      <div className="flex h-9 items-center gap-2 pl-1.5 pr-0.5 text-muted-foreground">
        <div
          className="h-5 w-0 shrink-0 self-center border-l-2 border-muted-foreground"
          aria-hidden
        />
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-sm text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              aria-label="About multi-select"
            >
              <Info className="size-4" strokeWidth={2.5} aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="end"
            collisionPadding={12}
            className="max-w-[14rem] py-1.5 leading-snug"
          >
            <p className="font-medium">Multi-select</p>
            <p className="text-muted-foreground">
              Hold {modifierKey} and click files or folders to select multiple
              items.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </SidebarMenuItem>
  );
}

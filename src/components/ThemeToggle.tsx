"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="neutral"
          size="icon-sm"
          className={cn("bg-background text-foreground hover:text-foreground", className)}
          onClick={(e) => {
            let { clientX, clientY } = e;
            if (clientX === 0 && clientY === 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              clientX = rect.left + rect.width / 2;
              clientY = rect.top + rect.height / 2;
            }
            setTheme(theme === "dark" ? "light" : "dark", { clientX, clientY });
          }}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
      </TooltipTrigger>
    </Tooltip>
  );
}
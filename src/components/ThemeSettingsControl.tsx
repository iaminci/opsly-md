"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const TRACK_CLASS =
  "relative block h-8 w-[4.5rem] shrink-0 overflow-hidden rounded-full border-2 border-border bg-secondary-background p-0";

function stopPopoverDismiss(e: React.SyntheticEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function ThemeSettingsControl({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const selectTheme = (next: "light" | "dark") => {
    if ((next === "dark") === isDark) return;
    // Skip view-transition origin so the settings popover stays open.
    setTheme(next);
  };

  return (
    <div
      data-theme-settings-control
      role="group"
      aria-label="Theme"
      className={cn(TRACK_CLASS, className)}
    >
      <Sun
        className={cn(
          "pointer-events-none absolute top-1/2 left-[0.6875rem] size-3.5 -translate-y-1/2 text-muted-foreground transition-opacity duration-200",
          isDark ? "opacity-70" : "opacity-0",
        )}
        aria-hidden
      />
      <Moon
        className={cn(
          "pointer-events-none absolute top-1/2 right-[0.6875rem] size-3.5 -translate-y-1/2 text-muted-foreground transition-opacity duration-200",
          isDark ? "opacity-0" : "opacity-70",
        )}
        aria-hidden
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 flex h-full w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[left] duration-200 ease-out",
          isDark ? "left-[calc(100%-1.75rem)]" : "left-0",
        )}
      >
        {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      </span>
      <button
        type="button"
        aria-label="Light theme"
        aria-pressed={!isDark}
        className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer rounded-l-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onPointerDown={stopPopoverDismiss}
        onClick={(e) => {
          stopPopoverDismiss(e);
          selectTheme("light");
        }}
      />
      <button
        type="button"
        aria-label="Dark theme"
        aria-pressed={isDark}
        className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer rounded-r-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onPointerDown={stopPopoverDismiss}
        onClick={(e) => {
          stopPopoverDismiss(e);
          selectTheme("dark");
        }}
      />
    </div>
  );
}

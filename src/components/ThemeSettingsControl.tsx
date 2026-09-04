"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeSettingsControl({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      data-theme-settings-control
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-border p-0 text-primary shadow-none transition-colors hover:translate-x-0 hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        isDark
          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          : "bg-background hover:border-border hover:bg-sidebar-accent hover:text-foreground",
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => setTheme(isDark ? "light" : "dark", { clientX: 0, clientY: 0 })}
    >
      {isDark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
    </button>
  );
}

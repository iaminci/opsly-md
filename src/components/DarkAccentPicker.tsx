"use client";

import { useTheme } from "@/components/ThemeProvider";
import type { DarkAccent } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENTS: { value: DarkAccent; label: string; colorClass: string }[] = [
  { value: "amber", label: "Amber", colorClass: "bg-amber-500" },
  { value: "sky", label: "Sky", colorClass: "bg-sky-500" },
  { value: "emerald", label: "Emerald", colorClass: "bg-emerald-500" },
  { value: "violet", label: "Violet", colorClass: "bg-violet-500" },
  { value: "rose", label: "Rose", colorClass: "bg-rose-500" },
  { value: "indigo", label: "Indigo", colorClass: "bg-indigo-500" },
  { value: "orange", label: "Orange", colorClass: "bg-orange-500" },
];

export function DarkAccentPicker() {
  const { theme, darkAccent, setDarkAccent } = useTheme();

  if (theme !== "dark") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="neutral"
          size="icon-sm"
          className="text-primary dark:[color:var(--dm-text)] hover:text-primary-hover dark:hover:[color:var(--dm-text-hover)]"
          aria-label="Choose dark mode accent"
        >
          <Palette className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {ACCENTS.map(({ value, label, colorClass }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setDarkAccent(value)}
            className={cn(
              "flex items-center gap-2",
              darkAccent === value && "dark:![background-color:var(--dm-bg)] dark:ring-1 dark:ring-[var(--dm-border)]"
            )}
          >
            <span
              className={cn("h-4 w-4 shrink-0 rounded-full", colorClass)}
              aria-hidden
            />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

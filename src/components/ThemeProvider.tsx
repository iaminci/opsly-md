"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

export type DarkAccent =
  | "amber"
  | "sky"
  | "emerald"
  | "violet"
  | "rose"
  | "indigo"
  | "orange";

export type ThemeToggleOrigin = { clientX: number; clientY: number };

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme, origin?: ThemeToggleOrigin) => void;
  darkAccent: DarkAccent;
  setDarkAccent: (accent: DarkAccent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_ACCENT_KEY = "opsly-accent";

const VALID_ACCENTS: DarkAccent[] = [
  "amber",
  "sky",
  "emerald",
  "violet",
  "rose",
  "indigo",
  "orange",
];

const DEFAULT_ACCENT: DarkAccent = "orange";

function getInitialAccent(): DarkAccent {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  let stored = localStorage.getItem(DARK_ACCENT_KEY) as DarkAccent | null;
  if (!stored) {
    const legacy = localStorage.getItem("md-viewer-dark-accent") as DarkAccent | null;
    if (legacy && VALID_ACCENTS.includes(legacy)) {
      stored = legacy;
      localStorage.setItem(DARK_ACCENT_KEY, legacy);
    }
  }
  const accent = stored && VALID_ACCENTS.includes(stored) ? stored : DEFAULT_ACCENT;
  if (!stored || !VALID_ACCENTS.includes(stored)) {
    localStorage.setItem(DARK_ACCENT_KEY, accent);
  }
  return accent;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [darkAccent, setDarkAccentState] = useState<DarkAccent>(getInitialAccent);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("md-viewer-theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");

    const accent = getInitialAccent();
    setDarkAccentState(accent);
    if (initial === "dark") {
      document.documentElement.setAttribute("data-dark-accent", accent);
    } else {
      document.documentElement.removeAttribute("data-dark-accent");
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme, origin?: ThemeToggleOrigin) => {
    const syncDocument = (theme: Theme) => {
      localStorage.setItem("md-viewer-theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
      if (theme === "dark") {
        const stored = localStorage.getItem(DARK_ACCENT_KEY) as DarkAccent | null;
        const validAccent = stored && VALID_ACCENTS.includes(stored) ? stored : DEFAULT_ACCENT;
        document.documentElement.setAttribute("data-dark-accent", validAccent);
      } else {
        document.documentElement.removeAttribute("data-dark-accent");
      }
    };

    const apply = () => {
      setThemeState(newTheme);
      syncDocument(newTheme);
    };

    if (typeof document === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startVT = document.startViewTransition?.bind(document) as
      | ((cb: () => void) => { finished: Promise<void> })
      | undefined;

    if (!origin || reducedMotion || !startVT) {
      apply();
      return;
    }

    const corners: [number, number][] = [
      [0, 0],
      [window.innerWidth, 0],
      [0, window.innerHeight],
      [window.innerWidth, window.innerHeight],
    ];
    const r =
      Math.max(...corners.map(([x, y]) => Math.hypot(x - origin.clientX, y - origin.clientY))) + 4;
    document.documentElement.style.setProperty("--theme-toggle-x", `${origin.clientX}px`);
    document.documentElement.style.setProperty("--theme-toggle-y", `${origin.clientY}px`);
    document.documentElement.style.setProperty("--theme-toggle-r", `${r}px`);

    startVT(() => {
      flushSync(() => {
        setThemeState(newTheme);
      });
      syncDocument(newTheme);
    });
  }, []);

  const setDarkAccent = useCallback((accent: DarkAccent) => {
    setDarkAccentState(accent);
    localStorage.setItem(DARK_ACCENT_KEY, accent);
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.setAttribute("data-dark-accent", accent);
    }
  }, []);

  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          theme: "light",
          setTheme,
          darkAccent: DEFAULT_ACCENT,
          setDarkAccent,
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, darkAccent, setDarkAccent }}
    >
      <div
        className={theme === "dark" ? "dark" : ""}
        data-dark-accent={theme === "dark" ? darkAccent : undefined}
        suppressHydrationWarning
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

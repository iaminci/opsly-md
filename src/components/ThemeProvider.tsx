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

export type ThemeToggleOrigin = { clientX: number; clientY: number };

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme, origin?: ThemeToggleOrigin) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("md-viewer-theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const setTheme = useCallback((newTheme: Theme, origin?: ThemeToggleOrigin) => {
    const syncDocument = (theme: Theme) => {
      localStorage.setItem("md-viewer-theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
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

  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          theme: "light",
          setTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div
        className={theme === "dark" ? "dark" : ""}
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

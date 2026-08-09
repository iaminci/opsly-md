"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { flushSync } from "react-dom";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type ThemeToggleOrigin = { clientX: number; clientY: number };

interface ThemeContextValue {
  theme: ResolvedTheme;
  themePreference: ThemePreference;
  setTheme: (theme: ThemePreference, origin?: ThemeToggleOrigin) => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [theme, setThemeState] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("md-viewer-theme") as ThemePreference | null;
    const initialPreference: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    const initialResolved = resolveTheme(initialPreference);
    setThemePreference(initialPreference);
    setThemeState(initialResolved);
    document.documentElement.classList.toggle("dark", initialResolved === "dark");
  }, []);

  useEffect(() => {
    if (!mounted || themePreference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const resolved = resolveTheme("system");
      setThemeState(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mounted, themePreference]);

  const setTheme = useCallback((newPreference: ThemePreference, origin?: ThemeToggleOrigin) => {
    const resolved = resolveTheme(newPreference);

    const syncDocument = (resolvedTheme: ResolvedTheme, preference: ThemePreference) => {
      localStorage.setItem("md-viewer-theme", preference);
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    };

    const apply = () => {
      setThemePreference(newPreference);
      setThemeState(resolved);
      syncDocument(resolved, newPreference);
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
        setThemePreference(newPreference);
        setThemeState(resolved);
      });
      syncDocument(resolved, newPreference);
    });
  }, []);

  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          theme: "light",
          themePreference: "system",
          setTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setTheme }}>
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

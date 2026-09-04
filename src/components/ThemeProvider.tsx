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
/** Color pack; independent of light/dark. Default keeps existing tokens. */
export type ThemePalette = "default" | "monokai";

export type ThemeToggleOrigin = { clientX: number; clientY: number };

const THEME_STORAGE_KEY = "md-viewer-theme";
const PALETTE_STORAGE_KEY = "md-viewer-palette";
const PALETTE_GLITCH_STORAGE_KEY = "md-viewer-palette-glitch";

interface ThemeContextValue {
  theme: ResolvedTheme;
  themePreference: ThemePreference;
  setTheme: (theme: ThemePreference, origin?: ThemeToggleOrigin) => void;
  palette: ThemePalette;
  setPalette: (palette: ThemePalette) => void;
  glitchEnabled: boolean;
  setGlitchEnabled: (enabled: boolean) => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

function parsePalette(value: string | null): ThemePalette {
  if (value === "monokai") return value;
  return "default";
}

function parseGlitchEnabled(value: string | null): boolean {
  return value !== "0";
}

function applyPaletteAttribute(palette: ThemePalette) {
  const root = document.documentElement;
  root.classList.remove("palette-monokai");
  if (palette === "default") {
    root.removeAttribute("data-palette");
  } else {
    root.setAttribute("data-palette", palette);
    root.classList.add(`palette-${palette}`);
  }
}

const PALETTE_GLITCH_STEP_MS = 80;

const PALETTE_GLITCH_PRIMARY = [
  "#ff2a6d",
  "#05d9e8",
  "#ffe600",
  "#b537f2",
  "#ff6b00",
  "#39ff14",
  "#ff00aa",
] as const;

const PALETTE_GLITCH_SECONDARY = [
  "#05d9e8",
  "#ffe600",
  "#ff2a6d",
  "#39ff14",
  "#00f0ff",
  "#ff4d6d",
  "#c084fc",
] as const;

const PALETTE_GLITCH_VARS = [
  "--primary",
  "--primary-hover",
  "--main",
  "--secondary",
  "--secondary-hover",
  "--ring",
  "--sidebar-ring",
  "--sidebar-accent-foreground",
  "--selection-border",
  "--shadow",
] as const;

function readDocumentPalette(): ThemePalette {
  return parsePalette(document.documentElement.getAttribute("data-palette"));
}

function getViewTransitionStarter() {
  return document.startViewTransition?.bind(document) as
    | ((cb: () => void) => { finished: Promise<void> })
    | undefined;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let paletteGlitchTimer = 0;

function glitchRoots(): HTMLElement[] {
  const root = document.documentElement;
  const themeRoot = document.querySelector<HTMLElement>("[data-theme-root]");
  return themeRoot && themeRoot !== root ? [root, themeRoot] : [root];
}

function clearPaletteAccentGlitch() {
  window.clearInterval(paletteGlitchTimer);
  paletteGlitchTimer = 0;
  for (const el of glitchRoots()) {
    for (const name of PALETTE_GLITCH_VARS) {
      el.style.removeProperty(name);
    }
  }
}

function paintPaletteAccentFrame(frame: number) {
  const primary = PALETTE_GLITCH_PRIMARY[frame];
  const secondary = PALETTE_GLITCH_SECONDARY[frame];
  const shadow = document.documentElement.classList.contains("dark")
    ? `2px 2px 0px 0px ${primary}`
    : `4px 4px 0px 0px ${primary}`;

  for (const el of glitchRoots()) {
    el.style.setProperty("--primary", primary);
    el.style.setProperty("--primary-hover", primary);
    el.style.setProperty("--main", primary);
    el.style.setProperty("--secondary", secondary);
    el.style.setProperty("--secondary-hover", secondary);
    el.style.setProperty("--ring", primary);
    el.style.setProperty("--sidebar-ring", primary);
    el.style.setProperty("--sidebar-accent-foreground", primary);
    el.style.setProperty("--selection-border", primary);
    el.style.setProperty("--shadow", shadow);
  }
}

function playPaletteAccentGlitch() {
  if (prefersReducedMotion()) return;

  clearPaletteAccentGlitch();
  let frame = 0;
  paintPaletteAccentFrame(frame);
  paletteGlitchTimer = window.setInterval(() => {
    frame += 1;
    if (frame >= PALETTE_GLITCH_PRIMARY.length) {
      clearPaletteAccentGlitch();
      return;
    }
    paintPaletteAccentFrame(frame);
  }, PALETTE_GLITCH_STEP_MS);
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [theme, setThemeState] = useState<ResolvedTheme>("light");
  const [palette, setPaletteState] = useState<ThemePalette>("default");
  const [glitchEnabled, setGlitchEnabledState] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    const initialPreference: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    const initialResolved = resolveTheme(initialPreference);
    const initialPalette = parsePalette(localStorage.getItem(PALETTE_STORAGE_KEY));
    const initialGlitchEnabled = parseGlitchEnabled(
      localStorage.getItem(PALETTE_GLITCH_STORAGE_KEY),
    );
    setThemePreference(initialPreference);
    setThemeState(initialResolved);
    setPaletteState(initialPalette);
    setGlitchEnabledState(initialGlitchEnabled);
    document.documentElement.classList.toggle("dark", initialResolved === "dark");
    applyPaletteAttribute(initialPalette);
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

  const setGlitchEnabled = useCallback((enabled: boolean) => {
    setGlitchEnabledState(enabled);
    localStorage.setItem(PALETTE_GLITCH_STORAGE_KEY, enabled ? "1" : "0");
    if (!enabled) clearPaletteAccentGlitch();
  }, []);

  const setPalette = useCallback((next: ThemePalette) => {
    if (typeof document === "undefined") return;
    if (readDocumentPalette() === next) return;

    setPaletteState(next);
    localStorage.setItem(PALETTE_STORAGE_KEY, next);
    applyPaletteAttribute(next);
    if (glitchEnabled) playPaletteAccentGlitch();
  }, [glitchEnabled]);

  const setTheme = useCallback((newPreference: ThemePreference, origin?: ThemeToggleOrigin) => {
    const resolved = resolveTheme(newPreference);

    const syncDocument = (resolvedTheme: ResolvedTheme, preference: ThemePreference) => {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    };

    const apply = () => {
      setThemePreference(newPreference);
      setThemeState(resolved);
      syncDocument(resolved, newPreference);
    };

    if (typeof document === "undefined") return;

    const startVT = getViewTransitionStarter();
    if (!origin || prefersReducedMotion() || !startVT) {
      apply();
      return;
    }

    const root = document.documentElement;
    root.dataset.themeTransition = "mode";
    try {
      const transition = startVT(() => {
        flushSync(() => {
          setThemePreference(newPreference);
          setThemeState(resolved);
        });
        syncDocument(resolved, newPreference);
      });
      void transition.finished.finally(() => {
        if (root.dataset.themeTransition === "mode") {
          delete root.dataset.themeTransition;
        }
      });
    } catch {
      delete root.dataset.themeTransition;
      apply();
    }
  }, []);

  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          theme: "light",
          themePreference: "system",
          setTheme,
          palette: "default",
          setPalette,
          glitchEnabled: true,
          setGlitchEnabled,
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{ theme, themePreference, setTheme, palette, setPalette, glitchEnabled, setGlitchEnabled }}
    >
      <div
        data-theme-root
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

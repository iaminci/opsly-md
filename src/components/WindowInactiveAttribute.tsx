"use client";

import { useEffect } from "react";

const DATA_ATTR = "data-window-inactive";

/**
 * Toggles [data-window-inactive] on <html> so CSS can restyle ::selection when the tab or
 * top-level window is not focused. Inline scripts are unreliable with Next + hydration.
 */
export function WindowInactiveAttribute() {
  useEffect(() => {
    const el = document.documentElement;

    const apply = () => {
      const inactive = document.hidden || !document.hasFocus();
      if (inactive) {
        el.setAttribute(DATA_ATTR, "");
      } else {
        el.removeAttribute(DATA_ATTR);
      }
    };

    const schedule = () => {
      // Same tick as blur: hasFocus() is often still true; rAF+timeout for engines that need it
      requestAnimationFrame(() => {
        setTimeout(apply, 0);
      });
    };

    apply();
    window.addEventListener("blur", schedule, true);
    window.addEventListener("focus", schedule, true);
    document.addEventListener("visibilitychange", schedule, true);

    return () => {
      window.removeEventListener("blur", schedule, true);
      window.removeEventListener("focus", schedule, true);
      document.removeEventListener("visibilitychange", schedule, true);
    };
  }, []);

  return null;
}

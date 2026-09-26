"use client";

import { useEffect } from "react";

const SCROLLBAR_IDLE_DELAY_MS = 2000;
const SCROLLBAR_SELECTOR =
  ".native-scrollbar, .native-scrollbar-transparent-track";

export function ScrollbarActivity() {
  useEffect(() => {
    const hideTimers = new Map<Element, number>();

    const handleScroll = (event: Event) => {
      const target =
        event.target instanceof Element
          ? event.target
          : document.scrollingElement;

      if (!target?.matches(SCROLLBAR_SELECTOR)) return;

      target.setAttribute("data-scrollbar-active", "");

      const existingTimer = hideTimers.get(target);
      if (existingTimer) window.clearTimeout(existingTimer);

      const timer = window.setTimeout(() => {
        target.removeAttribute("data-scrollbar-active");
        hideTimers.delete(target);
      }, SCROLLBAR_IDLE_DELAY_MS);

      hideTimers.set(target, timer);
    };

    document.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      for (const timer of hideTimers.values()) window.clearTimeout(timer);
      hideTimers.clear();
    };
  }, []);

  return null;
}

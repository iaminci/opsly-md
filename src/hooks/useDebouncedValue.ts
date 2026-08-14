"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value`, but delayed so it only updates after `delayMs` of no changes.
 * Use to decouple fast-changing input (e.g. keystrokes) from expensive downstream
 * work (e.g. re-running the markdown render pipeline) that shouldn't run per-keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

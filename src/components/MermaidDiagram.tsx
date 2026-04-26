"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import mermaid from "mermaid";

function subscribeDocumentDark(callback: () => void) {
  const el = document.documentElement;
  const obs = new MutationObserver(callback);
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function getDocumentIsDark() {
  return document.documentElement.classList.contains("dark");
}

function getServerIsDark() {
  return false;
}

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const isDark = useSyncExternalStore(
    subscribeDocumentDark,
    getDocumentIsDark,
    getServerIsDark
  );

  useEffect(() => {
    let cancelled = false;
    setError(null);

    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "neutral",
      securityLevel: "loose",
    });

    mermaid
      .render(`mermaid-${Date.now()}`, chart)
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to render diagram");
      });

    return () => {
      cancelled = true;
    };
  }, [chart, isDark]);

  if (error) {
    return (
      <pre className="my-4 overflow-x-auto rounded-md border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
        {error}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 flex items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 py-8 dark:border-zinc-700 dark:bg-zinc-800">
        <span className="text-sm text-zinc-500">Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div
      className="not-prose my-4 flex justify-center overflow-x-auto rounded-md border-2 border-border p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

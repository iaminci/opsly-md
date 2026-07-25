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
      <pre className="markdown-embed markdown-wide not-prose overflow-x-auto p-4 text-sm text-destructive" role="alert">
        {error}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="markdown-embed markdown-embed-loading markdown-wide not-prose" aria-busy="true">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="markdown-embed markdown-wide not-prose flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

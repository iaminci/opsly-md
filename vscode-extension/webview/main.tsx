import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

declare const acquireVsCodeApi: () => {
  postMessage: (message: unknown) => void;
};

const vscode = acquireVsCodeApi();

type ThemeKind = "light" | "dark" | "high-contrast";

function applyTheme(kind: ThemeKind): void {
  const root = document.documentElement;
  root.classList.remove("dark", "high-contrast");
  if (kind === "dark") {
    root.classList.add("dark");
  } else if (kind === "high-contrast") {
    root.classList.add("dark", "high-contrast");
  }
}

function PreviewApp() {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== "object") return;

      if (message.type === "update") {
        if (typeof message.content === "string") {
          setContent(message.content);
        }
        if (typeof message.fileName === "string") {
          setFileName(message.fileName);
        }
      }

      if (message.type === "theme" && typeof message.kind === "string") {
        applyTheme(message.kind as ThemeKind);
      }
    };

    window.addEventListener("message", onMessage);
    vscode.postMessage({ type: "ready" });

    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLAnchorElement)) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        event.preventDefault();
        vscode.postMessage({ type: "openLink", href });
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="preview-shell min-h-screen bg-background text-foreground">
      {fileName ? (
        <header className="preview-header border-b border-border px-6 py-3 text-xs text-muted-foreground">
          {fileName.split(/[/\\]/).pop()}
        </header>
      ) : null}
      <main className="preview-main mx-auto max-w-4xl px-6 py-8">
        {content.trim() ? (
          <MarkdownRenderer content={content} />
        ) : (
          <p className="text-muted-foreground text-sm">
            This document is empty. Start writing Markdown to see a preview.
          </p>
        )}
      </main>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <PreviewApp />
    </StrictMode>
  );
}

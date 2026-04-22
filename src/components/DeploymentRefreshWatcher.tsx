"use client";

import { useEffect } from "react";

const POLL_MS = 60_000;

/** Inlined at build from VERCEL_DEPLOYMENT_ID via next.config `env`. */
const clientDeploymentId = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ?? "";

export function DeploymentRefreshWatcher() {
  useEffect(() => {
    if (!clientDeploymentId) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { deploymentId?: string };
        if (
          data.deploymentId &&
          data.deploymentId !== clientDeploymentId
        ) {
          window.location.reload();
        }
      } catch {
        // ignore network errors
      }
    };

    const interval = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    void check();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}

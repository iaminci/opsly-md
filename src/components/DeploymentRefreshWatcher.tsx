"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushPendingSqliteSave } from "@/lib/sqlite-db";
import {
  useDeploymentReloadBlockCount,
} from "@/components/DeploymentReloadGuard";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** One hour between idle checks; focus/visibility still trigger checks immediately. */
const POLL_MS = 3_600_000;

/** Inlined at build from VERCEL_DEPLOYMENT_ID via next.config `env`. */
const clientDeploymentId = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ?? "";

/** Build-time static file; see `scripts/write-deployment-id.mjs`. */
const DEPLOYMENT_ID_URL = "/deployment-id.txt";

/** Set `NEXT_PUBLIC_DEBUG_DEPLOYMENT_PROMPT=1` in `.env.local` to preview the update card (dev only). */
const debugDeploymentPrompt =
  process.env.NEXT_PUBLIC_DEBUG_DEPLOYMENT_PROMPT === "1" ||
  process.env.NEXT_PUBLIC_DEBUG_DEPLOYMENT_PROMPT === "true";

export function DeploymentRefreshWatcher() {
  const blockCount = useDeploymentReloadBlockCount();
  const blockCountRef = useRef(blockCount);
  blockCountRef.current = blockCount;

  const [promptOpen, setPromptOpen] = useState(false);
  const snoozeUntilRef = useRef(0);

  const check = useCallback(async () => {
    if (debugDeploymentPrompt) {
      if (Date.now() < snoozeUntilRef.current) {
        setPromptOpen(false);
        return;
      }
      if (blockCountRef.current > 0) {
        setPromptOpen(false);
        return;
      }
      setPromptOpen(true);
      return;
    }

    if (!clientDeploymentId) return;

    try {
      const res = await fetch(DEPLOYMENT_ID_URL, { cache: "no-store" });
      if (!res.ok) return;
      const deploymentId = (await res.text()).trim();
      const mismatch =
        !!deploymentId && deploymentId !== clientDeploymentId;

      if (!mismatch) {
        setPromptOpen(false);
        snoozeUntilRef.current = 0;
        return;
      }

      if (Date.now() < snoozeUntilRef.current) {
        setPromptOpen(false);
        return;
      }

      if (blockCountRef.current > 0) {
        setPromptOpen(false);
        return;
      }

      setPromptOpen(true);
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    if (!clientDeploymentId && !debugDeploymentPrompt) return;

    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      void check();
    };

    const interval = window.setInterval(run, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisible);
    run();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  useEffect(() => {
    void check();
  }, [blockCount, check]);

  const handleUpdate = async () => {
    if (blockCountRef.current > 0) return;
    try {
      await flushPendingSqliteSave();
    } catch {
      // best-effort
    }
    window.location.reload();
  };

  const handleRemindLater = () => {
    snoozeUntilRef.current = Date.now() + POLL_MS;
    setPromptOpen(false);
  };

  if (!clientDeploymentId && !debugDeploymentPrompt) return null;

  return (
    <>
      {promptOpen && (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-[200] flex max-w-[min(100vw-2rem,22rem)] flex-col items-end"
          role="dialog"
          aria-labelledby="opsly-new-version-title"
          aria-describedby="opsly-new-version-desc"
        >
          <Card className="pointer-events-auto w-full gap-4 py-4 shadow-xl ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardTitle id="opsly-new-version-title" className="text-base">
                New Version Available
              </CardTitle>
              <CardDescription id="opsly-new-version-desc" className="text-xs">
                Update reloads the page now.
                Remind me later hides this until the next check.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap justify-end gap-2 border-t-0 pt-0">
              <Button
                variant="neutral"
                size="sm"
                className="bg-background"
                onClick={handleRemindLater}
              >
                Remind me later
              </Button>
              <Button
                size="sm"
                variant="neutral"
                disabled={blockCount > 0}
                className="bg-primary text-background hover:bg-primary/90 disabled:opacity-50"
                onClick={() => void handleUpdate()}
              >
                Update Now
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}

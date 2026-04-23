"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DeploymentReloadBlockContextValue = {
  blockCount: number;
  acquire: () => void;
  release: () => void;
};

const DeploymentReloadBlockContext =
  createContext<DeploymentReloadBlockContextValue | null>(null);

export function DeploymentReloadGuardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [blockCount, setBlockCount] = useState(0);

  const acquire = useCallback(() => {
    setBlockCount((c) => c + 1);
  }, []);

  const release = useCallback(() => {
    setBlockCount((c) => Math.max(0, c - 1));
  }, []);

  const value = useMemo(
    () => ({ blockCount, acquire, release }),
    [blockCount, acquire, release],
  );

  return (
    <DeploymentReloadBlockContext.Provider value={value}>
      {children}
    </DeploymentReloadBlockContext.Provider>
  );
}

/** While `active`, deployment update prompts / reloads are deferred. */
export function useDeploymentReloadBlock(active: boolean) {
  const acquire = useContext(DeploymentReloadBlockContext)?.acquire;
  const release = useContext(DeploymentReloadBlockContext)?.release;
  useEffect(() => {
    if (!acquire || !release || !active) return;
    acquire();
    return () => release();
  }, [active, acquire, release]);
}

export function useDeploymentReloadBlockCount(): number {
  const ctx = useContext(DeploymentReloadBlockContext);
  return ctx?.blockCount ?? 0;
}

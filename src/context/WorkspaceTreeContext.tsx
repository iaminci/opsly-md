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
import type { Document } from "@/types/document";
import type { Folder, Workspace } from "@/types/workspace";
import { getAllFolders, getWorkspaces } from "@/lib/storage";

type WorkspaceTreeContextValue = {
  /** Same ordering as the sidebar: A → Z. */
  sortedWorkspaces: Workspace[];
  getFoldersInWorkspace: (workspaceId: string) => Folder[];
  /** False until the first load from storage finishes (for inline create spinners). */
  hasSyncedWorkspacesAtLeastOnce: boolean;
};

const WorkspaceTreeContext = createContext<WorkspaceTreeContextValue | null>(null);

/**
 * Workspaces and folder rows are loaded together whenever `documents` from the app
 * updates, so the tree and inline “Create File” use the same data as the sidebar.
 */
export function WorkspaceTreeProvider({
  children,
  documents,
}: {
  children: ReactNode;
  documents: Document[];
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [foldersByWorkspace, setFoldersByWorkspace] = useState<Map<string, Folder[]>>(
    () => new Map()
  );
  const [hasSyncedAtLeastOnce, setHasSyncedAtLeastOnce] = useState(false);

  const loadWorkspacesAndFolders = useCallback(async () => {
    const ws = await getWorkspaces();
    setWorkspaces(ws);
    const folderMap = new Map<string, Folder[]>();
    await Promise.all(
      ws.map(async (w) => {
        folderMap.set(w.id, await getAllFolders(w.id));
      })
    );
    setFoldersByWorkspace(folderMap);
    setHasSyncedAtLeastOnce(true);
  }, []);

  const documentsKey = useMemo(
    () =>
      documents
        .map((d) => d.id)
        .sort()
        .join("\0"),
    [documents]
  );

  useEffect(() => {
    void loadWorkspacesAndFolders();
  }, [documentsKey, loadWorkspacesAndFolders]);

  const sortedWorkspaces = useMemo(
    () =>
      [...workspaces].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [workspaces]
  );

  const getFoldersInWorkspace = useCallback(
    (workspaceId: string) => foldersByWorkspace.get(workspaceId) ?? [],
    [foldersByWorkspace]
  );

  const value = useMemo<WorkspaceTreeContextValue>(
    () => ({
      sortedWorkspaces,
      getFoldersInWorkspace,
      hasSyncedWorkspacesAtLeastOnce: hasSyncedAtLeastOnce,
    }),
    [sortedWorkspaces, getFoldersInWorkspace, hasSyncedAtLeastOnce]
  );

  return (
    <WorkspaceTreeContext.Provider value={value}>{children}</WorkspaceTreeContext.Provider>
  );
}

export function useWorkspaceTree() {
  const ctx = useContext(WorkspaceTreeContext);
  if (!ctx) {
    throw new Error("useWorkspaceTree must be used within WorkspaceTreeProvider");
  }
  return ctx;
}

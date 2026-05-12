import type { Document } from "@/types/document";
import type { Workspace } from "@/types/workspace";
import type { Folder } from "@/types/workspace";
import {
  getSqliteDb,
  sqlQuery,
  saveSqliteDb,
} from "./sqlite-db";

const LEGACY_STORAGE_KEY = "md-viewer-documents";

export class DuplicateNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateNameError";
  }
}

async function migrateFromLocalStorage(db: Awaited<ReturnType<typeof getSqliteDb>>): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;

    const documents: Document[] = JSON.parse(raw);
    if (!Array.isArray(documents) || documents.length === 0) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    for (const doc of documents) {
      if (doc.id && doc.title !== undefined) {
        const workspaceId = "workspaceId" in doc ? doc.workspaceId : "default";
        const folderId = "folderId" in doc ? doc.folderId : null;
        db.run(
          "INSERT OR REPLACE INTO documents (id, title, content, createdAt, workspaceId, folderId) VALUES (?, ?, ?, ?, ?, ?)",
          [doc.id, doc.title, doc.content, doc.createdAt, workspaceId, folderId]
        );
      }
    }
    await saveSqliteDb(db);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Migration failed
  }
}

export async function getDocuments(workspaceId?: string): Promise<Document[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await getSqliteDb();
    await migrateFromLocalStorage(db);
    const query =
      workspaceId != null
        ? "SELECT id, title, content, createdAt, workspaceId, folderId FROM documents WHERE workspaceId = ? ORDER BY createdAt DESC"
        : "SELECT id, title, content, createdAt, workspaceId, folderId FROM documents ORDER BY createdAt DESC";
    const rows = workspaceId != null
      ? await sqlQuery<Document>(db, query, [workspaceId])
      : await sqlQuery<Document>(db, query);
    return rows;
  } catch {
    return [];
  }
}

export async function saveDocuments(documents: Document[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await getSqliteDb();
    db.run("DELETE FROM documents");
    for (const doc of documents) {
      db.run(
        "INSERT INTO documents (id, title, content, createdAt, workspaceId, folderId) VALUES (?, ?, ?, ?, ?, ?)",
        [doc.id, doc.title, doc.content, doc.createdAt, doc.workspaceId, doc.folderId]
      );
    }
    await saveSqliteDb(db);
  } catch {
    // Storage full or disabled
  }
}

function makeTitleUnique(
  title: string,
  existingTitles: string[]
): string {
  const lower = title.toLowerCase();
  const existingLower = new Set(existingTitles.map((t) => t.toLowerCase()));
  if (!existingLower.has(lower)) return title;
  for (let n = 1; ; n++) {
    const candidate = `${title} (${n})`;
    if (!existingLower.has(candidate.toLowerCase())) return candidate;
  }
}

export async function addDocument(
  doc: Omit<Document, "id" | "createdAt">,
  options?: { workspaceId?: string; folderId?: string | null }
): Promise<Document> {
  const workspaceId = options?.workspaceId ?? doc.workspaceId ?? "default";
  const folderId = options?.folderId ?? doc.folderId ?? null;

  const docsInLocation = await getDocumentsInFolder(workspaceId, folderId);
  const titleTrimmed = doc.title.trim();
  const titleLower = titleTrimmed.toLowerCase();
  const isDuplicate = docsInLocation.some(
    (d) => (d.title ?? "").toLowerCase() === titleLower
  );
  if (isDuplicate) {
    throw new DuplicateNameError(`A file named "${titleTrimmed || doc.title}" with the same title already exists in this location.`);
  }

  const newDoc: Document = {
    ...doc,
    title: titleTrimmed || doc.title,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    workspaceId,
    folderId,
  };
  const db = await getSqliteDb();
  db.run(
    "INSERT INTO documents (id, title, content, createdAt, workspaceId, folderId) VALUES (?, ?, ?, ?, ?, ?)",
    [newDoc.id, newDoc.title, newDoc.content, newDoc.createdAt, workspaceId, folderId]
  );
  await saveSqliteDb(db);
  return newDoc;
}

export async function updateDocument(
  id: string,
  updates: Partial<Pick<Document, "title" | "content">>
): Promise<Document | null> {
  const documents = await getDocuments();
  const index = documents.findIndex((d) => d.id === id);
  if (index === -1) return null;
  const doc = documents[index];
  if (updates.title !== undefined) {
    const titleTrimmed = updates.title.trim();
    const titleLower = titleTrimmed.toLowerCase();
    const duplicate = documents.find(
      (d) =>
        d.id !== id &&
        d.workspaceId === doc.workspaceId &&
        d.folderId === doc.folderId &&
        d.title.toLowerCase() === titleLower
    );
    if (duplicate) {
      throw new DuplicateNameError(`A file named "${titleTrimmed || updates.title}" with the same title already exists in this location.`);
    }
    documents[index] = { ...doc, ...updates, title: titleTrimmed || updates.title };
  } else {
    documents[index] = { ...doc, ...updates };
  }
  await saveDocuments(documents);
  return documents[index];
}

export async function moveDocument(
  id: string,
  workspaceId: string,
  folderId: string | null
): Promise<Document | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = await getSqliteDb();
    db.run(
      "UPDATE documents SET workspaceId = ?, folderId = ? WHERE id = ?",
      [workspaceId, folderId, id]
    );
    await saveSqliteDb(db);
    return getDocument(id);
  } catch {
    return null;
  }
}

export async function getWorkspaces(): Promise<Workspace[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await getSqliteDb();
    return await sqlQuery<Workspace>(
      db,
      "SELECT id, name, createdAt FROM workspaces ORDER BY createdAt ASC"
    );
  } catch {
    return [];
  }
}

export async function addWorkspace(name: string): Promise<Workspace> {
  const existing = await getWorkspaces();
  const nameLower = name.trim().toLowerCase();
  if (existing.some((w) => w.name.toLowerCase() === nameLower)) {
    throw new DuplicateNameError(`A workspace named "${name.trim()}" already exists.`);
  }
  const ws: Workspace = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  const db = await getSqliteDb();
  db.run(
    "INSERT INTO workspaces (id, name, createdAt) VALUES (?, ?, ?)",
    [ws.id, ws.name, ws.createdAt]
  );
  await saveSqliteDb(db);
  return ws;
}

export async function updateWorkspace(id: string, name: string): Promise<void> {
  const existing = await getWorkspaces();
  const nameLower = name.trim().toLowerCase();
  const duplicate = existing.find((w) => w.id !== id && w.name.toLowerCase() === nameLower);
  if (duplicate) {
    throw new DuplicateNameError(`A workspace named "${name.trim()}" already exists.`);
  }
  const db = await getSqliteDb();
  db.run("UPDATE workspaces SET name = ? WHERE id = ?", [name.trim(), id]);
  await saveSqliteDb(db);
}

export async function deleteWorkspace(id: string): Promise<void> {
  const db = await getSqliteDb();
  db.run("DELETE FROM workspaces WHERE id = ?", [id]);
  db.run("DELETE FROM folders WHERE workspaceId = ?", [id]);
  db.run("DELETE FROM documents WHERE workspaceId = ?", [id]);
  await saveSqliteDb(db);
}

export async function deleteAllData(): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await getSqliteDb();
  db.run("DELETE FROM documents");
  db.run("DELETE FROM folders");
  db.run("DELETE FROM workspaces");
  db.run(
    "INSERT INTO workspaces (id, name, createdAt) VALUES ('default', 'Default', ?)",
    [Date.now()]
  );
  await saveSqliteDb(db);
}

export async function updateFolder(id: string, name: string): Promise<void> {
  const db = await getSqliteDb();
  const rows = await sqlQuery<Folder>(db, "SELECT id, workspaceId, parentFolderId, name, createdAt FROM folders WHERE id = ?", [id]);
  const folder = rows[0];
  if (!folder) return;
  const siblings = await getFolders(folder.workspaceId, folder.parentFolderId);
  const nameLower = name.trim().toLowerCase();
  if (siblings.some((f) => f.id !== id && f.name.toLowerCase() === nameLower)) {
    throw new DuplicateNameError(`A folder named "${name.trim()}" already exists in this location.`);
  }
  db.run("UPDATE folders SET name = ? WHERE id = ?", [name.trim(), id]);
  await saveSqliteDb(db);
}

export async function getAllFolders(workspaceId: string): Promise<Folder[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await getSqliteDb();
    return await sqlQuery<Folder>(
      db,
      "SELECT id, workspaceId, parentFolderId, name, createdAt FROM folders WHERE workspaceId = ? ORDER BY name ASC",
      [workspaceId]
    );
  } catch {
    return [];
  }
}

export async function getFolders(workspaceId: string, parentFolderId: string | null = null): Promise<Folder[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await getSqliteDb();
    if (parentFolderId === null) {
      return await sqlQuery<Folder>(
        db,
        "SELECT id, workspaceId, parentFolderId, name, createdAt FROM folders WHERE workspaceId = ? AND parentFolderId IS NULL ORDER BY name ASC",
        [workspaceId]
      );
    }
    return await sqlQuery<Folder>(
      db,
      "SELECT id, workspaceId, parentFolderId, name, createdAt FROM folders WHERE workspaceId = ? AND parentFolderId = ? ORDER BY name ASC",
      [workspaceId, parentFolderId]
    );
  } catch {
    return [];
  }
}

export async function addFolder(
  workspaceId: string,
  name: string,
  parentFolderId: string | null = null
): Promise<Folder> {
  const siblings = await getFolders(workspaceId, parentFolderId);
  const nameLower = name.trim().toLowerCase();
  if (siblings.some((f) => f.name.toLowerCase() === nameLower)) {
    throw new DuplicateNameError(`A folder named "${name.trim()}" already exists in this location.`);
  }
  const folder: Folder = {
    id: crypto.randomUUID(),
    workspaceId,
    parentFolderId,
    name: name.trim(),
    createdAt: Date.now(),
  };
  const db = await getSqliteDb();
  db.run(
    "INSERT INTO folders (id, workspaceId, parentFolderId, name, createdAt) VALUES (?, ?, ?, ?, ?)",
    [folder.id, folder.workspaceId, folder.parentFolderId, folder.name, folder.createdAt]
  );
  await saveSqliteDb(db);
  return folder;
}

async function collectFolderIds(db: Awaited<ReturnType<typeof getSqliteDb>>, parentId: string): Promise<string[]> {
  const children = await sqlQuery<{ id: string }>(db, "SELECT id FROM folders WHERE parentFolderId = ?", [parentId]);
  const ids = [parentId];
  for (const c of children) {
    ids.push(...(await collectFolderIds(db, c.id)));
  }
  return ids;
}

/** Move a folder (and its subtree) to another workspace root or parent folder. */
export async function moveFolder(
  id: string,
  targetWorkspaceId: string,
  targetParentFolderId: string | null
): Promise<Folder | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = await getSqliteDb();
    const rows = await sqlQuery<Folder>(
      db,
      "SELECT id, workspaceId, parentFolderId, name, createdAt FROM folders WHERE id = ?",
      [id]
    );
    const folder = rows[0];
    if (!folder) return null;

    if (targetParentFolderId === id) return null;

    const subtreeIds = await collectFolderIds(db, id);
    if (targetParentFolderId && subtreeIds.includes(targetParentFolderId)) return null;

    if (targetParentFolderId) {
      const parentRows = await sqlQuery<Pick<Folder, "id" | "workspaceId">>(
        db,
        "SELECT id, workspaceId FROM folders WHERE id = ?",
        [targetParentFolderId]
      );
      const p = parentRows[0];
      if (!p || p.workspaceId !== targetWorkspaceId) return null;
    }

    const siblings = await getFolders(targetWorkspaceId, targetParentFolderId);
    const nameLower = folder.name.toLowerCase();
    if (siblings.some((f) => f.id !== id && f.name.toLowerCase() === nameLower)) {
      throw new DuplicateNameError(`A folder named "${folder.name}" already exists in this location.`);
    }

    if (folder.workspaceId === targetWorkspaceId && folder.parentFolderId === targetParentFolderId) {
      return folder;
    }

    for (const fid of subtreeIds) {
      db.run("UPDATE folders SET workspaceId = ? WHERE id = ?", [targetWorkspaceId, fid]);
    }
    db.run("UPDATE folders SET parentFolderId = ? WHERE id = ?", [targetParentFolderId, id]);

    for (const fid of subtreeIds) {
      db.run("UPDATE documents SET workspaceId = ? WHERE folderId = ?", [targetWorkspaceId, fid]);
    }

    await saveSqliteDb(db);
    const moved = await sqlQuery<Folder>(
      db,
      "SELECT id, workspaceId, parentFolderId, name, createdAt FROM folders WHERE id = ?",
      [id]
    );
    return moved[0] ?? null;
  } catch (e) {
    if (e instanceof DuplicateNameError) throw e;
    return null;
  }
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getSqliteDb();
  const ids = await collectFolderIds(db, id);
  for (const folderId of ids) {
    db.run("DELETE FROM documents WHERE folderId = ?", [folderId]);
    db.run("DELETE FROM folders WHERE id = ?", [folderId]);
  }
  await saveSqliteDb(db);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getSqliteDb();
  db.run("DELETE FROM documents WHERE id = ?", [id]);
  await saveSqliteDb(db);
}

export async function getDocumentsInFolder(
  workspaceId: string,
  folderId: string | null
): Promise<Document[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await getSqliteDb();
    if (folderId === null) {
      return await sqlQuery<Document>(
        db,
        "SELECT id, title, content, createdAt, workspaceId, folderId FROM documents WHERE workspaceId = ? AND folderId IS NULL ORDER BY createdAt DESC",
        [workspaceId]
      );
    }
    return await sqlQuery<Document>(
      db,
      "SELECT id, title, content, createdAt, workspaceId, folderId FROM documents WHERE workspaceId = ? AND folderId = ? ORDER BY createdAt DESC",
      [workspaceId, folderId]
    );
  } catch {
    return [];
  }
}

export async function getDocument(id: string): Promise<Document | null> {
  const db = await getSqliteDb();
  const rows = await sqlQuery<Document>(
    db,
    "SELECT id, title, content, createdAt, workspaceId, folderId FROM documents WHERE id = ?",
    [id]
  );
  return rows[0] ?? null;
}

export interface WorkspaceExport {
  version: number;
  exportedAt: number;
  workspace: Workspace;
  folders: Folder[];
  documents: Document[];
}

export async function exportWorkspaceData(workspaceId: string): Promise<WorkspaceExport | null> {
  if (typeof window === "undefined") return null;
  try {
    const [workspaces, folders, documents] = await Promise.all([
      getWorkspaces(),
      getAllFolders(workspaceId),
      getDocuments(workspaceId),
    ]);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return null;
    return {
      version: 1,
      exportedAt: Date.now(),
      workspace,
      folders,
      documents,
    };
  } catch {
    return null;
  }
}

export interface AllWorkspacesExport {
  version: number;
  exportedAt: number;
  type: "all";
  workspaces: WorkspaceExport[];
}

export async function exportAllWorkspacesData(): Promise<AllWorkspacesExport | null> {
  if (typeof window === "undefined") return null;
  try {
    const workspaces = await getWorkspaces();
    const exports: WorkspaceExport[] = [];
    for (const ws of workspaces) {
      const data = await exportWorkspaceData(ws.id);
      if (data) exports.push(data);
    }
    return {
      version: 1,
      exportedAt: Date.now(),
      type: "all",
      workspaces: exports,
    };
  } catch {
    return null;
  }
}

export async function exportWorkspacesData(
  workspaceIds: string[]
): Promise<AllWorkspacesExport | null> {
  if (typeof window === "undefined" || workspaceIds.length === 0) return null;
  try {
    const exports: WorkspaceExport[] = [];
    for (const id of workspaceIds) {
      const data = await exportWorkspaceData(id);
      if (data) exports.push(data);
    }
    if (exports.length === 0) return null;
    return {
      version: 1,
      exportedAt: Date.now(),
      type: "all",
      workspaces: exports,
    };
  } catch {
    return null;
  }
}

export async function importWorkspaceData(
  data: WorkspaceExport
): Promise<{ workspace: Workspace } | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = await getSqliteDb();
    const existingWorkspaces = await getWorkspaces();
    const existingByName = new Map(existingWorkspaces.map((w) => [w.name.toLowerCase(), w]));
    const targetWorkspace = existingByName.get(data.workspace.name.toLowerCase());
    let targetWorkspaceId: string;
    let targetWorkspaceObj: Workspace;

    if (targetWorkspace) {
      targetWorkspaceId = targetWorkspace.id;
      targetWorkspaceObj = targetWorkspace;
    } else {
      targetWorkspaceId = crypto.randomUUID();
      targetWorkspaceObj = {
        id: targetWorkspaceId,
        name: data.workspace.name,
        createdAt: Date.now(),
      };
      db.run(
        "INSERT INTO workspaces (id, name, createdAt) VALUES (?, ?, ?)",
        [targetWorkspaceObj.id, targetWorkspaceObj.name, targetWorkspaceObj.createdAt]
      );
    }

    const existingDocsInWorkspace = await getDocuments(targetWorkspaceId);
    const titlesByFolder = new Map<string | null, Set<string>>();
    for (const d of existingDocsInWorkspace) {
      const key = d.folderId;
      if (!titlesByFolder.has(key)) titlesByFolder.set(key, new Set());
      titlesByFolder.get(key)!.add(d.title.toLowerCase());
    }

    const oldToNewFolderId = new Map<string, string>();
    const childrenByParent = new Map<string | null, Folder[]>();
    for (const f of data.folders) {
      const key = f.parentFolderId;
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key)!.push(f);
    }
    const queue: (string | null)[] = [null];
    const sortedFolders: Folder[] = [];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = childrenByParent.get(parentId) ?? [];
      for (const folder of children) {
        sortedFolders.push(folder);
        queue.push(folder.id);
      }
    }
    for (const folder of sortedFolders) {
      const newFolderId = crypto.randomUUID();
      const newParentId =
        folder.parentFolderId === null
          ? null
          : oldToNewFolderId.get(folder.parentFolderId) ?? null;
      oldToNewFolderId.set(folder.id, newFolderId);
      db.run(
        "INSERT INTO folders (id, workspaceId, parentFolderId, name, createdAt) VALUES (?, ?, ?, ?, ?)",
        [newFolderId, targetWorkspaceId, newParentId, folder.name, Date.now()]
      );
    }

    for (const doc of data.documents) {
      const newDocId = crypto.randomUUID();
      const newFolderId =
        doc.folderId === null ? null : oldToNewFolderId.get(doc.folderId) ?? null;
      const existingTitles = Array.from(titlesByFolder.get(newFolderId) ?? []);
      const uniqueTitle = makeTitleUnique(doc.title, existingTitles);
      titlesByFolder.set(newFolderId, new Set([...titlesByFolder.get(newFolderId) ?? [], uniqueTitle.toLowerCase()]));
      db.run(
        "INSERT INTO documents (id, title, content, createdAt, workspaceId, folderId) VALUES (?, ?, ?, ?, ?, ?)",
        [newDocId, uniqueTitle, doc.content, doc.createdAt, targetWorkspaceId, newFolderId]
      );
    }
    await saveSqliteDb(db);
    return { workspace: targetWorkspaceObj };
  } catch {
    return null;
  }
}

export async function importAllWorkspacesData(
  data: AllWorkspacesExport
): Promise<Workspace[]> {
  const imported: Workspace[] = [];
  for (const wsExport of data.workspaces) {
    const result = await importWorkspaceData(wsExport);
    if (result) imported.push(result.workspace);
  }
  return imported;
}

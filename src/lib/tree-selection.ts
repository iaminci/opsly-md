import type { Document } from "@/types/document";
import type { Folder } from "@/types/workspace";

export type TreeSelectKey = `folder:${string}` | `document:${string}`;

export function treeSelectKey(type: "folder" | "document", id: string): TreeSelectKey {
  return `${type}:${id}`;
}

export function parseTreeSelectKey(key: TreeSelectKey): {
  type: "folder" | "document";
  id: string;
} {
  const colon = key.indexOf(":");
  return {
    type: key.slice(0, colon) as "folder" | "document",
    id: key.slice(colon + 1),
  };
}

export function isModifierToggleClick(event: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return event.metaKey || event.ctrlKey;
}

export function isRangeSelectClick(event: { shiftKey: boolean }): boolean {
  return event.shiftKey;
}

export function getFolderDescendants(
  workspaceId: string,
  folderId: string,
  getFoldersFlat: (workspaceId: string) => Folder[],
  documents: Document[]
): { folderIds: string[]; documentIds: string[] } {
  const allFolders = getFoldersFlat(workspaceId);
  const descendantFolderIds: string[] = [];

  function collectDescendantFolders(parentId: string) {
    for (const folder of allFolders) {
      if (folder.parentFolderId === parentId) {
        descendantFolderIds.push(folder.id);
        collectDescendantFolders(folder.id);
      }
    }
  }

  collectDescendantFolders(folderId);
  const folderIds = [folderId, ...descendantFolderIds];
  const folderIdSet = new Set(folderIds);
  const documentIds = documents
    .filter(
      (doc) =>
        doc.workspaceId === workspaceId &&
        doc.folderId != null &&
        folderIdSet.has(doc.folderId)
    )
    .map((doc) => doc.id);

  return { folderIds, documentIds };
}

function folderByIdMap(folders: Folder[]): Map<string, Folder> {
  return new Map(folders.map((folder) => [folder.id, folder]));
}

export function isDocUnderSelectedFolder(
  doc: Document,
  selectedFolderIds: Set<string>,
  getFoldersFlat: (workspaceId: string) => Folder[]
): boolean {
  if (!doc.folderId) return false;
  const folders = folderByIdMap(getFoldersFlat(doc.workspaceId));
  let current: string | null = doc.folderId;
  while (current) {
    if (selectedFolderIds.has(current)) return true;
    current = folders.get(current)?.parentFolderId ?? null;
  }
  return false;
}

function isFolderUnderSelectedFolderInList(
  folderId: string,
  selectedFolderIds: Set<string>,
  folders: Folder[]
): boolean {
  const byId = folderByIdMap(folders);
  let current: string | null = byId.get(folderId)?.parentFolderId ?? null;
  while (current) {
    if (selectedFolderIds.has(current)) return true;
    current = byId.get(current)?.parentFolderId ?? null;
  }
  return false;
}

export function buildVisibleTreeOrder(
  workspaceIds: string[],
  expandedWorkspaceIds: string[],
  expandedFolderIds: string[],
  getFolders: (workspaceId: string, parentFolderId: string | null) => Folder[],
  getDocuments: (workspaceId: string, folderId: string | null) => Document[],
  options: { singleWorkspaceView: boolean }
): TreeSelectKey[] {
  const order: TreeSelectKey[] = [];
  const expandedWorkspaceSet = new Set(expandedWorkspaceIds);
  const expandedFolderSet = new Set(expandedFolderIds);

  function walkFolder(workspaceId: string, folderId: string | null) {
    const folders = getFolders(workspaceId, folderId);
    const docs = getDocuments(workspaceId, folderId);

    for (const folder of folders) {
      order.push(treeSelectKey("folder", folder.id));
      if (expandedFolderSet.has(folder.id)) {
        walkFolder(workspaceId, folder.id);
      }
    }

    for (const doc of docs) {
      order.push(treeSelectKey("document", doc.id));
    }
  }

  for (const workspaceId of workspaceIds) {
    if (!options.singleWorkspaceView && !expandedWorkspaceSet.has(workspaceId)) {
      continue;
    }
    walkFolder(workspaceId, null);
  }

  return order;
}

export function getRangeSelection(
  order: TreeSelectKey[],
  anchor: TreeSelectKey,
  target: TreeSelectKey
): TreeSelectKey[] {
  const anchorIndex = order.indexOf(anchor);
  const targetIndex = order.indexOf(target);
  if (anchorIndex === -1 || targetIndex === -1) return [target];
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return order.slice(start, end + 1);
}

export function keysToSelectionSets(keys: TreeSelectKey[]): {
  folderIds: Set<string>;
  documentIds: Set<string>;
} {
  const folderIds = new Set<string>();
  const documentIds = new Set<string>();
  for (const key of keys) {
    const { type, id } = parseTreeSelectKey(key);
    if (type === "folder") folderIds.add(id);
    else documentIds.add(id);
  }
  return { folderIds, documentIds };
}

export function expandFoldersInSelection(
  folderIds: Set<string>,
  documentIds: Set<string>,
  documents: Document[],
  getFoldersFlat: (workspaceId: string) => Folder[],
  folders: Folder[]
): { folderIds: Set<string>; documentIds: Set<string> } {
  const nextFolderIds = new Set(folderIds);
  const nextDocumentIds = new Set(documentIds);
  const folderById = folderByIdMap(folders);

  for (const folderId of folderIds) {
    const folder = folderById.get(folderId);
    if (!folder) continue;
    const descendants = getFolderDescendants(
      folder.workspaceId,
      folderId,
      getFoldersFlat,
      documents
    );
    for (const id of descendants.folderIds) nextFolderIds.add(id);
    for (const id of descendants.documentIds) nextDocumentIds.add(id);
  }

  return { folderIds: nextFolderIds, documentIds: nextDocumentIds };
}

export function toggleFolderInSelection(
  folder: Folder,
  selectedFolderIds: Set<string>,
  selectedDocumentIds: Set<string>,
  documents: Document[],
  getFoldersFlat: (workspaceId: string) => Folder[]
): { folderIds: Set<string>; documentIds: Set<string> } {
  const { folderIds, documentIds } = getFolderDescendants(
    folder.workspaceId,
    folder.id,
    getFoldersFlat,
    documents
  );
  const isSelected = selectedFolderIds.has(folder.id);
  const nextFolderIds = new Set(selectedFolderIds);
  const nextDocumentIds = new Set(selectedDocumentIds);

  for (const id of folderIds) {
    if (isSelected) nextFolderIds.delete(id);
    else nextFolderIds.add(id);
  }
  for (const id of documentIds) {
    if (isSelected) nextDocumentIds.delete(id);
    else nextDocumentIds.add(id);
  }

  return { folderIds: nextFolderIds, documentIds: nextDocumentIds };
}

export function countSelectedItems(
  selectedFolderIds: Set<string>,
  selectedDocumentIds: Set<string>,
  documents: Document[],
  folders: Folder[]
): number {
  let count = 0;
  const getFoldersFlat = (workspaceId: string) =>
    folders.filter((folder) => folder.workspaceId === workspaceId);

  for (const folderId of selectedFolderIds) {
    if (!folders.some((folder) => folder.id === folderId)) continue;
    if (!isFolderUnderSelectedFolderInList(folderId, selectedFolderIds, folders)) {
      count++;
    }
  }

  for (const docId of selectedDocumentIds) {
    const doc = documents.find((item) => item.id === docId);
    if (doc && !isDocUnderSelectedFolder(doc, selectedFolderIds, getFoldersFlat)) {
      count++;
    }
  }

  return count;
}

export function planBulkDelete(
  selectedFolderIds: Set<string>,
  selectedDocumentIds: Set<string>,
  documents: Document[],
  getFoldersFlat: (workspaceId: string) => Folder[]
): { folderIds: string[]; documentIds: string[] } {
  const allFolders: Folder[] = [];
  const workspaceIds = new Set(documents.map((doc) => doc.workspaceId));
  for (const workspaceId of workspaceIds) {
    allFolders.push(...getFoldersFlat(workspaceId));
  }

  const folderIds = Array.from(selectedFolderIds).filter(
    (folderId) =>
      !isFolderUnderSelectedFolderInList(folderId, selectedFolderIds, allFolders)
  );
  const documentIds = Array.from(selectedDocumentIds).filter((docId) => {
    const doc = documents.find((item) => item.id === docId);
    if (!doc) return false;
    return !isDocUnderSelectedFolder(doc, selectedFolderIds, getFoldersFlat);
  });

  return { folderIds, documentIds };
}

export const TREE_DRAG_DOCUMENT_TYPE = "application/x-md-viewer-document";
export const TREE_DRAG_FOLDER_TYPE = "application/x-md-viewer-folder";

export function isTreeDocumentDrag(e: React.DragEvent | DragEvent): boolean {
  const types = Array.from(e.dataTransfer?.types ?? []);
  return types.includes(TREE_DRAG_DOCUMENT_TYPE);
}

export function isTreeDrag(e: React.DragEvent | DragEvent): boolean {
  const types = Array.from(e.dataTransfer?.types ?? []);
  return (
    types.includes(TREE_DRAG_DOCUMENT_TYPE) ||
    types.includes(TREE_DRAG_FOLDER_TYPE)
  );
}

/** Read document id set during sidebar tree drag (custom MIME + text/plain fallback). */
export function getTreeDocumentDragId(e: React.DragEvent | DragEvent): string | null {
  const transfer = e.dataTransfer;
  if (!transfer) return null;
  const custom = transfer.getData(TREE_DRAG_DOCUMENT_TYPE);
  if (custom) return custom;
  const plain = transfer.getData("text/plain");
  return plain || null;
}

/** Payload for sidebar document drag — use on dragstart. */
export function setTreeDocumentDragData(
  transfer: DataTransfer,
  docId: string
): void {
  transfer.setData(TREE_DRAG_DOCUMENT_TYPE, docId);
  transfer.setData("text/plain", docId);
}

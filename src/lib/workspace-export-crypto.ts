import {
  decryptDocument,
  encryptDocument,
  isEncryptedDocument,
} from "opsly-mask/crypto";

import { serializeEncryptedDocument } from "@/features/document-encryption/stored-content";
import type { AllWorkspacesExport, WorkspaceExport } from "@/lib/storage";

export async function encryptWorkspaceExport(
  exportData: AllWorkspacesExport | WorkspaceExport,
  passphrase: string
): Promise<string> {
  const payload = await encryptDocument(JSON.stringify(exportData), passphrase);
  return serializeEncryptedDocument(payload);
}

export async function decryptWorkspaceExport(
  raw: string,
  passphrase: string
): Promise<AllWorkspacesExport | WorkspaceExport> {
  const parsed: unknown = JSON.parse(raw);
  if (!isEncryptedDocument(parsed)) {
    throw new Error("Not an encrypted workspace export");
  }
  const plaintext = await decryptDocument(parsed, passphrase);
  return JSON.parse(plaintext) as AllWorkspacesExport | WorkspaceExport;
}

export function isEncryptedWorkspaceExport(raw: string): boolean {
  try {
    return isEncryptedDocument(JSON.parse(raw));
  } catch {
    return false;
  }
}

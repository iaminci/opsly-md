import {
  isEncryptedDocument,
  type EncryptedDocument,
} from "opsly-mask/crypto";

export type ParsedStoredContent =
  | { kind: "plain"; content: string }
  | { kind: "encrypted"; payload: EncryptedDocument };

export function parseStoredContent(raw: string): ParsedStoredContent {
  if (!raw.trim()) {
    return { kind: "plain", content: raw };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isEncryptedDocument(parsed)) {
      return { kind: "encrypted", payload: parsed };
    }
  } catch {
    // Not JSON — treat as plain markdown.
  }

  return { kind: "plain", content: raw };
}

export function isStoredContentEncrypted(raw: string): boolean {
  return parseStoredContent(raw).kind === "encrypted";
}

/** Persist an encrypted payload exactly as produced by Opsly Mask. */
export function serializeEncryptedDocument(payload: EncryptedDocument): string {
  return JSON.stringify(payload);
}

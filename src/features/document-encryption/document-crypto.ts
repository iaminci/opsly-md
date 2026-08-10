import {
  decryptDocument,
  encryptDocument,
  type EncryptedDocument,
} from "opsly-mask/crypto";

import {
  serializeEncryptedDocument,
  type ParsedStoredContent,
} from "./stored-content";

export async function encryptMarkdown(
  markdown: string,
  passphrase: string
): Promise<string> {
  const payload = await encryptDocument(markdown, passphrase);
  return serializeEncryptedDocument(payload);
}

export async function decryptStoredContent(
  parsed: Extract<ParsedStoredContent, { kind: "encrypted" }>,
  passphrase: string
): Promise<string> {
  return decryptDocument(parsed.payload, passphrase);
}

export type { EncryptedDocument };

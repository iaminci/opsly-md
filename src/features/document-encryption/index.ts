export { DocumentSecurityState, type SaveContentDecision } from "./types";
export { MIN_PASSPHRASE_LENGTH } from "./config";
export { hasSecureBlocks } from "./secure-blocks";
export {
  parseStoredContent,
  isStoredContentEncrypted,
  serializeEncryptedDocument,
  type ParsedStoredContent,
} from "./stored-content";
export {
  encryptMarkdown,
  decryptStoredContent,
  type EncryptedDocument,
} from "./document-crypto";
export {
  validatePassphrase,
  validatePassphraseMatch,
  validatePassphraseForUnlock,
} from "./passphrase-validation";
export { useDocumentEncryption } from "./useDocumentEncryption";
export type {
  DocumentEncryptionSession,
  UseDocumentEncryptionResult,
  DocumentEncryptionCallbacks,
} from "./useDocumentEncryption";
export { SecureBlocksDetectedDialog } from "./components/SecureBlocksDetectedDialog";
export { SetPassphraseDialog } from "./components/SetPassphraseDialog";
export { UnlockDocumentDialog } from "./components/UnlockDocumentDialog";
export { EncryptedDocumentPlaceholder } from "./components/EncryptedDocumentPlaceholder";
export {
  getStoredDownloadPayload,
  getExportMarkdownPayload,
  triggerBrowserDownload,
  type DownloadPayload,
} from "./download-export";
export { ExportMarkdownDialog } from "./components/ExportMarkdownDialog";
export { RemoveEncryptionDialog } from "./components/RemoveEncryptionDialog";
export { DocumentSecurityMenu } from "./components/DocumentSecurityMenu";
export type { DocumentSecurityMenuProps } from "./components/DocumentSecurityMenu";
export { DocumentDownloadButton } from "./components/DocumentDownloadButton";
export type { DocumentDownloadButtonProps } from "./components/DocumentDownloadButton";
export {
  buildEncryptionDetails,
  getSecurityStatusLabel,
  type EncryptionDetailsViewModel,
} from "./encryption-details";

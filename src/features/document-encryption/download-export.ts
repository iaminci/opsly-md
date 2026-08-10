import {
  toEncryptedDownloadFilename,
  toMarkdownDownloadFilename,
} from "@/lib/utils";
import { isStoredContentEncrypted } from "./stored-content";

export interface DownloadPayload {
  content: string;
  filename: string;
  mimeType: string;
}

/** Build a download from persisted storage (never decrypted editor content). */
export function getStoredDownloadPayload(
  storedContent: string,
  title: string
): DownloadPayload {
  if (isStoredContentEncrypted(storedContent)) {
    return {
      content: storedContent,
      filename: toEncryptedDownloadFilename(title),
      mimeType: "application/vnd.opsly+encrypted",
    };
  }
  return {
    content: storedContent,
    filename: toMarkdownDownloadFilename(title),
    mimeType: "text/markdown",
  };
}

/** Build an export from decrypted markdown (explicit export only). */
export function getExportMarkdownPayload(
  markdown: string,
  title: string
): DownloadPayload {
  return {
    content: markdown,
    filename: toMarkdownDownloadFilename(title),
    mimeType: "text/markdown",
  };
}

export function triggerBrowserDownload({
  content,
  filename,
  mimeType,
}: DownloadPayload): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Document } from "@/types/document";
import { DocumentEncryptionDialogs } from "./DocumentEncryptionDialogs";
import { decryptStoredContent, encryptMarkdown } from "./document-crypto";
import { hasSecureBlocks } from "./secure-blocks";
import {
  isStoredContentEncrypted,
  parseStoredContent,
} from "./stored-content";
import {
  DocumentSecurityState,
  type SaveContentDecision,
} from "./types";

interface PendingSaveRequest {
  markdown: string;
  resolve: (decision: SaveContentDecision) => void;
}

export interface DocumentEncryptionSession {
  documentId: string | null;
  securityState: DocumentSecurityState;
  /** Decrypted markdown shown in the editor (never written to storage directly). */
  displayContent: string;
  /** Raw content as stored in the database. */
  storedContent: string;
  /** Passphrase kept in memory while the document is unlocked. */
  passphrase: string | null;
  /** Timestamp of the most recent successful unlock for this document session. */
  lastUnlockedAt: number | null;
}

export interface UseDocumentEncryptionResult {
  session: DocumentEncryptionSession;
  isLocked: boolean;
  /** Call when a document is opened or switched. Returns display-ready content. */
  initializeForDocument: (doc: Document) => void;
  /** Clear in-memory passphrase and decrypted content (e.g. on close). */
  clearSession: () => void;
  /**
   * Resolve markdown to the string that should be persisted.
   * Shows encryption dialogs for interactive saves; returns null for skipped autosaves.
   */
  prepareContentForSave: (
    markdown: string,
    options?: { interactive?: boolean }
  ) => Promise<SaveContentDecision | null>;
  /** After a successful unlock from the dialog. */
  applyUnlock: (passphrase: string) => Promise<string>;
  /** Update session after a successful save. */
  onSaveSucceeded: (
    documentId: string,
    storedContent: string,
    displayMarkdown: string,
    passphrase?: string | null
  ) => void;
  dialogs: React.ReactNode;
  reopenUnlockDialog: () => void;
  unlockFocusRequest: number;
  lockDocument: () => void;
  openEncryptDocumentDialog: (markdown: string) => void;
  openRemoveEncryptionDialog: () => void;
}

export interface DocumentEncryptionCallbacks {
  onDocumentEncrypted?: (args: {
    documentId: string;
    encrypted: string;
    markdown: string;
    passphrase: string;
  }) => Promise<void>;
  onEncryptionRemoved?: (args: {
    documentId: string;
    markdown: string;
  }) => Promise<void>;
}

const EMPTY_SESSION: DocumentEncryptionSession = {
  documentId: null,
  securityState: DocumentSecurityState.NotEncrypted,
  displayContent: "",
  storedContent: "",
  passphrase: null,
  lastUnlockedAt: null,
};

export function useDocumentEncryption(
  currentDoc: Document | null,
  callbacks?: DocumentEncryptionCallbacks
): UseDocumentEncryptionResult {
  const [session, setSession] =
    useState<DocumentEncryptionSession>(EMPTY_SESSION);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const pendingSaveRef = useRef<PendingSaveRequest | null>(null);
  const pendingUnlockPassphraseRef = useRef<string | null>(null);
  const pendingDocumentEncryptRef = useRef<string | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [secureBlocksDialogOpen, setSecureBlocksDialogOpen] = useState(false);
  const [setPassphraseDialogOpen, setSetPassphraseDialogOpen] = useState(false);
  const [documentEncryptDialogOpen, setDocumentEncryptDialogOpen] = useState(false);
  const [unlockFocusRequest, setUnlockFocusRequest] = useState(0);
  const [removeEncryptionDialogOpen, setRemoveEncryptionDialogOpen] =
    useState(false);
  const [removeEncryptionSubmitting, setRemoveEncryptionSubmitting] =
    useState(false);

  const clearSession = useCallback(() => {
    setSession(EMPTY_SESSION);
    setSecureBlocksDialogOpen(false);
    setSetPassphraseDialogOpen(false);
    setDocumentEncryptDialogOpen(false);
    setRemoveEncryptionDialogOpen(false);
    pendingSaveRef.current = null;
    pendingUnlockPassphraseRef.current = null;
    pendingDocumentEncryptRef.current = null;
  }, []);

  const initializeForDocument = useCallback((doc: Document) => {
    pendingSaveRef.current = null;
    pendingUnlockPassphraseRef.current = null;
    setSecureBlocksDialogOpen(false);
    setSetPassphraseDialogOpen(false);

    const parsed = parseStoredContent(doc.content);
    if (parsed.kind === "encrypted") {
      setSession({
        documentId: doc.id,
        securityState: DocumentSecurityState.Encrypted,
        displayContent: "",
        storedContent: doc.content,
        passphrase: null,
        lastUnlockedAt: null,
      });
      return;
    }

    setSession({
      documentId: doc.id,
      securityState: DocumentSecurityState.NotEncrypted,
      displayContent: doc.content,
      storedContent: doc.content,
      passphrase: null,
      lastUnlockedAt: null,
    });
  }, []);

  const applyUnlock = useCallback(async (passphrase: string): Promise<string> => {
    const current = sessionRef.current;
    const parsed = parseStoredContent(current.storedContent);
    if (parsed.kind !== "encrypted") {
      throw new Error("Document is not encrypted.");
    }
    const decrypted = await decryptStoredContent(parsed, passphrase);
    setSession({
      documentId: current.documentId,
      securityState: DocumentSecurityState.Unlocked,
      displayContent: decrypted,
      storedContent: current.storedContent,
      passphrase,
      lastUnlockedAt: Date.now(),
    });
    return decrypted;
  }, []);

  const onSaveSucceeded = useCallback(
    (
      documentId: string,
      storedContent: string,
      displayMarkdown: string,
      passphrase?: string | null
    ) => {
      setSession((prev) => {
        const resolvedPassphrase =
          passphrase !== undefined ? passphrase : prev.passphrase;
        const encrypted = isStoredContentEncrypted(storedContent);
        const nextState = encrypted
          ? resolvedPassphrase
            ? DocumentSecurityState.Unlocked
            : DocumentSecurityState.Encrypted
          : DocumentSecurityState.NotEncrypted;

        return {
          documentId,
          securityState: nextState,
          displayContent: displayMarkdown,
          storedContent,
          passphrase:
            nextState === DocumentSecurityState.Unlocked
              ? resolvedPassphrase
              : null,
          lastUnlockedAt:
            nextState === DocumentSecurityState.Unlocked
              ? prev.lastUnlockedAt ?? Date.now()
              : prev.lastUnlockedAt,
        };
      });
    },
    []
  );

  const resolvePendingSave = useCallback((decision: SaveContentDecision) => {
    pendingSaveRef.current?.resolve(decision);
    pendingSaveRef.current = null;
    setSecureBlocksDialogOpen(false);
    setSetPassphraseDialogOpen(false);
  }, []);

  const prepareContentForSave = useCallback(
    async (
      markdown: string,
      options?: { interactive?: boolean }
    ): Promise<SaveContentDecision | null> => {
      const interactive = options?.interactive ?? true;
      const current = sessionRef.current;

      if (!hasSecureBlocks(markdown)) {
        return { action: "save", content: markdown };
      }

      if (
        current.securityState === DocumentSecurityState.Unlocked &&
        current.passphrase
      ) {
        const encrypted = await encryptMarkdown(markdown, current.passphrase);
        return {
          action: "save",
          content: encrypted,
          passphrase: current.passphrase,
        };
      }

      if (current.securityState === DocumentSecurityState.Encrypted) {
        if (!interactive) return null;
        throw new Error("Unlock the document before saving.");
      }

      if (!interactive) {
        // Background/autosave: persist markdown as-is when the document is not
        // encrypted at rest. Interactive saves still prompt for encryption.
        if (current.securityState === DocumentSecurityState.NotEncrypted) {
          return { action: "save", content: markdown };
        }
        return null;
      }

      return new Promise<SaveContentDecision>((resolve) => {
        pendingSaveRef.current = { markdown, resolve };
        setSecureBlocksDialogOpen(true);
      });
    },
    []
  );

  const handleEncryptChoice = useCallback(() => {
    setSecureBlocksDialogOpen(false);
    setSetPassphraseDialogOpen(true);
  }, []);

  const handleSaveWithoutEncryption = useCallback(() => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    resolvePendingSave({ action: "save", content: pending.markdown });
  }, [resolvePendingSave]);

  const handleSaveCancel = useCallback(() => {
    resolvePendingSave({ action: "cancel" });
  }, [resolvePendingSave]);

  const handleSetPassphraseSubmit = useCallback(
    async (passphrase: string) => {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      const encrypted = await encryptMarkdown(pending.markdown, passphrase);
      setSession((prev) => ({
        ...prev,
        securityState: DocumentSecurityState.Unlocked,
        displayContent: pending.markdown,
        passphrase,
        lastUnlockedAt: Date.now(),
      }));
      resolvePendingSave({
        action: "save",
        content: encrypted,
        passphrase,
      });
    },
    [resolvePendingSave]
  );

  const handleSetPassphraseCancel = useCallback(() => {
    setSetPassphraseDialogOpen(false);
    setSecureBlocksDialogOpen(true);
  }, []);

  const lockDocument = useCallback(() => {
    setSession((prev) => {
      if (prev.securityState !== DocumentSecurityState.Unlocked) return prev;
      return {
        ...prev,
        securityState: DocumentSecurityState.Encrypted,
        displayContent: "",
        passphrase: null,
      };
    });
  }, []);

  const reopenUnlockDialog = useCallback(() => {
    setUnlockFocusRequest((current) => current + 1);
  }, []);

  const openEncryptDocumentDialog = useCallback((markdown: string) => {
    pendingDocumentEncryptRef.current = markdown;
    setDocumentEncryptDialogOpen(true);
  }, []);

  const handleDocumentEncryptCancel = useCallback(() => {
    pendingDocumentEncryptRef.current = null;
    setDocumentEncryptDialogOpen(false);
  }, []);

  const handleDocumentEncryptSubmit = useCallback(async (passphrase: string) => {
    const markdown = pendingDocumentEncryptRef.current;
    const current = sessionRef.current;
    if (!markdown || !current.documentId) {
      throw new Error("No document content to encrypt.");
    }

    const encrypted = await encryptMarkdown(markdown, passphrase);
    await callbacksRef.current?.onDocumentEncrypted?.({
      documentId: current.documentId,
      encrypted,
      markdown,
      passphrase,
    });
    pendingDocumentEncryptRef.current = null;
    setDocumentEncryptDialogOpen(false);
  }, []);

  const openRemoveEncryptionDialog = useCallback(() => {
    if (sessionRef.current.securityState !== DocumentSecurityState.Unlocked) {
      return;
    }
    setRemoveEncryptionDialogOpen(true);
  }, []);

  const handleRemoveEncryptionConfirm = useCallback(async () => {
    const current = sessionRef.current;
    if (
      current.securityState !== DocumentSecurityState.Unlocked ||
      !current.documentId
    ) {
      return;
    }

    setRemoveEncryptionSubmitting(true);
    try {
      await callbacksRef.current?.onEncryptionRemoved?.({
        documentId: current.documentId,
        markdown: current.displayContent,
      });
      setRemoveEncryptionDialogOpen(false);
    } finally {
      setRemoveEncryptionSubmitting(false);
    }
  }, []);

  useEffect(() => {
    if (!currentDoc) {
      clearSession();
      return;
    }
    if (session.documentId !== currentDoc.id) {
      initializeForDocument(currentDoc);
    }
  }, [currentDoc, session.documentId, initializeForDocument, clearSession]);

  const isLocked =
    session.securityState === DocumentSecurityState.Encrypted;

  const dialogs = (
    <DocumentEncryptionDialogs
      secureBlocksDialogOpen={secureBlocksDialogOpen}
      setSecureBlocksDialogOpen={setSecureBlocksDialogOpen}
      setPassphraseDialogOpen={setPassphraseDialogOpen}
      setSetPassphraseDialogOpen={setSetPassphraseDialogOpen}
      documentEncryptDialogOpen={documentEncryptDialogOpen}
      setDocumentEncryptDialogOpen={setDocumentEncryptDialogOpen}
      removeEncryptionDialogOpen={removeEncryptionDialogOpen}
      setRemoveEncryptionDialogOpen={setRemoveEncryptionDialogOpen}
      removeEncryptionSubmitting={removeEncryptionSubmitting}
      onEncryptChoice={handleEncryptChoice}
      onSaveWithoutEncryption={handleSaveWithoutEncryption}
      onSaveCancel={handleSaveCancel}
      onSetPassphraseSubmit={handleSetPassphraseSubmit}
      onSetPassphraseCancel={handleSetPassphraseCancel}
      onDocumentEncryptSubmit={handleDocumentEncryptSubmit}
      onDocumentEncryptCancel={handleDocumentEncryptCancel}
      onRemoveEncryptionConfirm={() => void handleRemoveEncryptionConfirm()}
    />
  );

  return {
    session,
    isLocked,
    initializeForDocument,
    clearSession,
    prepareContentForSave,
    applyUnlock,
    onSaveSucceeded,
    dialogs,
    reopenUnlockDialog,
    unlockFocusRequest,
    lockDocument,
    openEncryptDocumentDialog,
    openRemoveEncryptionDialog,
  };
}

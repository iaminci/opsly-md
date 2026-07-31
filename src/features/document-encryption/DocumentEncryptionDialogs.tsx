"use client";

import { SecureBlocksDetectedDialog } from "./components/SecureBlocksDetectedDialog";
import { SetPassphraseDialog } from "./components/SetPassphraseDialog";
import { UnlockDocumentDialog } from "./components/UnlockDocumentDialog";
import { RemoveEncryptionDialog } from "./components/RemoveEncryptionDialog";

interface DocumentEncryptionDialogsProps {
  secureBlocksDialogOpen: boolean;
  setSecureBlocksDialogOpen: (open: boolean) => void;
  setPassphraseDialogOpen: boolean;
  setSetPassphraseDialogOpen: (open: boolean) => void;
  documentEncryptDialogOpen: boolean;
  setDocumentEncryptDialogOpen: (open: boolean) => void;
  unlockDialogOpen: boolean;
  setUnlockDialogOpen: (open: boolean) => void;
  removeEncryptionDialogOpen: boolean;
  setRemoveEncryptionDialogOpen: (open: boolean) => void;
  removeEncryptionSubmitting?: boolean;
  unlockDocumentTitle?: string;
  onEncryptChoice: () => void;
  onSaveWithoutEncryption: () => void;
  onSaveCancel: () => void;
  onSetPassphraseSubmit: (passphrase: string) => void | Promise<void>;
  onSetPassphraseCancel: () => void;
  onDocumentEncryptSubmit: (passphrase: string) => void | Promise<void>;
  onDocumentEncryptCancel: () => void;
  onUnlockSubmit: (passphrase: string) => void | Promise<void>;
  onUnlockCancel: () => void;
  onRemoveEncryptionConfirm: () => void;
}

export function DocumentEncryptionDialogs({
  secureBlocksDialogOpen,
  setSecureBlocksDialogOpen,
  setPassphraseDialogOpen,
  setSetPassphraseDialogOpen,
  documentEncryptDialogOpen,
  setDocumentEncryptDialogOpen,
  unlockDialogOpen,
  setUnlockDialogOpen,
  removeEncryptionDialogOpen,
  setRemoveEncryptionDialogOpen,
  removeEncryptionSubmitting = false,
  unlockDocumentTitle,
  onEncryptChoice,
  onSaveWithoutEncryption,
  onSaveCancel,
  onSetPassphraseSubmit,
  onSetPassphraseCancel,
  onDocumentEncryptSubmit,
  onDocumentEncryptCancel,
  onUnlockSubmit,
  onUnlockCancel,
  onRemoveEncryptionConfirm,
}: DocumentEncryptionDialogsProps) {
  return (
    <>
      <SecureBlocksDetectedDialog
        open={secureBlocksDialogOpen}
        onOpenChange={setSecureBlocksDialogOpen}
        onEncrypt={onEncryptChoice}
        onSaveWithoutEncryption={onSaveWithoutEncryption}
        onCancel={onSaveCancel}
      />
      <SetPassphraseDialog
        open={setPassphraseDialogOpen}
        onOpenChange={setSetPassphraseDialogOpen}
        onSubmit={onSetPassphraseSubmit}
        onCancel={onSetPassphraseCancel}
      />
      <SetPassphraseDialog
        open={documentEncryptDialogOpen}
        onOpenChange={setDocumentEncryptDialogOpen}
        onSubmit={onDocumentEncryptSubmit}
        onCancel={onDocumentEncryptCancel}
        title="Encrypt"
        description={
          <>
            Encrypt this document with a passphrase. The encrypted document
            will be stored as a <span className="font-mono">.opsly</span> file
            extension.
          </>
        }
        submitLabel="Encrypt"
        submittingLabel="Encrypting…"
      />
      <UnlockDocumentDialog
        open={unlockDialogOpen}
        documentTitle={unlockDocumentTitle}
        onOpenChange={setUnlockDialogOpen}
        onUnlock={onUnlockSubmit}
        onCancel={onUnlockCancel}
      />
      <RemoveEncryptionDialog
        open={removeEncryptionDialogOpen}
        onOpenChange={setRemoveEncryptionDialogOpen}
        onConfirm={onRemoveEncryptionConfirm}
        submitting={removeEncryptionSubmitting}
      />
    </>
  );
}

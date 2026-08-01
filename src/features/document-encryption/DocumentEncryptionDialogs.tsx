"use client";

import { SecureBlocksDetectedDialog } from "./components/SecureBlocksDetectedDialog";
import { SetPassphraseDialog } from "./components/SetPassphraseDialog";
import { RemoveEncryptionDialog } from "./components/RemoveEncryptionDialog";

interface DocumentEncryptionDialogsProps {
  secureBlocksDialogOpen: boolean;
  setSecureBlocksDialogOpen: (open: boolean) => void;
  setPassphraseDialogOpen: boolean;
  setSetPassphraseDialogOpen: (open: boolean) => void;
  documentEncryptDialogOpen: boolean;
  setDocumentEncryptDialogOpen: (open: boolean) => void;
  removeEncryptionDialogOpen: boolean;
  setRemoveEncryptionDialogOpen: (open: boolean) => void;
  removeEncryptionSubmitting?: boolean;
  onEncryptChoice: () => void;
  onSaveWithoutEncryption: () => void;
  onSaveCancel: () => void;
  onSetPassphraseSubmit: (passphrase: string) => void | Promise<void>;
  onSetPassphraseCancel: () => void;
  onDocumentEncryptSubmit: (passphrase: string) => void | Promise<void>;
  onDocumentEncryptCancel: () => void;
  onRemoveEncryptionConfirm: () => void;
}

export function DocumentEncryptionDialogs({
  secureBlocksDialogOpen,
  setSecureBlocksDialogOpen,
  setPassphraseDialogOpen,
  setSetPassphraseDialogOpen,
  documentEncryptDialogOpen,
  setDocumentEncryptDialogOpen,
  removeEncryptionDialogOpen,
  setRemoveEncryptionDialogOpen,
  removeEncryptionSubmitting = false,
  onEncryptChoice,
  onSaveWithoutEncryption,
  onSaveCancel,
  onSetPassphraseSubmit,
  onSetPassphraseCancel,
  onDocumentEncryptSubmit,
  onDocumentEncryptCancel,
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
      <RemoveEncryptionDialog
        open={removeEncryptionDialogOpen}
        onOpenChange={setRemoveEncryptionDialogOpen}
        onConfirm={onRemoveEncryptionConfirm}
        submitting={removeEncryptionSubmitting}
      />
    </>
  );
}

import { MIN_PASSPHRASE_LENGTH } from "./config";

export interface PassphraseValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassphrase(passphrase: string): PassphraseValidationResult {
  if (!passphrase) {
    return { valid: false, error: "Passphrase is required." };
  }
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return {
      valid: false,
      error: `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

export function validatePassphraseForUnlock(
  passphrase: string
): PassphraseValidationResult {
  if (!passphrase) {
    return { valid: false, error: "Passphrase is required." };
  }
  return { valid: true };
}

export function validatePassphraseMatch(
  passphrase: string,
  confirmPassphrase: string
): PassphraseValidationResult {
  const base = validatePassphrase(passphrase);
  if (!base.valid) return base;
  if (passphrase !== confirmPassphrase) {
    return { valid: false, error: "Passphrases do not match." };
  }
  return { valid: true };
}

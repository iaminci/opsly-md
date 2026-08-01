import { formatDistanceToNow } from "date-fns";
import { PBKDF2_ITERATIONS, type EncryptedDocument } from "opsly-mask/crypto";
import { parseStoredContent } from "./stored-content";
import { DocumentSecurityState } from "./types";

export interface EncryptionSpecLine {
  label: string;
  value: string;
}

export function getDefaultEncryptionSpecs(): EncryptionSpecLine[] {
  return [
    { label: "Algorithm", value: "AES-256-GCM" },
    { label: "Key derivation", value: "PBKDF2-SHA256" },
    { label: "Version", value: "v1" },
    { label: "Iterations", value: PBKDF2_ITERATIONS.toLocaleString() },
  ];
}

export interface EncryptionDetailsViewModel {
  status: string;
  algorithm?: string;
  keyDerivation?: string;
  encryptionVersion?: string;
  iterations?: number;
  unlocked?: boolean;
  unlockedLabel?: string;
  lastUnlockedLabel?: string | null;
}

function formatAlgorithm(algorithm: EncryptedDocument["algorithm"]): string {
  if (algorithm === "AES-GCM") return "AES-256-GCM";
  return algorithm;
}

function formatKeyDerivation(kdf: EncryptedDocument["kdf"]): string {
  if (kdf === "PBKDF2") return "PBKDF2-SHA256";
  return kdf;
}

function formatLastUnlocked(timestamp: number | null): string | null {
  if (timestamp == null) return null;
  return formatDistanceToNow(timestamp, { addSuffix: true });
}

export function buildEncryptionDetails(
  storedContent: string,
  securityState: DocumentSecurityState,
  lastUnlockedAt: number | null
): EncryptionDetailsViewModel {
  const parsed = parseStoredContent(storedContent);

  if (parsed.kind === "plain") {
    return { status: "Not Encrypted" };
  }

  const payload = parsed.payload;
  const isUnlocked = securityState === DocumentSecurityState.Unlocked;

  return {
    status: "Encrypted",
    algorithm: formatAlgorithm(payload.algorithm),
    keyDerivation: formatKeyDerivation(payload.kdf),
    encryptionVersion: `v${payload.version}`,
    iterations: payload.iterations,
    unlocked: isUnlocked,
    unlockedLabel: isUnlocked ? "Yes" : "No",
    lastUnlockedLabel: isUnlocked
      ? formatLastUnlocked(lastUnlockedAt) ?? "Just now"
      : lastUnlockedAt != null
        ? formatLastUnlocked(lastUnlockedAt)
        : null,
  };
}

export function getSecurityStatusLabel(
  securityState: DocumentSecurityState,
  isEncryptedAtRest: boolean
): string {
  if (!isEncryptedAtRest) return "Not Encrypted";
  if (securityState === DocumentSecurityState.Unlocked) return "Unlocked";
  return "Locked";
}

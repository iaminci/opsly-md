/** In-memory security state for the currently open document. */
export enum DocumentSecurityState {
  /** Plain markdown at rest; may or may not contain secure blocks. */
  NotEncrypted = "not_encrypted",
  /** Encrypted payload at rest; passphrase not yet supplied. */
  Encrypted = "encrypted",
  /** Encrypted payload at rest; decrypted markdown available in memory. */
  Unlocked = "unlocked",
}

export type SaveContentDecision =
  | { action: "save"; content: string; passphrase?: string }
  | { action: "cancel" };

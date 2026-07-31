/** Detect ```secure fenced blocks without a full markdown parse. */
export function hasSecureBlocks(markdown: string): boolean {
  return /```[ \t]*secure(?:[ \t]|$)/m.test(markdown);
}

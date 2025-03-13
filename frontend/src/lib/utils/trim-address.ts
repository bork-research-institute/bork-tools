/**
 * Trims a Solana address to show first n and last n characters with ellipsis in the middle
 * @param address The Solana address to trim
 * @param startLength Number of characters to show at start (default: 6)
 * @param endLength Number of characters to show at end (default: 4)
 * @returns Trimmed address string
 */
export function trimAddress(
  address: string,
  startLength = 6,
  endLength = 4,
): string {
  if (!address) {
    return '';
  }

  const start = address.slice(0, startLength);
  const end = address.slice(-endLength);

  return `${start}...${end}`;
}

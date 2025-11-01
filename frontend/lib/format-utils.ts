/**
 * Utility functions for formatting and censoring sensitive data
 */

/**
 * Censor a transaction hash, escrow ID, or address
 * Shows first 6 and last 4 characters with ellipsis in between
 * Example: "0x1234567890abcdef" -> "0x1234...cdef"
 * 
 * @param value - The value to censor
 * @param showFirst - Number of characters to show at start (default: 6)
 * @param showLast - Number of characters to show at end (default: 4)
 * @returns Censored string or "N/A" if value is empty/null/undefined
 */
export function censorId(
  value: string | null | undefined,
  showFirst: number = 6,
  showLast: number = 4
): string {
  if (!value || value === 'n/a' || value === 'N/A' || value === 'null' || value === 'undefined') {
    return 'N/A'
  }

  const str = String(value).trim()
  
  // If the string is short enough, don't censor it
  if (str.length <= showFirst + showLast) {
    return str
  }

  // Extract first and last parts
  const first = str.substring(0, showFirst)
  const last = str.substring(str.length - showLast)
  
  return `${first}...${last}`
}

/**
 * Format escrow ID for display
 * Handles different formats (hex, numeric, etc.)
 * 
 * @param escrowId - The escrow ID to format
 * @returns Formatted escrow ID string
 */
export function formatEscrowId(escrowId: string | null | undefined): string {
  if (!escrowId || escrowId === 'n/a' || escrowId === 'N/A') {
    return 'N/A'
  }
  return censorId(escrowId, 8, 6)
}

/**
 * Format transaction hash for display
 * 
 * @param txHash - The transaction hash to format
 * @returns Formatted transaction hash string
 */
export function formatTxHash(txHash: string | null | undefined): string {
  if (!txHash || txHash === 'n/a' || txHash === 'N/A') {
    return 'N/A'
  }
  return censorId(txHash, 10, 8)
}

/**
 * Format payment confirmation text with censored IDs
 * 
 * @param escrowId - Escrow ID
 * @param txHash - Transaction hash
 * @returns Formatted confirmation text
 */
export function formatPaymentConfirmation(
  escrowId: string | null | undefined,
  txHash: string | null | undefined
): string {
  const escrow = formatEscrowId(escrowId)
  const tx = formatTxHash(txHash)
  return `Transaction submitted. Escrow ID: ${escrow} | Tx: ${tx}`
}


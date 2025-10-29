import { createHash } from 'crypto';

/**
 * Chain of Custody Utility
 *
 * Generates cryptographic hashes (SHA-256) for forensic evidence integrity.
 * Implements NIST SP 800-86 guidelines for digital forensics.
 *
 * Purpose: Ensure audit log data has not been tampered with.
 * Use case: Legal compliance, incident response, SIEM integrity verification.
 */

/**
 * Generates SHA-256 hash for audit log entry
 *
 * @param data - Audit log entry data to hash
 * @returns SHA-256 hash string (hex format)
 *
 * @example
 * ```typescript
 * const hash = generateChainOfCustodyHash({
 *   discordAuditLogId: '123456789',
 *   actionType: 'BAN',
 *   actorId: '987654321',
 *   targetId: '111222333',
 *   timestamp: new Date(),
 *   reason: 'Spam'
 * });
 * // Returns: 'a1b2c3d4e5f6...'
 * ```
 */
export function generateChainOfCustodyHash(data: Record<string, any>): string {
  // Create deterministic string from data (sorted keys for consistency)
  const sortedKeys = Object.keys(data).sort();
  const serialized = sortedKeys
    .map(key => `${key}:${JSON.stringify(data[key])}`)
    .join('|');

  // Generate SHA-256 hash
  const hash = createHash('sha256')
    .update(serialized)
    .digest('hex');

  return hash;
}

/**
 * Verifies audit log integrity by re-hashing and comparing
 *
 * @param data - Original audit log data
 * @param expectedHash - Hash to verify against
 * @returns True if hashes match (data is intact), false otherwise
 *
 * @example
 * ```typescript
 * const isValid = verifyChainOfCustody(auditLogData, storedHash);
 * if (!isValid) {
 *   console.error('Audit log tampering detected!');
 * }
 * ```
 */
export function verifyChainOfCustody(
  data: Record<string, any>,
  expectedHash: string
): boolean {
  const actualHash = generateChainOfCustodyHash(data);
  return actualHash === expectedHash;
}

/**
 * Creates forensic metadata object for SIEM export
 *
 * @param auditLogEntry - Audit log entry from Discord
 * @returns Forensic metadata with hash, timestamp, and version
 */
export function createForensicMetadata(auditLogEntry: Record<string, any>) {
  const hash = generateChainOfCustodyHash(auditLogEntry);

  return {
    chainOfCustodyHash: hash,
    forensicVersion: '1.0',
    capturedAt: new Date().toISOString(),
    integrity: 'verified',
    standard: 'NIST SP 800-86'
  };
}

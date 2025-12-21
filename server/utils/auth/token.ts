import { randomBytes } from 'crypto'

/**
 * Generate a secure random token
 * @param length - Length of token in bytes (default: 32)
 * @returns Hex string token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

/**
 * Generate a short invite code (8 characters, URL-safe)
 */
export function generateInviteCode(): string {
  return randomBytes(6).toString('base64url').substring(0, 8)
}


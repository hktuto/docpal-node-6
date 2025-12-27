/**
 * UUID Generation Utilities
 * 
 * Using UUID v6 for time-ordered, sortable UUIDs
 * This is better for database performance than v4 (random)
 */

import { randomBytes } from 'crypto'

/**
 * Generate UUID v6 (time-ordered)
 * 
 * UUID v6 is similar to v1 but with better field ordering
 * Format: xxxxxxxx-xxxx-6xxx-xxxx-xxxxxxxxxxxx
 * 
 * Benefits:
 * - Time-ordered (sortable)
 * - Better database index performance
 * - Globally unique
 * - Compatible with standard UUID format
 */
export function generateUUIDv6(): string {
  const timestamp = Date.now()
  const timestampNs = timestamp * 1000000 // Convert to nanoseconds
  
  // Extract timestamp components
  const timeHigh = (timestampNs / 0x100000000) & 0xFFFFFFFF
  const timeMid = (timestampNs / 0x10000) & 0xFFFF
  const timeLow = timestampNs & 0x0FFF
  
  // Generate random bytes for clock sequence and node
  const rand = randomBytes(8)
  const clockSeq = ((rand[0] & 0x3F) << 8) | rand[1]
  const node = Buffer.from(rand.slice(2)).toString('hex')
  
  // Format as UUID v6
  const uuid = [
    timeHigh.toString(16).padStart(8, '0'),
    timeMid.toString(16).padStart(4, '0'),
    `6${timeLow.toString(16).padStart(3, '0')}`, // Version 6
    ((clockSeq >> 8) | 0x80).toString(16).padStart(2, '0') + (clockSeq & 0xFF).toString(16).padStart(2, '0'), // Variant 10
    node
  ].join('-')
  
  return uuid
}

/**
 * Generate UUID v7 (newer, even better time-ordered)
 * 
 * UUID v7 is the newest standard with millisecond precision
 * Format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
 * 
 * This is actually recommended over v6 for new projects
 */
export function generateUUIDv7(): string {
  const timestamp = Date.now()
  const rand = randomBytes(10)
  
  // Unix timestamp in milliseconds (48 bits)
  const timestampHex = timestamp.toString(16).padStart(12, '0')
  
  // Version and random data
  const version = '7'
  const rand12bits = ((rand[0] & 0x0F) << 8 | rand[1]).toString(16).padStart(3, '0')
  
  // Variant and more random data  
  const variant = ((rand[2] & 0x3F) | 0x80).toString(16).padStart(2, '0')
  const randBytes = Buffer.from(rand.slice(4)).toString('hex') // Fixed: slice(4) not slice(3)
  
  const uuid = [
    timestampHex.slice(0, 8),
    timestampHex.slice(8, 12),
    `${version}${rand12bits}`,
    `${variant}${rand[3].toString(16).padStart(2, '0')}`,
    randBytes  // Now correctly 12 hex chars (6 bytes from indices 4-9)
  ].join('-')
  
  return uuid
}

/**
 * Default UUID generator
 * Using v7 as it's the newest standard with best properties
 */
export function generateUUID(): string {
  return generateUUIDv7()
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}


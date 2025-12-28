/**
 * Electric Migration Version API
 * 
 * Returns the current Drizzle migration version from _journal.json
 * Used by client to detect when schema migrations have occurred.
 * 
 * GET /api/electric/version
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  try {
    // Read Drizzle's migration journal
    const journalPath = resolve('./server/db/migrations/postgresql/meta/_journal.json')
    const journalContent = readFileSync(journalPath, 'utf-8')
    const journal = JSON.parse(journalContent)

    // Get latest migration entry
    const entries = journal.entries || []
    const latest = entries[entries.length - 1]

    if (!latest) {
      // No migrations yet
      return successResponse({
        version: null,
        index: -1,
        hasMigrations: false,
      })
    }

    return successResponse({
      version: latest.tag,         // e.g., "0000_plain_wong"
      index: latest.idx,           // e.g., 0
      timestamp: latest.when,      // e.g., 1766807397179
      dialect: journal.dialect,    // "postgresql"
      totalMigrations: entries.length,
      hasMigrations: true,
    })

  } catch (error) {
    console.error('[Electric Version] Error reading journal:', error)
    
    // Return safe default if journal can't be read
    return successResponse({
      version: 'unknown',
      index: -1,
      hasMigrations: false,
      error: 'Could not read migration journal'
    })
  }
})


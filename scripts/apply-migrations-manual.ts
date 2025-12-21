import { readFileSync } from 'fs'
import { join } from 'path'
import { createConnection } from 'postgres'

const migrations = [
  '0000_talented_shocker.sql',
  '0001_absent_young_avengers.sql',
  '0002_fresh_venom.sql',
  '0003_quick_mister_fear.sql',
  '0004_add_layout_json_fields.sql',
  '0005_add_auth_tables.sql',
]

async function applyMigrations() {
  // Read connection string from NuxtHub env or use default
  const connectionString = process.env.NUXT_HUB_DATABASE_URL || process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ No database connection string found')
    console.log('Set NUXT_HUB_DATABASE_URL or DATABASE_URL environment variable')
    process.exit(1)
  }

  const sql = createConnection(connectionString)

  console.log('🚀 Applying migrations...\n')

  try {
    for (const migration of migrations) {
      console.log(`📝 Applying: ${migration}`)
      
      const migrationPath = join(process.cwd(), 'server/db/migrations/postgresql', migration)
      const migrationSQL = readFileSync(migrationPath, 'utf-8')

      // Split by statement breakpoint and execute each statement
      const statements = migrationSQL
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      for (const statement of statements) {
        try {
          await sql.unsafe(statement)
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists')) {
            console.log(`  ⏭️  Skipped (already exists)`)
          } else {
            throw error
          }
        }
      }

      console.log(`  ✅ Applied\n`)
    }

    console.log('🎉 All migrations applied successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

applyMigrations()


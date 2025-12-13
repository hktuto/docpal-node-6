import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database connection configuration
const sql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'docpal',
  username: process.env.DB_USER || 'docpal',
  password: process.env.DB_PASSWORD || 'docpal_dev',
});

// Create migrations tracking table
async function createMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
}

// Run all pending migrations
async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    
    await createMigrationsTable();
    
    const migrationsDir = join(__dirname, 'migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    for (const file of sqlFiles) {
      // Check if migration already executed
      const [existing] = await sql`
        SELECT 1 FROM migrations WHERE name = ${file}
      `;
      
      if (existing) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }
      
      console.log(`▶️  Running migration: ${file}`);
      const content = await readFile(join(migrationsDir, file), 'utf-8');
      
      // Execute migration
      await sql.unsafe(content);
      
      // Record migration
      await sql`
        INSERT INTO migrations (name) VALUES (${file})
      `;
      
      console.log(`✅ Completed ${file}`);
    }
    
    console.log('✨ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run seed files
async function runSeeds() {
  try {
    console.log('🌱 Running seed files...');
    
    const seedsDir = join(__dirname, 'seeds');
    const files = await readdir(seedsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    for (const file of sqlFiles) {
      console.log(`▶️  Running seed: ${file}`);
      const content = await readFile(join(seedsDir, file), 'utf-8');
      await sql.unsafe(content);
      console.log(`✅ Completed ${file}`);
    }
    
    console.log('✨ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await runMigrations();
    await runSeeds();
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    await sql.end();
    process.exit(1);
  }
}

// Run
main();


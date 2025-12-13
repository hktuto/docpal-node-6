/**
 * Database Query Helpers
 * 
 * Reusable database queries for the databases table
 */

import sql from './db';

export interface Database {
  id: string;
  company_id: string;
  name: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

/**
 * List all databases for a company (non-deleted)
 */
export async function listDatabases(companyId: string): Promise<Database[]> {
  const databases = await sql`
    SELECT id, company_id, name, created_by, created_at, deleted_at
    FROM databases
    WHERE company_id = ${companyId}
      AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  
  return databases as Database[];
}

/**
 * Get a single database by ID
 */
export async function getDatabase(id: string, companyId: string): Promise<Database | null> {
  const [database] = await sql`
    SELECT id, company_id, name, created_by, created_at, deleted_at
    FROM databases
    WHERE id = ${id}
      AND company_id = ${companyId}
      AND deleted_at IS NULL
  `;
  
  return database as Database | null;
}

/**
 * Create a new database
 */
export async function createDatabase(
  companyId: string,
  name: string,
  createdBy: string
): Promise<Database> {
  const [database] = await sql`
    INSERT INTO databases (company_id, name, created_by)
    VALUES (${companyId}, ${name}, ${createdBy})
    RETURNING id, company_id, name, created_by, created_at, deleted_at
  `;
  
  return database as Database;
}

/**
 * Update a database name
 */
export async function updateDatabase(
  id: string,
  companyId: string,
  name: string
): Promise<Database | null> {
  const [database] = await sql`
    UPDATE databases
    SET name = ${name}
    WHERE id = ${id}
      AND company_id = ${companyId}
      AND deleted_at IS NULL
    RETURNING id, company_id, name, created_by, created_at, deleted_at
  `;
  
  return database as Database | null;
}

/**
 * Soft delete a database
 */
export async function deleteDatabase(id: string, companyId: string): Promise<boolean> {
  const result = await sql`
    UPDATE databases
    SET deleted_at = NOW()
    WHERE id = ${id}
      AND company_id = ${companyId}
      AND deleted_at IS NULL
    RETURNING id
  `;
  
  return result.length > 0;
}


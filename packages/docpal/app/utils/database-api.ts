/**
 * Database API Client
 * 
 * Frontend utilities for database CRUD operations
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './api';

export interface Database {
  id: string;
  company_id: string;
  name: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

/**
 * List all databases
 */
export async function listDatabases(): Promise<Database[]> {
  const response = await apiGet<Database[]>('/api/databases');
  return response.data;
}

/**
 * Get a single database
 */
export async function getDatabase(id: string): Promise<Database> {
  const response = await apiGet<Database>(`/api/databases/${id}`);
  return response.data;
}

/**
 * Create a new database
 */
export async function createDatabase(name: string): Promise<Database> {
  const response = await apiPost<Database>('/api/databases', { name });
  return response.data;
}

/**
 * Update a database
 */
export async function updateDatabase(id: string, name: string): Promise<Database> {
  const response = await apiPatch<Database>(`/api/databases/${id}`, { name });
  return response.data;
}

/**
 * Delete a database (soft delete)
 */
export async function deleteDatabase(id: string): Promise<boolean> {
  const response = await apiDelete(`/api/databases/${id}`);
  return response.success;
}


/**
 * POST /api/databases
 * 
 * Create a new database
 * 
 * Body:
 * - name: string (required)
 */

import { createDatabase } from '../../utils/database-queries';
import { getUserId, getCompanyId } from '../../utils/auth';
import { validateRequired } from '../../utils/validation';

export default defineEventHandler(async (event) => {
  try {
    const userId = getUserId(event);
    const companyId = getCompanyId(event);
    const body = await readBody(event);
    
    // Validate required fields
    const validation = validateRequired(body, ['name']);
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields',
        data: { missing: validation.missing }
      });
    }
    
    // Validate name length
    if (body.name.length < 1 || body.name.length > 255) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Database name must be between 1 and 255 characters'
      });
    }
    
    const database = await createDatabase(companyId, body.name, userId);
    
    return {
      data: database
    };
  } catch (error: any) {
    console.error('Error creating database:', error);
    
    // Re-throw HTTP errors
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create database',
      data: { error: error.message }
    });
  }
});


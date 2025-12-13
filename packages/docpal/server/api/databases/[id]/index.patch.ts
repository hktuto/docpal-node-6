/**
 * PATCH /api/databases/:id
 * 
 * Update a database
 * 
 * Body:
 * - name: string (required)
 */

import { updateDatabase } from '../../../utils/database-queries';
import { getCompanyId } from '../../../utils/auth';
import { isValidUUID, validateRequired } from '../../../utils/validation';

export default defineEventHandler(async (event) => {
  try {
    const companyId = getCompanyId(event);
    const id = getRouterParam(event, 'id');
    const body = await readBody(event);
    
    if (!id || !isValidUUID(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid database ID'
      });
    }
    
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
    
    const database = await updateDatabase(id, companyId, body.name);
    
    if (!database) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Database not found'
      });
    }
    
    return {
      data: database
    };
  } catch (error: any) {
    console.error('Error updating database:', error);
    
    // Re-throw HTTP errors
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update database',
      data: { error: error.message }
    });
  }
});


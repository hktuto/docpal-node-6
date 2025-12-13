/**
 * GET /api/databases/:id
 * 
 * Get a single database by ID
 */

import { getDatabase } from '../../../utils/database-queries';
import { getCompanyId } from '../../../utils/auth';
import { isValidUUID } from '../../../utils/validation';

export default defineEventHandler(async (event) => {
  try {
    const companyId = getCompanyId(event);
    const id = getRouterParam(event, 'id');
    
    if (!id || !isValidUUID(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid database ID'
      });
    }
    
    const database = await getDatabase(id, companyId);
    
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
    console.error('Error getting database:', error);
    
    // Re-throw HTTP errors
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get database',
      data: { error: error.message }
    });
  }
});


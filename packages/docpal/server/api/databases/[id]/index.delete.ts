/**
 * DELETE /api/databases/:id
 * 
 * Soft delete a database
 */

import { deleteDatabase } from '../../../utils/database-queries';
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
    
    const success = await deleteDatabase(id, companyId);
    
    if (!success) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Database not found'
      });
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting database:', error);
    
    // Re-throw HTTP errors
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete database',
      data: { error: error.message }
    });
  }
});


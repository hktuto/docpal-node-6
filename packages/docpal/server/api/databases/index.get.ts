/**
 * GET /api/databases
 * 
 * List all databases for the current company
 */

import { listDatabases } from '../../utils/database-queries';
import { getCompanyId } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  try {
    const companyId = getCompanyId(event);
    
    const databases = await listDatabases(companyId);
    
    return {
      data: databases
    };
  } catch (error: any) {
    console.error('Error listing databases:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to list databases',
      data: { error: error.message }
    });
  }
});


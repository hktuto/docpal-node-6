/**
 * Get Current User Endpoint (POC)
 * 
 * For POC: Always returns fixed admin user
 * For Production: Decode JWT and return current user from database
 */

export default defineEventHandler(async (event) => {
  // POC: Always return fixed admin user
  // In production, get user from event.context.auth (set by middleware)
  
  const fixedUser = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    email: 'admin@docpal.local',
    created_at: new Date().toISOString()
  };
  
  const fixedCompanies = [
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Default Company',
      role: 'owner'
    }
  ];
  
  return {
    user: fixedUser,
    companies: fixedCompanies
  };
});


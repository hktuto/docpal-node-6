/**
 * Mock Login Endpoint (POC)
 * 
 * For POC: Always returns fixed admin user
 * For Production: Validate credentials and return real JWT token
 */

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // POC: Accept any credentials (no validation)
  // In production, validate username/password against database
  const { username, password } = body;
  
  // Fixed admin user (matches seed data)
  const fixedUser = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    email: 'admin@docpal.local',
    created_at: new Date().toISOString()
  };
  
  // Fixed company (matches seed data)
  const fixedCompanies = [
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Default Company',
      role: 'owner'
    }
  ];
  
  // Return mock response
  return {
    user: fixedUser,
    token: 'mock_token_for_poc',  // Not a real JWT, just for POC
    companies: fixedCompanies
  };
});


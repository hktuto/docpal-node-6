/**
 * Database Connection Utility
 * 
 * Shared database connection for all API endpoints
 */

import postgres from 'postgres';

// Database connection configuration
const sql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'docpal',
  username: process.env.DB_USER || 'docpal',
  password: process.env.DB_PASSWORD || 'docpal_dev',
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10
});

export default sql;


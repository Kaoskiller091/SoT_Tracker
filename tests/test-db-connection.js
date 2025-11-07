// Create a file called test-db-connection.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing database connection...');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sotc'
  };
  
  console.log('Using configuration:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    // Not showing password for security
  });
  
  try {
    const connection = await mysql.createConnection(config);
    console.log('✓ Connection successful!');
    
    // Test a simple query
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('✓ Query successful:', rows);
    
    // Close connection
    await connection.end();
    console.log('✓ Connection closed properly');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

testConnection()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

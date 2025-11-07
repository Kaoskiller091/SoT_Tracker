// test-db.js - Test MySQL connection for Discord bot
require('dotenv').config();
const mysql = require('mysql2/promise');

// Print environment variables (without showing password)
console.log('Environment variables:');
console.log('- DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('- DB_PORT:', process.env.DB_PORT || '3306');
console.log('- DB_USER:', process.env.DB_USER || 'root');
console.log('- DB_NAME:', process.env.DB_NAME || 'sotc');
console.log('- Password provided:', process.env.DB_PASSWORD ? 'Yes' : 'No');

async function testDatabase() {
  console.log('\n--- MySQL Connection Test ---');
  
  try {
    // Create connection
    console.log('Attempting to connect to MySQL...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sotc'
    });
    
    console.log('✅ Connected to MySQL successfully!');
    
    // Test basic query
    console.log('\nTesting basic query...');
    const [result] = await connection.execute('SELECT 1 + 1 AS solution');
    console.log('✅ Query executed successfully. Result:', result[0].solution);
    
    // Check if tables exist
    console.log('\nChecking database tables...');
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [process.env.DB_NAME || 'sotc']);
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`- ${table.TABLE_NAME}`);
    });
    
    // Test user table
    if (tables.some(t => t.TABLE_NAME === 'users')) {
      console.log('\nTesting users table...');
      const [users] = await connection.execute('SELECT COUNT(*) AS count FROM users');
      console.log(`✅ Users table exists with ${users[0].count} records`);
    } else {
      console.log('❌ Users table not found');
    }
    
    // Close connection
    await connection.end();
    console.log('\nConnection closed successfully');
    console.log('\n--- Test Complete ---');
    
  } catch (error) {
    console.error('\n❌ Database test failed:');
    console.error(error);
    
    // Provide helpful troubleshooting tips
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure WAMP server is running');
    console.log('2. Check that MySQL service is active (green icon in WAMP)');
    console.log('3. Verify your database credentials in the .env file');
    console.log('4. Ensure the "sotc" database exists in MySQL');
    console.log('5. Check if your MySQL user has proper permissions');
  }
}

testDatabase();

// test-mysql.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('MySQL connection test starting...');
    console.log('Using these connection parameters:');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.DB_PORT || '3306'}`);
    console.log(`User: ${process.env.DB_USER || 'root'}`);
    console.log(`Database: ${process.env.DB_NAME || 'sotc'}`);
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sotc',
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });

    console.log('Attempting to connect to MySQL...');
    const [rows] = await pool.query('SELECT 1 as test');
    console.log('✅ Connection successful!', rows);
    
    // Test creating a table
    console.log('Testing table creation...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_name VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table creation successful!');
    
    // Insert a test record
    console.log('Testing data insertion...');
    const [result] = await pool.query(
      'INSERT INTO connection_test (test_name) VALUES (?)',
      [`Test at ${new Date().toISOString()}`]
    );
    console.log('✅ Data insertion successful!', result);
    
    // Close the connection
    await pool.end();
    console.log('Connection closed.');
    
    console.log('\n✅✅✅ ALL MYSQL TESTS PASSED! Your MySQL configuration is working correctly.');
  } catch (error) {
    console.error('\n❌ MySQL connection test failed:', error);
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Check your .env file for correct credentials');
    console.log('3. Verify the database exists');
    console.log('4. Check if the MySQL user has proper permissions');
    console.log('5. Ensure MySQL is accepting connections on the specified host/port');
  }
}

testConnection();

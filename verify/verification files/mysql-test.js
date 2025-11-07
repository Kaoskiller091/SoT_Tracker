// mysql-test.js - Verify MySQL connection and database structure
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testMySQLConnection() {
  console.log('=== MySQL Connection Test for Sea of Thieves Companion Bot ===\n');
  
  // Display configuration (without showing password)
  console.log('Configuration:');
  console.log(`- Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`- Port: ${process.env.DB_PORT || '3306'}`);
  console.log(`- User: ${process.env.DB_USER || 'root'}`);
  console.log(`- Database: ${process.env.DB_NAME || 'sotc'}`);
  console.log(`- Password provided: ${process.env.DB_PASSWORD ? 'Yes' : 'No'}`);
  
  try {
    // Step 1: Create connection
    console.log('\n1. Attempting to connect to MySQL...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sotc'
    });
    
    console.log('✅ Connection successful!');
    
    // Step 2: Check server info
    console.log('\n2. Checking MySQL server information...');
    const [serverInfo] = await connection.query('SELECT VERSION() as version');
    console.log(`✅ MySQL Version: ${serverInfo[0].version}`);
    
    // Step 3: Check if database exists
    console.log('\n3. Checking if database exists...');
    const [databases] = await connection.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === (process.env.DB_NAME || 'sotc'));
    
    if (dbExists) {
      console.log(`✅ Database '${process.env.DB_NAME || 'sotc'}' exists`);
    } else {
      console.log(`❌ Database '${process.env.DB_NAME || 'sotc'}' does not exist`);
      console.log('Creating database...');
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'sotc'}`);
      console.log(`✅ Database '${process.env.DB_NAME || 'sotc'}' created`);
      await connection.query(`USE ${process.env.DB_NAME || 'sotc'}`);
    }
    
    // Step 4: Check tables
    console.log('\n4. Checking database tables...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('❌ No tables found in database');
    } else {
      console.log(`✅ Found ${tables.length} tables:`);
      
      // Get table name from the first column (column name varies by MySQL version)
      const tableNameColumn = Object.keys(tables[0])[0];
      
      tables.forEach(table => {
        console.log(`   - ${table[tableNameColumn]}`);
      });
      
      // Step 5: Check table structure for a few key tables
      if (tables.some(table => table[tableNameColumn] === 'users')) {
        console.log('\n5. Checking users table structure...');
        const [userColumns] = await connection.query('DESCRIBE users');
        console.log('✅ Users table structure:');
        userColumns.forEach(col => {
          console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
        });
        
        // Check if there are any users
        const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Users table has ${userCount[0].count} records`);
      }
      
      if (tables.some(table => table[tableNameColumn] === 'gold_history')) {
        console.log('\n6. Checking gold_history table...');
        const [goldCount] = await connection.query('SELECT COUNT(*) as count FROM gold_history');
        console.log(`✅ Gold history table has ${goldCount[0].count} records`);
      }
    }
    
    // Step 6: Test insert and select
    console.log('\n7. Testing database operations...');
    
    // Check if users table exists, if not create it
    const [userTableExists] = await connection.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'users'
    `, [process.env.DB_NAME || 'sotc']);
    
    if (userTableExists[0].count === 0) {
      console.log('Creating users table for testing...');
      await connection.query(`
        CREATE TABLE users (
          discord_id VARCHAR(20) PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Insert a test user
    const testUserId = '123456789012345678';
    const testUsername = 'TestUser_' + Math.floor(Math.random() * 1000);
    
    console.log(`Inserting test user: ${testUsername}...`);
    await connection.query(
      'INSERT INTO users (discord_id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?',
      [testUserId, testUsername, testUsername]
    );
    
    // Verify the user was inserted
    const [user] = await connection.query('SELECT * FROM users WHERE discord_id = ?', [testUserId]);
    
    if (user.length > 0) {
      console.log(`✅ Test user retrieved successfully: ${user[0].username}`);
    } else {
      console.log('❌ Failed to retrieve test user');
    }
    
    // Close connection
    await connection.end();
    console.log('\n✅ Connection closed successfully');
    console.log('\n=== MySQL Connection Test Completed Successfully ===');
    
  } catch (error) {
    console.error('\n❌ MySQL Connection Test Failed:');
    console.error(error);
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure WAMP server is running');
    console.log('2. Check that MySQL service is active (green icon in WAMP)');
    console.log('3. Verify your database credentials in the .env file');
    console.log('4. Ensure the MySQL user has proper permissions');
    console.log('5. Check if the database exists and is accessible');
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\nThis is an authentication error. Check your username and password.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\nCannot connect to MySQL server. Make sure it\'s running on the specified host and port.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\nThe specified database does not exist. Create it first or check the name.');
    }
  }
}

testMySQLConnection();

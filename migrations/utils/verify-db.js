// verify-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function verifyDatabase() {
  console.log('=== Database Verification Test ===\n');
  
  try {
    // Create connection
    console.log('Connecting to MySQL...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sotc'
    });
    
    console.log('✅ Connection successful');
    
    // Run verification queries
    console.log('\nVerifying database structure...');
    
    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Found ${tables.length} tables`);
    
    // Check for required tables
    const requiredTables = ['users', 'gold_history', 'sessions', 'cash_ins', 'emissary_history'];
    const tableNameColumn = Object.keys(tables[0])[0];
    const tableNames = tables.map(table => table[tableNameColumn]);
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ All required tables exist');
    }
    
    // Check table structures
    for (const tableName of tableNames) {
      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      console.log(`Table ${tableName}: ${columns.length} columns`);
    }
    
    // Check indices
    console.log('\nVerifying indices...');
    const [indices] = await connection.query(`
      SELECT table_name, index_name
      FROM information_schema.statistics
      WHERE table_schema = ?
    `, [process.env.DB_NAME || 'sotc']);
    
    console.log(`Found ${indices.length} indices`);
    
    // Check data integrity
    console.log('\nVerifying data integrity...');
    
    // Check for orphaned records
    const [orphanedGoldHistory] = await connection.query(`
      SELECT COUNT(*) as count
      FROM gold_history gh
      LEFT JOIN users u ON gh.discord_id = u.discord_id
      WHERE u.discord_id IS NULL
    `);
    
    if (orphanedGoldHistory[0].count > 0) {
      console.log(`❌ Found ${orphanedGoldHistory[0].count} orphaned gold history records`);
    } else {
      console.log('✅ No orphaned gold history records');
    }
    
    // Check for other orphaned records...
    
    // Close connection
    await connection.end();
    console.log('\n✅ Database verification complete');
    
  } catch (error) {

// Create a file called fix-mysql-schema.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixSchema() {
  // Create MySQL connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sotc'
  });

  try {
    console.log('Connected to MySQL database');
    
    // Check if gold_history table exists
    const [tables] = await connection.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'gold_history'",
      [process.env.DB_NAME || 'sotc']
    );
    
    if (tables.length === 0) {
      console.log('gold_history table does not exist, creating it...');
      
      // Create gold_history table
      await connection.query(`
        CREATE TABLE gold_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          discord_id VARCHAR(20) NOT NULL,
          amount INT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('gold_history table created successfully');
    } else {
      console.log('gold_history table exists');
      
      // Check if amount column exists
      const [columns] = await connection.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'gold_history' AND column_name = 'amount'",
        [process.env.DB_NAME || 'sotc']
      );
      
      if (columns.length === 0) {
        console.log('amount column does not exist, adding it...');
        
        // Add amount column
        await connection.query("ALTER TABLE gold_history ADD COLUMN amount INT NOT NULL");
        
        console.log('amount column added successfully');
      } else {
        console.log('amount column already exists');
      }
    }
    
    // Check all tables and their columns
    const [allTables] = await connection.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
      [process.env.DB_NAME || 'sotc']
    );
    
    console.log('\nAll tables in database:');
    for (const table of allTables) {
      const tableName = table.TABLE_NAME || table.table_name;
      console.log(`\nTable: ${tableName}`);
      
      const [tableColumns] = await connection.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
        [process.env.DB_NAME || 'sotc', tableName]
      );
      
      console.log('Columns:');
      tableColumns.forEach(column => {
        const columnName = column.COLUMN_NAME || column.column_name;
        const dataType = column.DATA_TYPE || column.data_type;
        console.log(`- ${columnName} (${dataType})`);
      });
    }
  } catch (error) {
    console.error('Error fixing schema:', error);
  } finally {
    await connection.end();
    console.log('Connection closed');
  }
}

fixSchema();

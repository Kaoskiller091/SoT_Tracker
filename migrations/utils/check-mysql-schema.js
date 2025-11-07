// Create a file called check-mysql-schema.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
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
      console.log('gold_history table does not exist');
    } else {
      console.log('gold_history table exists');
      
      // Get columns in gold_history table
      const [columns] = await connection.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = ? AND table_name = 'gold_history'",
        [process.env.DB_NAME || 'sotc']
      );
      
      console.log('Columns in gold_history table:');
      columns.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type})`);
      });
    }
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await connection.end();
    console.log('Connection closed');
  }
}

checkSchema();

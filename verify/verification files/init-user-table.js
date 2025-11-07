// init-users-table.js - Create users table
require('dotenv').config();
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function initUsersTable() {
  // Determine which database type to use
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  if (dbType === 'sqlite') {
    // For SQLite
    const dbPath = process.env.DB_FILENAME || path.join(__dirname, 'data', 'sotc.db');
    console.log(`Using SQLite database at ${dbPath}`);
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to SQLite database:', err);
          reject(err);
          return;
        }
        
        console.log('Connected to SQLite database');
        
        // Create users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            discord_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating users table:', err);
            reject(err);
            return;
          }
          
          console.log('Users table created successfully');
          db.close();
          resolve();
        });
      });
    });
  } else {
    // For MySQL
    try {
      console.log('Using MySQL database');
      
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sotc'
      });
      
      console.log('Connected to MySQL database');
      
      // Create users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          discord_id VARCHAR(20) PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Users table created successfully');
      
      await connection.end();
      return true;
    } catch (error) {
      console.error('Error initializing users table:', error);
      return false;
    }
  }
}

// Run the initialization
initUsersTable()
  .then(() => {
    console.log('Users table initialization completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during initialization:', error);
    process.exit(1);
  });

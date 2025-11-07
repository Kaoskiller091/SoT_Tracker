// init-gold-table.js - Create gold_history table
require('dotenv').config();
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function initGoldTable() {
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
        
        // Create gold_history table
        db.run(`
          CREATE TABLE IF NOT EXISTS gold_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT NOT NULL,
            gold_amount INTEGER NOT NULL,
            previous_amount INTEGER,
            change_amount INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (discord_id) REFERENCES users(discord_id)
          )
        `, (err) => {
          if (err) {
            console.error('Error creating gold_history table:', err);
            reject(err);
            return;
          }
          
          console.log('Gold history table created successfully');
          
          // Create index
          db.run(`CREATE INDEX IF NOT EXISTS idx_gold_history_discord_id ON gold_history(discord_id)`, (err) => {
            if (err) {
              console.error('Error creating gold_history index:', err);
              reject(err);
              return;
            }
            
            console.log('Gold history index created successfully');
            db.close();
            resolve();
          });
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
      
      // Create gold_history table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS gold_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          discord_id VARCHAR(20) NOT NULL,
          gold_amount INT NOT NULL,
          previous_amount INT,
          change_amount INT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (discord_id) REFERENCES users(discord_id)
        )
      `);
      console.log('Gold history table created successfully');
      
      // Create index
      // Helper function to check if index exists before creating it
      async function createIndexIfNotExists(tableName, indexName, columnName) {
        try {
          // Check if index exists
          const [indexCheck] = await connection.query(`
            SELECT COUNT(1) as index_exists 
            FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
            AND table_name = ? 
            AND index_name = ?
          `, [tableName, indexName]);
          
          if (indexCheck[0].index_exists === 0) {
            // Index doesn't exist, create it
            await connection.query(`
              CREATE INDEX ${indexName} ON ${tableName}(${columnName})
            `);
            console.log(`Created index ${indexName} on ${tableName}`);
          } else {
            console.log(`Index ${indexName} already exists on ${tableName}`);
          }
        } catch (error) {
          console.error(`Error creating index ${indexName}:`, error.message);
        }
      }
      
      await createIndexIfNotExists('gold_history', 'idx_gold_history_discord_id', 'discord_id');
      
      console.log('Gold history index created successfully');
      await connection.end();
      
      return true;
    } catch (error) {
      console.error('Error initializing gold table:', error);
      return false;
    }
  }
}

// Run the initialization
initGoldTable()
  .then(() => {
    console.log('Gold table initialization completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during initialization:', error);
    process.exit(1);
  });

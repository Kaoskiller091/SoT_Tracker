// init-all-tables.js - Initialize all database tables in the correct order
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Determine which database type to use
const dbType = process.env.DB_TYPE || 'sqlite';

async function initAllTables() {
  try {
    console.log('Starting database initialization...');
    
    // Initialize database based on type
    if (dbType.toLowerCase() === 'sqlite') {
      await initSqliteTables();
    } else {
      await initMysqlTables();
    }
    
    console.log('\n✅ All tables initialized successfully!');
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  }
}

async function initSqliteTables() {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure SQLite3 is installed
      const sqlite3 = require('sqlite3').verbose();
      
      // Get database path
      const dbPath = process.env.DB_FILENAME || path.join(__dirname, 'data', 'sotc.db');
      
      // Ensure the directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        console.log(`Creating directory: ${dbDir}`);
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      console.log(`Using SQLite database at ${dbPath}`);
      
      // Open database connection
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to SQLite database:', err);
          reject(err);
          return;
        }
        
        console.log('Connected to SQLite database');
        
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            console.error('Error enabling foreign keys:', err);
            db.close();
            reject(err);
            return;
          }
          
          // Create users table
          console.log('\nCreating users table...');
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
              db.close();
              reject(err);
              return;
            }
            
            console.log('✅ Users table created');
            
            // Create gold_history table
            console.log('\nCreating gold_history table...');
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
                db.close();
                reject(err);
                return;
              }
              
              console.log('✅ Gold history table created');
              
              // Create sessions table
              console.log('\nCreating sessions table...');
              db.run(`
                CREATE TABLE IF NOT EXISTS sessions (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  discord_id TEXT NOT NULL,
                  session_name TEXT NOT NULL,
                  starting_gold INTEGER NOT NULL,
                  ending_gold INTEGER,
                  earned_gold INTEGER,
                  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  end_time TIMESTAMP NULL,
                  notes TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (discord_id) REFERENCES users(discord_id)
                )
              `, (err) => {
                if (err) {
                  console.error('Error creating sessions table:', err);
                  db.close();
                  reject(err);
                  return;
                }
                
                console.log('✅ Sessions table created');
                
                // Create cash_ins table
                console.log('\nCreating cash_ins table...');
                db.run(`
                  CREATE TABLE IF NOT EXISTS cash_ins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    amount INTEGER NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                  )
                `, (err) => {
                  if (err) {
                    console.error('Error creating cash_ins table:', err);
                    db.close();
                    reject(err);
                    return;
                  }
                  
                  console.log('✅ Cash-ins table created');
                  
                  // Create indices
                  console.log('\nCreating indices...');
                  db.run(`CREATE INDEX IF NOT EXISTS idx_gold_history_discord_id ON gold_history(discord_id)`, (err) => {
                    if (err) {
                      console.error('Error creating gold_history index:', err);
                      db.close();
                      reject(err);
                      return;
                    }
                    
                    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_discord_id ON sessions(discord_id)`, (err) => {
                      if (err) {
                        console.error('Error creating sessions index:', err);
                        db.close();
                        reject(err);
                        return;
                      }
                      
                      db.run(`CREATE INDEX IF NOT EXISTS idx_cash_ins_session_id ON cash_ins(session_id)`, (err) => {
                        if (err) {
                          console.error('Error creating cash_ins index:', err);
                          db.close();
                          reject(err);
                          return;
                        }
                        
                        console.log('✅ Indices created');
                        
                        // Close the database connection
                        db.close((err) => {
                          if (err) {
                            console.error('Error closing database:', err);
                            reject(err);
                            return;
                          }
                          resolve();
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    } catch (error) {
      console.error('Error in SQLite initialization:', error);
      reject(error);
    }
  });
}

async function initMysqlTables() {
  let connection;
  try {
    // Ensure mysql2 is installed
    const mysql = require('mysql2/promise');
    
    console.log('Using MySQL database');
    
    // Create connection without database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'sotc';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    console.log(`Ensured database ${dbName} exists`);
    
    // Close connection
    await connection.end();
    
    // Create new connection with database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName
    });
    
    console.log(`Connected to MySQL database ${dbName}`);
    
    // Create users table
    console.log('\nCreating users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        discord_id VARCHAR(20) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');
    
    // Create gold_history table
    console.log('\nCreating gold_history table...');
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
    console.log('✅ Gold history table created');
    
    // Create sessions table
    console.log('\nCreating sessions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(20) NOT NULL,
        session_name VARCHAR(255) NOT NULL,
        starting_gold INT NOT NULL,
        ending_gold INT,
        earned_gold INT,
        start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discord_id) REFERENCES users(discord_id)
      )
    `);
    console.log('✅ Sessions table created');
    
    // Create cash_ins table
    console.log('\nCreating cash_ins table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cash_ins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        amount INT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Cash-ins table created');
    
    // Create indices
    console.log('\nCreating indices...');
    
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
          console.log(`✅ Created index ${indexName} on ${tableName}`);
        } else {
          console.log(`✅ Index ${indexName} already exists on ${tableName}`);
        }
      } catch (error) {
        console.error(`Error creating index ${indexName}:`, error.message);
      }
    }
    
    await createIndexIfNotExists('gold_history', 'idx_gold_history_discord_id', 'discord_id');
    await createIndexIfNotExists('sessions', 'idx_sessions_discord_id', 'discord_id');
    await createIndexIfNotExists('cash_ins', 'idx_cash_ins_session_id', 'session_id');
    
    console.log('✅ Indices created');
    
    // Close the connection
    await connection.end();
    console.log('MySQL connection closed');
    
    return true;
  } catch (error) {
    console.error('Error in MySQL initialization:', error);
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing MySQL connection:', closeError);
      }
    }
    throw error;
  }
}

// Run the initialization
initAllTables()
  .then(() => {
    console.log('Database initialization completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during initialization:', error);
    process.exit(1);
  });

// init-sessions-table.js - Create sessions and cash_ins tables
require('dotenv').config();
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function initSessionTables() {
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
        
        // Create sessions table
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
            reject(err);
            return;
          }
          
          console.log('Sessions table created successfully');
          
          // Create cash_ins table
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
              reject(err);
              return;
            }
            
            console.log('Cash-ins table created successfully');
            
            // Create indices
            db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_discord_id ON sessions(discord_id)`, (err) => {
              if (err) {
                console.error('Error creating sessions index:', err);
                reject(err);
                return;
              }
              
              db.run(`CREATE INDEX IF NOT EXISTS idx_cash_ins_session_id ON cash_ins(session_id)`, (err) => {
                if (err) {
                  console.error('Error creating cash_ins index:', err);
                  reject(err);
                  return;
                }
                
                console.log('Indices created successfully');
                db.close();
                resolve();
              });
            });
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
      
      // Create sessions table
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
      console.log('Sessions table created successfully');
      
      // Create cash_ins table
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
      console.log('Cash-ins table created successfully');
      
      // Create indices
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
      
      await createIndexIfNotExists('sessions', 'idx_sessions_discord_id', 'discord_id');
      await createIndexIfNotExists('cash_ins', 'idx_cash_ins_session_id', 'session_id');
      
      console.log('Indices created successfully');
      await connection.end();
      
      return true;
    } catch (error) {
      console.error('Error initializing session tables:', error);
      return false;
    }
  }
}

// Run the initialization
initSessionTables()
  .then(() => {
    console.log('Session tables initialization completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during initialization:', error);
    process.exit(1);
  });

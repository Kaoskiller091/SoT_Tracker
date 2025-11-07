// database-multi.js - Database handler with support for both SQLite and MySQL
const fs = require('fs');
const path = require('path');

// Database configuration - Read from environment variables or use defaults
const dbConfig = {
  type: process.env.DB_TYPE || 'sqlite', // 'sqlite' or 'mysql'
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sotc',
  filename: process.env.DB_FILENAME || path.join(__dirname, 'data', 'sotc.db')
};

// Database connection
let db;
let dbType = dbConfig.type.toLowerCase();

// Set up the appropriate database connection
if (dbType === 'sqlite') {
  // SQLite setup
  const sqlite3 = require('sqlite3').verbose();
  
  // Ensure data directory exists
  const dataDir = path.dirname(dbConfig.filename);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  db = new sqlite3.Database(dbConfig.filename);
  console.log(`Connected to SQLite database at ${dbConfig.filename}`);
} 
else if (dbType === 'mysql') {
  // MySQL setup - You'll need to install mysql2 package first: npm install mysql2
  try {
    const mysql = require('mysql2/promise');
    
    // We'll create a pool and wrap it to match SQLite's interface
    const pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Create wrapper functions to match SQLite interface
    db = {
      // For INSERT, UPDATE, DELETE operations
      run: function(sql, params, callback) {
        // Convert SQLite-style queries to MySQL
        sql = convertToMySQLSyntax(sql);
        
        pool.execute(sql, params)
          .then(([results]) => {
            if (callback && typeof callback === 'function') {
              // Mimic SQLite's this.lastID
              callback.call({ lastID: results.insertId });
            }
          })
          .catch(err => {
            console.error('MySQL error in run:', err);
            if (callback && typeof callback === 'function') {
              callback(err);
            }
          });
      },
      
      // For SELECT single row operations
      get: function(sql, params, callback) {
        // Convert SQLite-style queries to MySQL
        sql = convertToMySQLSyntax(sql);
        
        pool.execute(sql, params)
          .then(([rows]) => {
            if (callback && typeof callback === 'function') {
              callback(null, rows[0]);
            }
          })
          .catch(err => {
            console.error('MySQL error in get:', err);
            if (callback && typeof callback === 'function') {
              callback(err);
            }
          });
      },
      
      // For SELECT multiple rows operations
      all: function(sql, params, callback) {
        // Convert SQLite-style queries to MySQL
        sql = convertToMySQLSyntax(sql);
        
        pool.execute(sql, params)
          .then(([rows]) => {
            if (callback && typeof callback === 'function') {
              callback(null, rows);
            }
          })
          .catch(err => {
            console.error('MySQL error in all:', err);
            if (callback && typeof callback === 'function') {
              callback(err);
            }
          });
      },
      
      // For closing the connection
      close: function(callback) {
        pool.end()
          .then(() => {
            if (callback && typeof callback === 'function') {
              callback(null);
            }
          })
          .catch(err => {
            console.error('MySQL error in close:', err);
            if (callback && typeof callback === 'function') {
              callback(err);
            }
          });
      },
      
      // Add Promise-based versions for modern usage
      runAsync: function(sql, params) {
        return new Promise((resolve, reject) => {
          this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID });
          });
        });
      },
      
      getAsync: function(sql, params) {
        return new Promise((resolve, reject) => {
          this.get(sql, params, function(err, row) {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      
      allAsync: function(sql, params) {
        return new Promise((resolve, reject) => {
          this.all(sql, params, function(err, rows) {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      },
      
      closeAsync: function() {
        return new Promise((resolve, reject) => {
          this.close(function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    };
    
    console.log(`Connected to MySQL database at ${dbConfig.host}:${dbConfig.port}`);
  } catch (error) {
    console.error('Failed to load MySQL module. Did you install mysql2?', error);
    console.log('Falling back to SQLite...');
    
    // Fall back to SQLite if MySQL setup fails
    dbType = 'sqlite';
    const sqlite3 = require('sqlite3').verbose();
    
    const dataDir = path.dirname(dbConfig.filename);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new sqlite3.Database(dbConfig.filename);
    console.log(`Connected to SQLite database at ${dbConfig.filename}`);
  }
} 
else {
  throw new Error(`Unsupported database type: ${dbConfig.type}`);
}

// Helper function to convert SQLite syntax to MySQL syntax
function convertToMySQLSyntax(sql) {
  if (dbType !== 'mysql') return sql;
  
  // Replace SQLite's CURRENT_TIMESTAMP with MySQL's NOW()
  sql = sql.replace(/CURRENT_TIMESTAMP/g, 'NOW()');
  
  // Handle AUTOINCREMENT differences
  sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'INTEGER PRIMARY KEY AUTO_INCREMENT');
  
  // Handle other syntax differences as needed
  
  return sql;
}

// Initialize database with appropriate schema
function initDatabase() {
  return new Promise((resolve, reject) => {
    console.log(`Initializing ${dbType} database...`);
    
    // Define table creation queries with appropriate syntax for each database type
    const createUsersTable = dbType === 'mysql' 
      ? `CREATE TABLE IF NOT EXISTS users (
          discord_id VARCHAR(20) PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      : `CREATE TABLE IF NOT EXISTS users (
          discord_id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    
    const createGoldHistoryTable = dbType === 'mysql'
      ? `CREATE TABLE IF NOT EXISTS gold_history (
          id INTEGER PRIMARY KEY AUTO_INCREMENT,
          discord_id VARCHAR(20) NOT NULL,
          gold_amount INTEGER NOT NULL,
          previous_amount INTEGER,
          change_amount INTEGER,
          timestamp TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (discord_id) REFERENCES users(discord_id)
        )`
      : `CREATE TABLE IF NOT EXISTS gold_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          discord_id TEXT NOT NULL,
          gold_amount INTEGER NOT NULL,
          previous_amount INTEGER,
          change_amount INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (discord_id) REFERENCES users(discord_id)
        )`;
    
    const createSessionsTable = dbType === 'mysql'
      ? `CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTO_INCREMENT,
          discord_id VARCHAR(20) NOT NULL,
          session_name VARCHAR(255) NOT NULL,
          starting_gold INTEGER NOT NULL,
          ending_gold INTEGER,
          earned_gold INTEGER,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (discord_id) REFERENCES users(discord_id)
        )`
      : `CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          discord_id TEXT NOT NULL,
          session_name TEXT NOT NULL,
          starting_gold INTEGER NOT NULL,
          ending_gold INTEGER,
          earned_gold INTEGER,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (discord_id) REFERENCES users(discord_id)
        )`;
    
    const createCashInsTable = dbType === 'mysql'
      ? `CREATE TABLE IF NOT EXISTS cash_ins (
          id INTEGER PRIMARY KEY AUTO_INCREMENT,
          session_id INTEGER NOT NULL,
          amount INTEGER NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW(),
          notes TEXT,
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        )`
      : `CREATE TABLE IF NOT EXISTS cash_ins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          amount INTEGER NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        )`;
    
    const createEmissaryHistoryTable = dbType === 'mysql'
      ? `CREATE TABLE IF NOT EXISTS emissary_history (
          id INTEGER PRIMARY KEY AUTO_INCREMENT,
          discord_id VARCHAR(20) NOT NULL,
          emissary_type VARCHAR(50) NOT NULL,
          reputation_earned INTEGER NOT NULL,
          session_id INTEGER,
          timestamp TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (discord_id) REFERENCES users(discord_id),
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        )`
      : `CREATE TABLE IF NOT EXISTS emissary_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          discord_id TEXT NOT NULL,
          emissary_type TEXT NOT NULL,
          reputation_earned INTEGER NOT NULL,
          session_id INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (discord_id) REFERENCES users(discord_id),
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        )`;
    
    // Execute table creation queries
    db.run(createUsersTable, [], function(err) {
      if (err) {
        console.error('Error creating users table:', err);
        reject(err);
        return;
      }
      console.log('Users table ready');
      
      db.run(createGoldHistoryTable, [], function(err) {
        if (err) {
          console.error('Error creating gold_history table:', err);
          reject(err);
          return;
        }
        console.log('Gold history table ready');
        
        db.run(createSessionsTable, [], function(err) {
          if (err) {
            console.error('Error creating sessions table:', err);
            reject(err);
            return;
          }
          console.log('Sessions table ready');
          
          db.run(createCashInsTable, [], function(err) {
            if (err) {
              console.error('Error creating cash_ins table:', err);
              reject(err);
              return;
            }
            console.log('Cash-ins table ready');
            
            db.run(createEmissaryHistoryTable, [], function(err) {
              if (err) {
                console.error('Error creating emissary_history table:', err);
                reject(err);
                return;
              }
              console.log('Emissary history table ready');
              
              // Create indices for better performance
              createIndices()
                .then(() => {
                  console.log('Database initialization complete');
                  resolve();
                })
                .catch(err => {
                  console.error('Error creating indices:', err);
                  reject(err);
                });
            });
          });
        });
      });
    });
  });
}

// Create database indices
function createIndices() {
  return new Promise((resolve, reject) => {
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_gold_history_discord_id ON gold_history(discord_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_discord_id ON sessions(discord_id)',
      'CREATE INDEX IF NOT EXISTS idx_cash_ins_session_id ON cash_ins(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_emissary_discord_id ON emissary_history(discord_id)'
    ];
    
    let completed = 0;
    let hasError = false;
    
    indices.forEach(indexQuery => {
      db.run(indexQuery, [], function(err) {
        if (err && !hasError) {
          hasError = true;
          reject(err);
          return;
        }
        
        completed++;
        if (completed === indices.length && !hasError) {
          resolve();
        }
      });
    });
  });
}

// User functions
async function getUser(discordId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE discord_id = ?', [discordId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

async function createOrUpdateUser(discordId, username) {
  return new Promise((resolve, reject) => {
    // Check if user exists
    db.get('SELECT * FROM users WHERE discord_id = ?', [discordId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        // Update existing user
        const updateQuery = dbType === 'mysql'
          ? 'UPDATE users SET username = ?, updated_at = NOW() WHERE discord_id = ?'
          : 'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?';
        
        db.run(updateQuery, [username, discordId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ id: discordId, username: username, isNew: false });
        });
      } else {
        // Create new user
        db.run(
          'INSERT INTO users (discord_id, username) VALUES (?, ?)',
          [discordId, username],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve({ id: discordId, username: username, isNew: true });
          }
        );
      }
    });
  });
}

// Gold tracking functions
async function getCurrentGold(discordId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT gold_amount FROM gold_history WHERE discord_id = ? ORDER BY timestamp DESC LIMIT 1',
      [discordId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row ? row.gold_amount : 0);
      }
    );
  });
}

async function updateGold(discordId, goldAmount) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get current gold amount
      const currentGold = await getCurrentGold(discordId);
      const changeAmount = goldAmount - currentGold;
      
      // Insert new gold history record
      db.run(
        'INSERT INTO gold_history (discord_id, gold_amount, previous_amount, change_amount) VALUES (?, ?, ?, ?)',
        [discordId, goldAmount, currentGold, changeAmount],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            id: this.lastID,
            discordId: discordId,
            goldAmount: goldAmount,
            previousAmount: currentGold,
            changeAmount: changeAmount
          });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

async function getGoldHistory(discordId, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM gold_history WHERE discord_id = ? ORDER BY timestamp DESC LIMIT ?',
      [discordId, limit],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      }
    );
  });
}

// Session functions
async function startSession(discordId, sessionName, startingGold) {
  return new Promise((resolve, reject) => {
    const insertQuery = dbType === 'mysql'
      ? 'INSERT INTO sessions (discord_id, session_name, starting_gold, start_time) VALUES (?, ?, ?, NOW())'
      : 'INSERT INTO sessions (discord_id, session_name, starting_gold, start_time) VALUES (?, ?, ?, CURRENT_TIMESTAMP)';
    
    db.run(insertQuery, [discordId, sessionName, startingGold], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        id: this.lastID,
        discordId: discordId,
        sessionName: sessionName,
        startingGold: startingGold
      });
    });
  });
}

async function endSession(sessionId, endingGold, notes = null) {
  return new Promise((resolve, reject) => {
    // Get session details
    db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!session) {
        reject(new Error('Session not found'));
        return;
      }
      
      const earnedGold = endingGold - session.starting_gold;
      
      // Update session with ending details
      const updateQuery = dbType === 'mysql'
        ? 'UPDATE sessions SET ending_gold = ?, earned_gold = ?, end_time = NOW(), notes = ? WHERE id = ?'
        : 'UPDATE sessions SET ending_gold = ?, earned_gold = ?, end_time = CURRENT_TIMESTAMP, notes = ? WHERE id = ?';
      
      db.run(updateQuery, [endingGold, earnedGold, notes, sessionId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({
          id: sessionId,
          discordId: session.discord_id,
          startingGold: session.starting_gold,
          endingGold: endingGold,
          earnedGold: earnedGold
        });
      });
    });
  });
}

// Export all functions
module.exports = {
  initDatabase,
  getUser,
  createOrUpdateUser,
  getCurrentGold,
  updateGold,
  getGoldHistory,
  startSession,
  endSession,
  // Add other functions from your original database.js here
};

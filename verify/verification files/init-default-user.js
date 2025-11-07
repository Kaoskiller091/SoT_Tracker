// init-default-user.js - Create a default user in the users table
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

async function createDefaultUser() {
  // Get database path
  const dbPath = process.env.DB_FILENAME || path.join(__dirname, 'data', 'sotc.db');
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    console.log(`Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  console.log(`Using SQLite database at ${dbPath}`);
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to SQLite database:', err);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
      // Create users table if it doesn't exist
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
        
        console.log('Users table created successfully');
        
        // Check if your Discord ID exists in the users table
        const yourDiscordId = '134226800808034304'; // Your Discord ID
        
        db.get('SELECT 1 FROM users WHERE discord_id = ?', [yourDiscordId], (err, row) => {
          if (err) {
            console.error('Error checking if user exists:', err);
            db.close();
            reject(err);
            return;
          }
          
          if (!row) {
            // Insert your user if it doesn't exist
            db.run('INSERT INTO users (discord_id, username) VALUES (?, ?)', [yourDiscordId, 'DefaultUser'], function(err) {
              if (err) {
                console.error('Error creating default user:', err);
                db.close();
                reject(err);
                return;
              }
              
              console.log(`Created default user with ID: ${yourDiscordId}`);
              db.close();
              resolve();
            });
          } else {
            console.log(`User with ID ${yourDiscordId} already exists`);
            db.close();
            resolve();
          }
        });
      });
    });
  });
}

// Run the function
createDefaultUser()
  .then(() => {
    console.log('Default user creation completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during default user creation:', error);
    process.exit(1);
  });

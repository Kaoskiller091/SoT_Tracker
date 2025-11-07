// init-db.js - Initialize database tables and indices
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sotc',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Initialize database
async function initializeDatabase() {
  let connection;
  
  try {
    console.log('Initializing database...');
    
    // Create connection without database specified
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    console.log('Connected to MySQL successfully!');
    
    // Create database if it doesn't exist (using query instead of execute)
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    
    // Close the initial connection
    await connection.end();
    
    // Create a new connection with the database specified
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database
    });
    
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
        start_time TIMESTAMP NOT NULL,
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
    
    // Create emissary_history table
    console.log('\nCreating emissary_history table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS emissary_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(20) NOT NULL,
        faction VARCHAR(50) NOT NULL,
        level INT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discord_id) REFERENCES users(discord_id)
      )
    `);
    console.log('✅ Emissary history table created');
    
    // Create server_settings table
    console.log('\nCreating server_settings table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS server_settings (
        guild_id VARCHAR(20) PRIMARY KEY,
        require_whitelist BOOLEAN DEFAULT FALSE,
        admin_only_commands TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Server settings table created');
    
    // Creating indices
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
        console.error(`❌ Error creating index ${indexName}:`, error.message);
      }
    }
    
    // Create indices for each table
    await createIndexIfNotExists('gold_history', 'idx_gold_history_discord_id', 'discord_id');
    await createIndexIfNotExists('sessions', 'idx_sessions_discord_id', 'discord_id');
    await createIndexIfNotExists('cash_ins', 'idx_cash_ins_session_id', 'session_id');
    await createIndexIfNotExists('emissary_history', 'idx_emissary_history_discord_id', 'discord_id');
    
    console.log('\n✅ Database initialization completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:');
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the initialization
initializeDatabase();

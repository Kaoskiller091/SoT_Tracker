// migrations/002-crew-tables.js
const dbManager = require('../database');

// Add version and description metadata
const version = '0.2.0';
const description = 'Create crew tables';

async function up() {
  try {
    // Create crews table
    await dbManager.run(`
      CREATE TABLE IF NOT EXISTS crews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(50) NOT NULL,
        password VARCHAR(100) NULL,
        UNIQUE KEY unique_name (name)
      )
    `);

    // Create crew_members table
    await dbManager.run(`
      CREATE TABLE IF NOT EXISTS crew_members (
        crew_id INT NOT NULL,
        discord_id VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        starting_gold BIGINT DEFAULT 0,
        current_gold BIGINT DEFAULT 0,
        PRIMARY KEY (crew_id, discord_id),
        FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
      )
    `);

    // Create crew_sessions table to link sessions to crews
    await dbManager.run(`
      CREATE TABLE IF NOT EXISTS crew_sessions (
        session_id INT NOT NULL,
        crew_id INT NOT NULL,
        PRIMARY KEY (session_id),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
      )
    `);

    console.log('Crew tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating crew tables:', error);
    throw error;
  }
}

// Export with version and description
module.exports = { 
  version,
  description,
  up,
  apply: up
};
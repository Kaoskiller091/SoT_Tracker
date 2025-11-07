// crew-model.js - Handles crew management
const dbManager = require('./database');

class CrewModel {
  constructor() {
    this.initialized = false;
  }
  
  // Initialize the model
  async init() {
    if (this.initialized) return;
    
    try {
      // Ensure tables exist (this would normally be handled by migrations)
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
      
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS crew_sessions (
          session_id INT NOT NULL,
          crew_id INT NOT NULL,
          PRIMARY KEY (session_id),
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
        )
      `);
      
      console.log('Crew model initialized');
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing crew model:', error);
      throw error;
    }
  }
  
  // Create a new crew
  async createCrew(name, createdBy, password = null) {
    await this.init();
    
    try {
      const result = await dbManager.run(
        'INSERT INTO crews (name, created_by, password) VALUES (?, ?, ?)',
        [name, createdBy, password]
      );
      
      return await this.getCrewById(result.id);
    } catch (error) {
      console.error('Error creating crew:', error);
      throw error;
    }
  }
  
  // Get a crew by ID
  async getCrewById(crewId) {
    await this.init();
    
    try {
      return await dbManager.get(
        'SELECT * FROM crews WHERE id = ?',
        [crewId]
      );
    } catch (error) {
      console.error('Error getting crew by ID:', error);
      throw error;
    }
  }
  
  // Get a crew by name
  async getCrewByName(name) {
    await this.init();
    
    try {
      return await dbManager.get(
        'SELECT * FROM crews WHERE name = ?',
        [name]
      );
    } catch (error) {
      console.error('Error getting crew by name:', error);
      throw error;
    }
  }
  
  // Verify crew password
  async verifyCrewPassword(crewId, password) {
    await this.init();
    
    try {
      const crew = await this.getCrewById(crewId);
      if (!crew) return false;
      
      // If no password is set, or passwords match
      return !crew.password || crew.password === password;
    } catch (error) {
      console.error('Error verifying crew password:', error);
      return false;
    }
  }
  
  // Add a member to a crew
  async addCrewMember(crewId, discordId, role = 'member', startingGold = 0) {
    await this.init();
    
    try {
      await dbManager.run(
        'INSERT INTO crew_members (crew_id, discord_id, role, starting_gold, current_gold) VALUES (?, ?, ?, ?, ?)',
        [crewId, discordId, role, startingGold, startingGold]
      );
      
      return true;
    } catch (error) {
      console.error('Error adding crew member:', error);
      throw error;
    }
  }
  
  // Remove a member from a crew
  async removeCrewMember(crewId, discordId) {
    await this.init();
    
    try {
      await dbManager.run(
        'DELETE FROM crew_members WHERE crew_id = ? AND discord_id = ?',
        [crewId, discordId]
      );
      
      return true;
    } catch (error) {
      console.error('Error removing crew member:', error);
      throw error;
    }
  }
  
  // Update a crew member's gold
  async updateCrewMemberGold(crewId, discordId, gold) {
    await this.init();
    
    try {
      await dbManager.run(
        'UPDATE crew_members SET current_gold = ? WHERE crew_id = ? AND discord_id = ?',
        [gold, crewId, discordId]
      );
      
      return true;
    } catch (error) {
      console.error('Error updating crew member gold:', error);
      throw error;
    }
  }
  
  // Get all members of a crew
  async getCrewMembers(crewId) {
    await this.init();
    
    try {
      return await dbManager.query(
        'SELECT * FROM crew_members WHERE crew_id = ?',
        [crewId]
      );
    } catch (error) {
      console.error('Error getting crew members:', error);
      throw error;
    }
  }
  
  // Get all crews a user is part of
  async getUserCrews(discordId) {
    await this.init();
    
    try {
      return await dbManager.query(
        `SELECT c.*, cm.role 
         FROM crews c 
         JOIN crew_members cm ON c.id = cm.crew_id 
         WHERE cm.discord_id = ?`,
        [discordId]
      );
    } catch (error) {
      console.error('Error getting user crews:', error);
      throw error;
    }
  }
  
  // Check if user is in a crew
  async isUserInCrew(crewId, discordId) {
    await this.init();
    
    try {
      const member = await dbManager.get(
        'SELECT * FROM crew_members WHERE crew_id = ? AND discord_id = ?',
        [crewId, discordId]
      );
      
      return !!member;
    } catch (error) {
      console.error('Error checking if user is in crew:', error);
      return false;
    }
  }
  
  // Check if user is a crew captain
  async isUserCrewCaptain(crewId, discordId) {
    await this.init();
    
    try {
      const member = await dbManager.get(
        'SELECT * FROM crew_members WHERE crew_id = ? AND discord_id = ? AND role = ?',
        [crewId, discordId, 'captain']
      );
      
      return !!member;
    } catch (error) {
      console.error('Error checking if user is crew captain:', error);
      return false;
    }
  }
}

module.exports = new CrewModel();

// access-control.js - Manages access control and permissions
const dbManager = require('./database');

class AccessControl {
  constructor() {
    this.initialized = false;
  }
  
  async init() {
    if (this.initialized) return;
    
    try {
      // Create access_control table if it doesn't exist
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS access_control (
          id INT AUTO_INCREMENT PRIMARY KEY,
          discord_id VARCHAR(20) NOT NULL,
          role VARCHAR(50) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          granted_by VARCHAR(20) NOT NULL,
          granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_role (discord_id, role, guild_id)
        )
      `);
      
      console.log('Access control tables initialized');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing access control:', error);
      throw error;
    }
  }
  
  // Check if a user has a specific role
  async hasRole(discordId, role, guildId) {
    try {
      await this.init();
      
      const result = await dbManager.get(
        'SELECT * FROM access_control WHERE discord_id = ? AND role = ? AND guild_id = ?',
        [discordId, role, guildId]
      );
      
      return !!result;
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }
  
  // Grant a role to a user
  async grantRole(discordId, role, guildId, grantedBy) {
    try {
      await this.init();
      
      await dbManager.run(
        'INSERT INTO access_control (discord_id, role, guild_id, granted_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE granted_by = ?, granted_at = NOW()',
        [discordId, role, guildId, grantedBy, grantedBy]
      );
      
      return true;
    } catch (error) {
      console.error('Error granting role:', error);
      throw error;
    }
  }
  
  // Revoke a role from a user
  async revokeRole(discordId, role, guildId) {
    try {
      await this.init();
      
      await dbManager.run(
        'DELETE FROM access_control WHERE discord_id = ? AND role = ? AND guild_id = ?',
        [discordId, role, guildId]
      );
      
      return true;
    } catch (error) {
      console.error('Error revoking role:', error);
      throw error;
    }
  }
  
  // Get all roles for a user
  async getUserRoles(discordId, guildId) {
    try {
      await this.init();
      
      const results = await dbManager.query(
        'SELECT role FROM access_control WHERE discord_id = ? AND guild_id = ?',
        [discordId, guildId]
      );
      
      return results.map(row => row.role);
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }
  
  // Get all users with a specific role
  async getUsersWithRole(role, guildId) {
    try {
      await this.init();
      
      const results = await dbManager.query(
        'SELECT discord_id FROM access_control WHERE role = ? AND guild_id = ?',
        [role, guildId]
      );
      
      return results.map(row => row.discord_id);
    } catch (error) {
      console.error('Error getting users with role:', error);
      return [];
    }
  }
}

module.exports = new AccessControl();

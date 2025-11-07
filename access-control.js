// access-control.js - Manages access control and permissions
const dbManager = require('./database');

// Feature toggle configuration
const protectedFeatures = {
  'admin': { enabled: true, password: process.env.ADMIN_PASSWORD || 'adminpass' },
  'crew-tracking': { enabled: true, password: process.env.CREW_PASSWORD || null }
};

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
      
      // Create feature_access table for tracking feature access
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS feature_access (
          id INT AUTO_INCREMENT PRIMARY KEY,
          feature_name VARCHAR(50) NOT NULL,
          discord_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_access (feature_name, discord_id, guild_id)
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
  
  // Check if a feature is enabled globally
  isFeatureEnabled(featureName) {
    const feature = protectedFeatures[featureName];
    return feature && feature.enabled;
  }
  
  // Validate access to a feature with password
  validateFeatureAccess(featureName, providedPassword) {
    const feature = protectedFeatures[featureName];
    if (!feature) return false;
    if (!feature.enabled) return false;
    
    // If no password is set, or passwords match
    return !feature.password || feature.password === providedPassword;
  }
  
  // Grant feature access to a user
  async grantFeatureAccess(featureName, discordId, guildId) {
    try {
      await this.init();
      
      await dbManager.run(
        'INSERT INTO feature_access (feature_name, discord_id, guild_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE granted_at = NOW()',
        [featureName, discordId, guildId]
      );
      
      return true;
    } catch (error) {
      console.error('Error granting feature access:', error);
      throw error;
    }
  }
  
  // Check if a user has access to a feature
  async hasFeatureAccess(featureName, discordId, guildId) {
    try {
      await this.init();
      
      // First check if the feature is enabled globally
      if (!this.isFeatureEnabled(featureName)) {
        return false;
      }
      
      // If the feature doesn't require a password, everyone has access
      const feature = protectedFeatures[featureName];
      if (!feature.password) {
        return true;
      }
      
      // Check if the user has been granted access
      const result = await dbManager.get(
        'SELECT * FROM feature_access WHERE feature_name = ? AND discord_id = ? AND guild_id = ?',
        [featureName, discordId, guildId]
      );
      
      return !!result;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }
  
  // Revoke feature access from a user
  async revokeFeatureAccess(featureName, discordId, guildId) {
    try {
      await this.init();
      
      await dbManager.run(
        'DELETE FROM feature_access WHERE feature_name = ? AND discord_id = ? AND guild_id = ?',
        [featureName, discordId, guildId]
      );
      
      return true;
    } catch (error) {
      console.error('Error revoking feature access:', error);
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
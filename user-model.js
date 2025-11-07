// user-model.js - Handles user data
const dbManager = require('./database');

class UserModel {
  constructor() {
    this.initialized = false;
  }
  
  // Initialize the model
  async init() {
    if (this.initialized) return;
    
    try {
      // Create users table
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS users (
          discord_id VARCHAR(20) PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('User model initialized');
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing user model:', error);
      throw error;
    }
  }
  
  // Create or update a user
  async createOrUpdateUser(discordId, username) {
    await this.init();
    
    try {
      console.log(`Creating or updating user: ${discordId} (${username})`);
      
      // Check if user exists
      const user = await dbManager.get(
        'SELECT * FROM users WHERE discord_id = ?',
        [discordId]
      );
      
      if (user) {
        // Update existing user
        console.log(`Updating existing user: ${discordId}`);
        await dbManager.run(
          'UPDATE users SET username = ?, updated_at = NOW() WHERE discord_id = ?',
          [username, discordId]
        );
      } else {
        // Create new user
        console.log(`Creating new user: ${discordId}`);
        await dbManager.run(
          'INSERT INTO users (discord_id, username) VALUES (?, ?)',
          [discordId, username]
        );
      }
      
      return await this.getUserById(discordId);
    } catch (error) {
      console.error('Error creating or updating user:', error);
      throw error;
    }
  }
  
  // Get a user by ID
  async getUserById(discordId) {
    await this.init();
    
    try {
      const user = await dbManager.get(
        'SELECT * FROM users WHERE discord_id = ?',
        [discordId]
      );
      
      return user;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }
  
  // Get all users
  async getAllUsers() {
    await this.init();
    
    try {
      const users = await dbManager.query('SELECT * FROM users');
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }
}

// Export an instance of the UserModel class
module.exports = new UserModel();

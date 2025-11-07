// session-model.js - Handles session tracking
const dbManager = require('./database');

class SessionModel {
  constructor() {
    this.initialized = false;
  }
  
  // Initialize the model
  async init() {
    if (this.initialized) return;
    
    try {
      // Create sessions table
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          discord_id VARCHAR(20) NOT NULL,
          session_name VARCHAR(100) NOT NULL,
          starting_gold INT NOT NULL,
          ending_gold INT,
          earned_gold INT,
          start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP NULL,
          notes TEXT,
          FOREIGN KEY (discord_id) REFERENCES users(discord_id)
        )
      `);
      
      // Create cash_ins table
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS cash_ins (
          id INT AUTO_INCREMENT PRIMARY KEY,
          session_id INT NOT NULL,
          amount INT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
      `);
      
      console.log('Session model initialized');
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing session model:', error);
      throw error;
    }
  }
  
  // Start a new session
  async startSession(discordId, sessionName, startingGold) {
    await this.init();
    
    try {
      // Check if user already has an active session
      const activeSession = await this.getActiveSession(discordId);
      if (activeSession) {
        throw new Error('User already has an active session');
      }
      
      // Create new session
      const result = await dbManager.run(
        'INSERT INTO sessions (discord_id, session_name, starting_gold) VALUES (?, ?, ?)',
        [discordId, sessionName, startingGold]
      );
      
      // Get the created session
      const session = await this.getSessionById(result.id);
      return session;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }
  
  // End a session
  async endSession(sessionId, endingGold) {
    await this.init();
    
    try {
      console.log(`Ending session ${sessionId} with ending gold ${endingGold}`);
      
      // Get session
      const session = await this.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      console.log('Found session:', session);
      
      // Calculate earned gold
      const earnedGold = endingGold - session.starting_gold;
      console.log('Calculated earned gold:', earnedGold);
      
      // Update session - for MySQL
      await dbManager.run(
        'UPDATE sessions SET ending_gold = ?, earned_gold = ?, end_time = NOW() WHERE id = ?',
        [endingGold, earnedGold, sessionId]
      );
      
      console.log('Session updated in database');
      
      // Get updated session
      const updatedSession = await this.getSessionById(sessionId);
      console.log('Updated session:', updatedSession);
      return updatedSession;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }
  
  // Add notes to a session
  async addSessionNotes(sessionId, notes) {
    await this.init();
    
    try {
      await dbManager.run(
        'UPDATE sessions SET notes = ? WHERE id = ?',
        [notes, sessionId]
      );
      
      return await this.getSessionById(sessionId);
    } catch (error) {
      console.error('Error adding session notes:', error);
      throw error;
    }
  }
  
  // Add a cash-in to a session
  async addCashIn(sessionId, amount, notes = '') {
    await this.init();
    
    try {
      // Check if session exists
      const session = await this.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Add cash-in
      const result = await dbManager.run(
        'INSERT INTO cash_ins (session_id, amount, notes) VALUES (?, ?, ?)',
        [sessionId, amount, notes]
      );
      
      // Get the created cash-in
      const cashIn = await dbManager.get(
        'SELECT * FROM cash_ins WHERE id = ?',
        [result.id]
      );
      
      return cashIn;
    } catch (error) {
      console.error('Error adding cash-in:', error);
      throw error;
    }
  }
  
  // Get a session by ID
  async getSessionById(sessionId) {
    await this.init();
    
    try {
      console.log(`Getting session by ID: ${sessionId}`);
      const session = await dbManager.get(
        'SELECT * FROM sessions WHERE id = ?',
        [sessionId]
      );
      console.log('Session found:', session);
      return session;
    } catch (error) {
      console.error('Error getting session by ID:', error);
      throw error;
    }
  }
  
  // Get a user's active session
  async getActiveSession(discordId) {
    await this.init();
    
    try {
      const session = await dbManager.get(
        'SELECT * FROM sessions WHERE discord_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1',
        [discordId]
      );
      
      return session;
    } catch (error) {
      console.error('Error getting active session:', error);
      throw error;
    }
  }
  
  // Get a user's sessions
  async getUserSessions(discordId, limit = 10) {
    await this.init();
    
    try {
      const sessions = await dbManager.all(
        'SELECT * FROM sessions WHERE discord_id = ? ORDER BY start_time DESC LIMIT ?',
        [discordId, limit]
      );
      
      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  }
  
  // Get cash-ins for a session
  async getSessionCashIns(sessionId) {
    await this.init();
    
    try {
      const cashIns = await dbManager.all(
        'SELECT * FROM cash_ins WHERE session_id = ? ORDER BY timestamp ASC',
        [sessionId]
      );
      
      return cashIns;
    } catch (error) {
      console.error('Error getting session cash-ins:', error);
      throw error;
    }
  }
  
  // Get user's total earnings
  async getUserTotalEarnings(discordId) {
    await this.init();
    
    try {
      const result = await dbManager.get(
        'SELECT SUM(earned_gold) as total FROM sessions WHERE discord_id = ? AND end_time IS NOT NULL',
        [discordId]
      );
      
      return result ? result.total || 0 : 0;
    } catch (error) {
      console.error('Error getting user total earnings:', error);
      throw error;
    }
  }
  
  // Get user's session stats
  async getUserSessionStats(discordId) {
    await this.init();
    
    try {
      const stats = {
        totalSessions: 0,
        completedSessions: 0,
        totalEarnings: 0,
        averageEarnings: 0,
        totalTime: 0,
        averageTime: 0
      };
      
      // Get total sessions
      const totalResult = await dbManager.get(
        'SELECT COUNT(*) as count FROM sessions WHERE discord_id = ?',
        [discordId]
      );
      stats.totalSessions = totalResult ? totalResult.count : 0;
      
      // Get completed sessions
      const completedResult = await dbManager.get(
        'SELECT COUNT(*) as count FROM sessions WHERE discord_id = ? AND end_time IS NOT NULL',
        [discordId]
      );
      stats.completedSessions = completedResult ? completedResult.count : 0;
      
      // Get total earnings
      const earningsResult = await dbManager.get(
        'SELECT SUM(earned_gold) as total FROM sessions WHERE discord_id = ? AND end_time IS NOT NULL',
        [discordId]
      );
      stats.totalEarnings = earningsResult && earningsResult.total ? earningsResult.total : 0;
      
      // Calculate average earnings
      stats.averageEarnings = stats.completedSessions > 0 ? Math.floor(stats.totalEarnings / stats.completedSessions) : 0;
      
      // Get total time (in seconds)
      const timeResult = await dbManager.get(
        'SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as total_seconds FROM sessions WHERE discord_id = ? AND end_time IS NOT NULL',
        [discordId]
      );
      stats.totalTime = timeResult && timeResult.total_seconds ? timeResult.total_seconds : 0;
      
      // Calculate average time
      stats.averageTime = stats.completedSessions > 0 ? Math.floor(stats.totalTime / stats.completedSessions) : 0;
      
      return stats;
    } catch (error) {
      console.error('Error getting user session stats:', error);
      throw error;
    }
  }
}

module.exports = new SessionModel();


// Get a user's sessions
async getUserSessions(discordId, limit = 10) {
  await this.init();
  
  try {
    // Convert limit to a number to ensure proper type
    const numLimit = parseInt(limit);
    
    const sessions = await dbManager.all(
      'SELECT * FROM sessions WHERE discord_id = ? ORDER BY start_time DESC LIMIT ?',
      [discordId, numLimit]
    );
    
    return sessions;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    throw error;
  }
}
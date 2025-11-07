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
      
      // Create crew_sessions table to link sessions to crews
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS crew_sessions (
          session_id INT NOT NULL,
          crew_id INT NOT NULL,
          PRIMARY KEY (session_id),
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
      `);
      
      // Create crew_cash_ins table to track which crew member made each cash-in
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS crew_cash_ins (
          cash_in_id INT NOT NULL,
          discord_id VARCHAR(20) NOT NULL,
          PRIMARY KEY (cash_in_id),
          FOREIGN KEY (cash_in_id) REFERENCES cash_ins(id) ON DELETE CASCADE
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
  
  // Start a new crew session
  async startCrewSession(discordId, crewId, sessionName, startingGold) {
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
      
      // Link session to crew
      await dbManager.run(
        'INSERT INTO crew_sessions (session_id, crew_id) VALUES (?, ?)',
        [result.id, crewId]
      );
      
      // Get the created session
      const session = await this.getSessionById(result.id);
      return session;
    } catch (error) {
      console.error('Error starting crew session:', error);
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
  
  // End a crew session
  async endCrewSession(sessionId, endingGold) {
    await this.init();
    
    try {
      // Check if this is a crew session
      const isCrewSession = await this.isCrewSession(sessionId);
      if (!isCrewSession) {
        throw new Error('Not a crew session');
      }
      
      // End the session normally
      return await this.endSession(sessionId, endingGold);
    } catch (error) {
      console.error('Error ending crew session:', error);
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
  
  // Add a crew cash-in to a session
  async addCrewCashIn(sessionId, discordId, amount, notes = '') {
    await this.init();
    
    try {
      // Check if session exists and is a crew session
      const session = await this.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      const isCrewSession = await this.isCrewSession(sessionId);
      if (!isCrewSession) {
        throw new Error('Not a crew session');
      }
      
      // Add cash-in
      const result = await dbManager.run(
        'INSERT INTO cash_ins (session_id, amount, notes) VALUES (?, ?, ?)',
        [sessionId, amount, notes]
      );
      
      // Link cash-in to crew member
      await dbManager.run(
        'INSERT INTO crew_cash_ins (cash_in_id, discord_id) VALUES (?, ?)',
        [result.id, discordId]
      );
      
      // Get the created cash-in
      const cashIn = await dbManager.get(
        'SELECT * FROM cash_ins WHERE id = ?',
        [result.id]
      );
      
      return cashIn;
    } catch (error) {
      console.error('Error adding crew cash-in:', error);
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
  
  // Check if a session is a crew session
  async isCrewSession(sessionId) {
    await this.init();
    
    try {
      const crewSession = await dbManager.get(
        'SELECT * FROM crew_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      return !!crewSession;
    } catch (error) {
      console.error('Error checking if session is crew session:', error);
      return false;
    }
  }
  
  // Get crew ID for a session
  async getSessionCrewId(sessionId) {
    await this.init();
    
    try {
      const crewSession = await dbManager.get(
        'SELECT crew_id FROM crew_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      return crewSession ? crewSession.crew_id : null;
    } catch (error) {
      console.error('Error getting session crew ID:', error);
      return null;
    }
  }
  
  // Get a user's active session - IMPROVED VERSION
  async getActiveSession(discordId) {
    await this.init();
    
    try {
      console.log(`Checking for active session for user ${discordId}`);
      
      // Use a more explicit query with detailed logging
      const query = 'SELECT * FROM sessions WHERE discord_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1';
      console.log('Executing query:', query);
      console.log('Parameters:', [discordId]);
      
      // Use query instead of get for better error handling
      const sessions = await dbManager.query(query, [discordId]);
      
      console.log('Query result:', sessions);
      
      // Check if we got any results
      if (sessions && sessions.length > 0) {
        console.log('Active session found:', sessions[0]);
        return sessions[0];
      } else {
        console.log('No active session found');
        return null;
      }
    } catch (error) {
      console.error('Error getting active session:', error);
      throw error;
    }
  }
  
  // Get active crew session for a crew
  async getActiveCrewSession(crewId) {
    await this.init();
    
    try {
      const query = `
        SELECT s.* 
        FROM sessions s
        JOIN crew_sessions cs ON s.id = cs.session_id
        WHERE cs.crew_id = ? AND s.end_time IS NULL
        ORDER BY s.start_time DESC
        LIMIT 1
      `;
      
      const sessions = await dbManager.query(query, [crewId]);
      
      if (sessions && sessions.length > 0) {
        return sessions[0];
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting active crew session:', error);
      throw error;
    }
  }
  
  // Get a user's sessions
  async getUserSessions(discordId, limit = 10) {
    await this.init();
    
    try {
      // Convert limit to a number to ensure proper type
      const numLimit = parseInt(limit);
      
      console.log(`Getting sessions for user ${discordId} with limit ${numLimit}`);
      
      // Use query instead of execute for LIMIT statements
      const sessions = await dbManager.query(
        'SELECT * FROM sessions WHERE discord_id = ? ORDER BY start_time DESC LIMIT ?',
        [discordId, numLimit]
      );
      
      console.log(`Found ${sessions.length} sessions`);
      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  }
  
  // Get crew sessions
  async getCrewSessions(crewId, limit = 10) {
    await this.init();
    
    try {
      const numLimit = parseInt(limit);
      
      const query = `
        SELECT s.* 
        FROM sessions s
        JOIN crew_sessions cs ON s.id = cs.session_id
        WHERE cs.crew_id = ?
        ORDER BY s.start_time DESC
        LIMIT ?
      `;
      
      const sessions = await dbManager.query(query, [crewId, numLimit]);
      
      return sessions;
    } catch (error) {
      console.error('Error getting crew sessions:', error);
      throw error;
    }
  }
  
  // Get cash-ins for a session
  async getSessionCashIns(sessionId) {
    await this.init();
    
    try {
      const cashIns = await dbManager.query(
        'SELECT * FROM cash_ins WHERE session_id = ? ORDER BY timestamp ASC',
        [sessionId]
      );
      
      return cashIns;
    } catch (error) {
      console.error('Error getting session cash-ins:', error);
      throw error;
    }
  }
  
  // Get crew cash-ins for a session with member info
  async getCrewSessionCashIns(sessionId) {
    await this.init();
    
    try {
      const query = `
        SELECT ci.*, cci.discord_id
        FROM cash_ins ci
        LEFT JOIN crew_cash_ins cci ON ci.id = cci.cash_in_id
        WHERE ci.session_id = ?
        ORDER BY ci.timestamp ASC
      `;
      
      const cashIns = await dbManager.query(query, [sessionId]);
      
      return cashIns;
    } catch (error) {
      console.error('Error getting crew session cash-ins:', error);
      throw error;
    }
  }
  
  // Get crew session summary
  async getCrewSessionSummary(sessionId) {
    await this.init();
    
    try {
      // Check if session exists and is a crew session
      const session = await this.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      const crewId = await this.getSessionCrewId(sessionId);
      if (!crewId) {
        throw new Error('Not a crew session');
      }
      
      // Get all cash-ins for this session with member info
      const cashIns = await this.getCrewSessionCashIns(sessionId);
      
      // Group cash-ins by crew member
      const memberCashIns = {};
      let totalCashIn = 0;
      
      for (const cashIn of cashIns) {
        const discordId = cashIn.discord_id || 'unknown';
        
        if (!memberCashIns[discordId]) {
          memberCashIns[discordId] = {
            total: 0,
            cashIns: []
          };
        }
        
        memberCashIns[discordId].total += cashIn.amount;
        memberCashIns[discordId].cashIns.push(cashIn);
        totalCashIn += cashIn.amount;
      }
      
      return {
        session,
        crewId,
        memberCashIns,
        totalCashIn
      };
    } catch (error) {
      console.error('Error getting crew session summary:', error);
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
      
      console.log(`Getting session stats for user ${discordId}`);
      
      // Get total sessions - use query instead of execute
      const totalResult = await dbManager.query(
        'SELECT COUNT(*) as count FROM sessions WHERE discord_id = ?',
        [discordId]
      );
      stats.totalSessions = totalResult.length > 0 ? totalResult[0].count : 0;
      console.log(`Total sessions: ${stats.totalSessions}`);
      
      // Get completed sessions - use query instead of execute
      const completedResult = await dbManager.query(
        'SELECT COUNT(*) as count FROM sessions WHERE discord_id = ? AND end_time IS NOT NULL',
        [discordId]
      );
      stats.completedSessions = completedResult.length > 0 ? completedResult[0].count : 0;
      console.log(`Completed sessions: ${stats.completedSessions}`);
      
      // Get total earnings - use query instead of execute
      const earningsResult = await dbManager.query(
        'SELECT SUM(earned_gold) as total FROM sessions WHERE discord_id = ? AND end_time IS NOT NULL',
        [discordId]
      );
      stats.totalEarnings = earningsResult.length > 0 && earningsResult[0].total ? earningsResult[0].total : 0;
      console.log(`Total earnings: ${stats.totalEarnings}`);
      
      // Calculate average earnings
      stats.averageEarnings = stats.completedSessions > 0 ? Math.floor(stats.totalEarnings / stats.completedSessions) : 0;
      console.log(`Average earnings: ${stats.averageEarnings}`);
      
      // Get total time (in seconds) - use query instead of execute
      const timeResult = await dbManager.query(
        'SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as total_seconds FROM sessions WHERE discord_id = ? AND end_time IS NOT NULL',
        [discordId]
      );
      stats.totalTime = timeResult.length > 0 && timeResult[0].total_seconds ? timeResult[0].total_seconds : 0;
      console.log(`Total time: ${stats.totalTime} seconds`);
      
      // Calculate average time
      stats.averageTime = stats.completedSessions > 0 ? Math.floor(stats.totalTime / stats.completedSessions) : 0;
      console.log(`Average time: ${stats.averageTime} seconds`);
      
      return stats;
    } catch (error) {
      console.error('Error getting user session stats:', error);
      throw error;
    }
  }
  
  // Get crew session stats
  async getCrewSessionStats(crewId) {
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
      const totalQuery = `
        SELECT COUNT(*) as count 
        FROM sessions s
        JOIN crew_sessions cs ON s.id = cs.session_id
        WHERE cs.crew_id = ?
      `;
      
      const totalResult = await dbManager.query(totalQuery, [crewId]);
      stats.totalSessions = totalResult.length > 0 ? totalResult[0].count : 0;
      
      // Get completed sessions
      const completedQuery = `
        SELECT COUNT(*) as count 
        FROM sessions s
        JOIN crew_sessions cs ON s.id = cs.session_id
        WHERE cs.crew_id = ? AND s.end_time IS NOT NULL
      `;
      
      const completedResult = await dbManager.query(completedQuery, [crewId]);
      stats.completedSessions = completedResult.length > 0 ? completedResult[0].count : 0;
      
      // Get total earnings
      const earningsQuery = `
        SELECT SUM(s.earned_gold) as total 
        FROM sessions s
        JOIN crew_sessions cs ON s.id = cs.session_id
        WHERE cs.crew_id = ? AND s.end_time IS NOT NULL
      `;
      
      const earningsResult = await dbManager.query(earningsQuery, [crewId]);
      stats.totalEarnings = earningsResult.length > 0 && earningsResult[0].total ? earningsResult[0].total : 0;
      
      // Calculate average earnings
      stats.averageEarnings = stats.completedSessions > 0 ? Math.floor(stats.totalEarnings / stats.completedSessions) : 0;
      
      // Get total time (in seconds)
      const timeQuery = `
        SELECT SUM(TIMESTAMPDIFF(SECOND, s.start_time, s.end_time)) as total_seconds 
        FROM sessions s
        JOIN crew_sessions cs ON s.id = cs.session_id
        WHERE cs.crew_id = ? AND s.end_time IS NOT NULL
      `;
      
      const timeResult = await dbManager.query(timeQuery, [crewId]);
      stats.totalTime = timeResult.length > 0 && timeResult[0].total_seconds ? timeResult[0].total_seconds : 0;
      
      // Calculate average time
      stats.averageTime = stats.completedSessions > 0 ? Math.floor(stats.totalTime / stats.completedSessions) : 0;
      
      return stats;
    } catch (error) {
      console.error('Error getting crew session stats:', error);
      throw error;
    }
  }
}

module.exports = new SessionModel();

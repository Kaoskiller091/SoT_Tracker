// db-manager.js
const mysql = require('mysql2/promise');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.lastError = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000; // 5 seconds
    this.healthCheckInterval = null;
    this.stats = {
      queriesExecuted: 0,
      errorsEncountered: 0,
      reconnections: 0,
      lastHealthCheck: null
    };
  }

  // Initialize the connection pool
  async initialize() {
    try {
      console.log('Initializing MySQL connection pool...');
      
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sotc',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });
      
      // Test the connection
      await this.testConnection();
      
      // Start health check interval
      this.startHealthCheck();
      
      return true;
    } catch (error) {
      this.lastError = error;
      this.isConnected = false;
      console.error('Failed to initialize database connection:', error);
      return false;
    }
  }

  // Test the connection
  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ MySQL connection successful');
      connection.release();
      return true;
    } catch (error) {
      this.isConnected = false;
      this.lastError = error;
      console.error('❌ MySQL connection test failed:', error);
      return false;
    }
  }

  // Start periodic health checks
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, 60000); // Check every minute
    
    console.log('Database health checks started');
  }

  // Stop health checks
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Database health checks stopped');
    }
  }

  // Check database health
  async checkHealth() {
    try {
      const startTime = Date.now();
      const connection = await this.pool.getConnection();
      
      // Execute a simple query
      await connection.query('SELECT 1');
      
      connection.release();
      
      const responseTime = Date.now() - startTime;
      this.isConnected = true;
      this.stats.lastHealthCheck = {
        timestamp: new Date(),
        responseTime: responseTime,
        status: 'healthy'
      };
      
      // Log health check only occasionally to avoid spam
      if (Math.random() < 0.1) { // 10% chance to log
        console.log(`Database health check: OK (${responseTime}ms)`);
      }
      
      return true;
    } catch (error) {
      this.isConnected = false;
      this.lastError = error;
      this.stats.errorsEncountered++;
      this.stats.lastHealthCheck = {
        timestamp: new Date(),
        status: 'error',
        error: error.message
      };
      
      console.error('Database health check failed:', error);
      
      // Attempt reconnection
      this.attemptReconnect();
      
      return false;
    }
  }

  // Attempt to reconnect
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return false;
    }
    
    this.reconnectAttempts++;
    this.stats.reconnections++;
    
    console.log(`Attempting to reconnect to database (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    try {
      // Create a new pool
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sotc',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.query('SELECT 1');
      connection.release();
      
      this.isConnected = true;
      console.log('✅ Reconnection successful');
      return true;
    } catch (error) {
      this.isConnected = false;
      this.lastError = error;
      console.error('❌ Reconnection failed:', error);
      
      // Schedule another reconnection attempt
      setTimeout(() => {
        this.attemptReconnect();
      }, this.reconnectInterval);
      
      return false;
    }
  }

  // Execute a query with error handling and retry logic
  async query(sql, params = []) {
    if (!this.isConnected) {
      await this.testConnection();
      if (!this.isConnected) {
        throw new Error('Database is not connected');
      }
    }
    
    try {
      this.stats.queriesExecuted++;
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      this.stats.errorsEncountered++;
      this.lastError = error;
      
      console.error('Query error:', error);
      
      // Check if it's a connection error
      if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        
        this.isConnected = false;
        
        // Try to reconnect
        const reconnected = await this.attemptReconnect();
        if (reconnected) {
          // Retry the query
          return this.query(sql, params);
        }
      }
      
      throw error;
    }
  }

  // Get database status
  getStatus() {
    return {
      isConnected: this.isConnected,
      lastError: this.lastError ? {
        message: this.lastError.message,
        code: this.lastError.code,
        timestamp: new Date()
      } : null,
      stats: this.stats,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Close the connection pool
  async close() {
    this.stopHealthCheck();
    
    if (this.pool) {
      try {
        await this.pool.end();
        console.log('Database connection pool closed');
      } catch (error) {
        console.error('Error closing database connection pool:', error);
      }
    }
  }
}

// Create and export a singleton instance
const dbManager = new DatabaseManager();
module.exports = dbManager;

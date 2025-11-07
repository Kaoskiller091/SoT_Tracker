// database.js - Database connection and management
const mysql = require('mysql2/promise');
const logger = require('./logger');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
    this.initialized = false;
    this._queriesExecuted = 0;
    this._errorsEncountered = 0;
    this._reconnections = 0;
    this._lastHealthCheck = null;
    this._lastError = null;
  }
  
  async init() {
    if (this.initialized) return;
    
    try {
      logger.info('Initializing database connection');
      
      // Create database if it doesn't exist
      const rootPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        waitForConnections: true,
        connectionLimit: 2,
        queueLimit: 0
      });
      
      const dbName = process.env.DB_NAME || 'sotc';
      await rootPool.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      await rootPool.end();
      
      // Create connection pool for the database
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000 // 10 seconds
      });
      
      // Test connection
      const connection = await this.pool.getConnection();
      logger.info('✅ MySQL connection successful');
      connection.release();
      
      logger.info(`Database '${dbName}' ensured`);
      this.initialized = true;
      
      // Run initial health check
      await this.healthCheck();
    } catch (error) {
      logger.error('Error initializing database:', error);
      this._lastError = {
        code: error.code,
        message: error.message,
        timestamp: new Date()
      };
      this._errorsEncountered++;
      throw error;
    }
  }
  
  async query(sql, params = []) {
    await this.init();
    
    try {
      this._queriesExecuted++;
      const [results] = await this.pool.query(sql, params);
      return results;
    } catch (error) {
      this._errorsEncountered++;
      this._lastError = {
        code: error.code,
        message: error.message,
        timestamp: new Date()
      };
      logger.error('Error executing query:', { error, sql, params });
      throw error;
    }
  }
  
  async get(sql, params = []) {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }
  
  async run(sql, params = []) {
    await this.init();
    
    try {
      this._queriesExecuted++;
      const [result] = await this.pool.query(sql, params);
      return {
        id: result.insertId,
        affectedRows: result.affectedRows,
        changedRows: result.changedRows
      };
    } catch (error) {
      this._errorsEncountered++;
      this._lastError = {
        code: error.code,
        message: error.message,
        timestamp: new Date()
      };
      logger.error('Error executing run:', { error, sql, params });
      throw error;
    }
  }
  
  async execute(sql, params = []) {
    return this.run(sql, params);
  }
  
  async transaction(callback) {
    await this.init();
    
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const result = await callback(connection);
      await connection.commit();
      connection.release();
      return result;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }
  
  async closeConnections() {
    try {
      if (this.pool) {
        await this.pool.end();
        logger.info('Database pool closed successfully');
        return true;
      }
      return true; // No connections to close
    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }
  
  // Get database status for monitoring
  getStatus() {
    return {
      isConnected: this.pool !== null && this.initialized,
      stats: {
        queriesExecuted: this._queriesExecuted || 0,
        errorsEncountered: this._errorsEncountered || 0,
        reconnections: this._reconnections || 0,
        lastHealthCheck: this._lastHealthCheck || null
      },
      lastError: this._lastError || null
    };
  }
  
  // Perform a health check on the database
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      this._lastHealthCheck = {
        status: 'healthy',
        timestamp: new Date(),
        responseTime
      };
      
      return this._lastHealthCheck;
    } catch (error) {
      this._lastHealthCheck = {
        status: 'error',
        timestamp: new Date(),
        error: error.message
      };
      
      return this._lastHealthCheck;
    }
  }
}

module.exports = new Database();

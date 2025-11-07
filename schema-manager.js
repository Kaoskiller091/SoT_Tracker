// schema-manager.js - Schema management
const logger = require('./logger');
const dbManager = require('./database');

class SchemaManager {
  constructor() {
    this.initialized = false;
  }
  
  async init() {
    if (this.initialized) return;
    
    try {
      // Create schema_versions table if it doesn't exist
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS schema_versions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          version VARCHAR(20) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          description TEXT
        )
      `);
      
      this.initialized = true;
      logger.info('Schema manager initialized');
    } catch (error) {
      logger.error('Error initializing schema manager:', error);
      throw error;
    }
  }
  
  async getCurrentVersion() {
    await this.init();
    
    try {
      const versionRecord = await dbManager.get(
        'SELECT version FROM schema_versions ORDER BY id DESC LIMIT 1'
      );
      
      return versionRecord ? versionRecord.version : null;
    } catch (error) {
      logger.error('Error getting current schema version:', error);
      throw error;
    }
  }
  
  async applyMigration(version, description, migrationFn) {
    await this.init();
    
    try {
      // Check if this version is already applied
      const existingVersion = await dbManager.get(
        'SELECT id FROM schema_versions WHERE version = ?',
        [version]
      );
      
      if (existingVersion) {
        logger.info(`Migration ${version} already applied, skipping`);
        return false;
      }
      
      // Apply the migration using a transaction
      await dbManager.transaction(async (connection) => {
        // Run the migration function with the connection object
        await migrationFn(connection);
        
        // Record the migration
        await connection.query(
          'INSERT INTO schema_versions (version, description) VALUES (?, ?)',
          [version, description]
        );
      });
      
      logger.info(`Applied schema migration to version ${version}: ${description}`);
      return true;
    } catch (error) {
      logger.error(`Failed to apply migration ${version}:`, error);
      throw error;
    }
  }
  
  // Helper method to ensure a column exists in a table
  async ensureColumn(tableName, columnName, columnDefinition) {
    try {
      // Check if column exists
      const columnExists = await this.columnExists(tableName, columnName);
      
      if (!columnExists) {
        logger.info(`Adding column ${columnName} to ${tableName}`);
        await dbManager.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error ensuring column ${columnName} in ${tableName}:`, error);
      throw error;
    }
  }
  
  async columnExists(tableName, columnName) {
    try {
      const result = await dbManager.get(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
        [process.env.DB_NAME || 'sotc', tableName, columnName]
      );
      return !!result;
    } catch (error) {
      logger.error('Error checking if column exists:', error);
      return false;
    }
  }
}

module.exports = new SchemaManager();

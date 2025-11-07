// run-migrations.js - Migration runner
const logger = require('./logger');
const dbManager = require('./database');
const schemaManager = require('./schema-manager');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    logger.info('Starting database migrations');
    
    // Initialize database connection
    await dbManager.init();
    
    // Get current schema version
    const currentVersion = await schemaManager.getCurrentVersion();
    logger.info(`Current schema version: ${currentVersion || 'none'}`);
    
    // Load migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('Migrations directory not found, creating it');
      fs.mkdirSync(migrationsDir);
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    logger.info(`Found ${migrationFiles.length} migration files`);
    
    // Apply migrations
    for (const file of migrationFiles) {
      try {
        const migration = require(path.join(migrationsDir, file));
        
        logger.info(`Processing migration: ${migration.version} - ${migration.description}`);
        
        const applied = await schemaManager.applyMigration(
          migration.version,
          migration.description,
          async (connection) => await migration.apply(connection)
        );
        
        if (applied) {
          logger.info(`Applied migration: ${migration.version}`);
        } else {
          logger.info(`Skipped migration: ${migration.version} (already applied)`);
        }
      } catch (error) {
        logger.error(`Error applying migration from file ${file}:`, error);
        throw error;
      }
    }
    
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  }
}

// Only close connections if running as standalone script
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      dbManager.closeConnections().then(() => process.exit(0));
    })
    .catch(error => {
      logger.error('Migration process failed:', error);
      dbManager.closeConnections().then(() => process.exit(1));
    });
}

module.exports = runMigrations;

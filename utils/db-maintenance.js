// utils/db-maintenance.js
const dbManager = require('../database');
const logger = require('../logger');

async function performMaintenance() {
  try {
    logger.info('Starting database maintenance');
    
    // Check database connection
    await dbManager.healthCheck();
    
    // Optimize tables
    await optimizeTables();
    
    // Check for orphaned records
    await checkOrphanedRecords();
    
    logger.info('Database maintenance completed successfully');
  } catch (error) {
    logger.error('Error during database maintenance:', error);
  } finally {
    await dbManager.closeConnections();
  }
}

async function optimizeTables() {
  const tables = ['users', 'gold_history', 'sessions', 'session_cash_ins', 'schema_versions'];
  
  for (const table of tables) {
    logger.info(`Optimizing table: ${table}`);
    try {
      await dbManager.run(`OPTIMIZE TABLE ${table}`);
    } catch (error) {
      logger.error(`Error optimizing table ${table}:`, error);
    }
  }
}

async function checkOrphanedRecords() {
  logger.info('Checking for orphaned records');
  
  // Check for gold history records without users
  const orphanedGold = await dbManager.query(`
    SELECT gh.id, gh.discord_id 
    FROM gold_history gh 
    LEFT JOIN users u ON gh.discord_id = u.discord_id 
    WHERE u.discord_id IS NULL
  `);
  
  if (orphanedGold.length > 0) {
    logger.warn(`Found ${orphanedGold.length} orphaned gold history records`);
  }
  
  // Check for session records without users
  const orphanedSessions = await dbManager.query(`
    SELECT s.id, s.discord_id 
    FROM sessions s 
    LEFT JOIN users u ON s.discord_id = u.discord_id 
    WHERE u.discord_id IS NULL
  `);
  
  if (orphanedSessions.length > 0) {
    logger.warn(`Found ${orphanedSessions.length} orphaned session records`);
  }
}

// Run if called directly
if (require.main === module) {
  performMaintenance()
    .then(() => {
      logger.info('Maintenance script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Maintenance script failed:', error);
      process.exit(1);
    });
}

module.exports = { performMaintenance, optimizeTables, checkOrphanedRecords };

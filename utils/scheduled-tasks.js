// utils/scheduled-tasks.js
const { createBackup } = require('./db-backup');
const { performMaintenance } = require('./db-maintenance');
const { checkBotHealth } = require('./health-check');
const logger = require('../logger');

// Schedule configuration (in milliseconds)
const SCHEDULE = {
  BACKUP: 24 * 60 * 60 * 1000, // Daily
  MAINTENANCE: 7 * 24 * 60 * 60 * 1000, // Weekly
  HEALTH_CHECK: 60 * 60 * 1000 // Hourly
};

let backupInterval;
let maintenanceInterval;
let healthCheckInterval;

function startScheduledTasks() {
  logger.info('Starting scheduled tasks');
  
  // Schedule database backups
  backupInterval = setInterval(async () => {
    try {
      logger.info('Running scheduled backup');
      await createBackup();
    } catch (error) {
      logger.error('Scheduled backup failed:', error);
    }
  }, SCHEDULE.BACKUP);
  
  // Schedule database maintenance
  maintenanceInterval = setInterval(async () => {
    try {
      logger.info('Running scheduled maintenance');
      await performMaintenance();
    } catch (error) {
      logger.error('Scheduled maintenance failed:', error);
    }
  }, SCHEDULE.MAINTENANCE);
  
  // Schedule health checks
  healthCheckInterval = setInterval(async () => {
    try {
      logger.info('Running scheduled health check');
      await checkBotHealth();
    } catch (error) {
      logger.error('Scheduled health check failed:', error);
    }
  }, SCHEDULE.HEALTH_CHECK);
  
  // Run initial health check
  checkBotHealth().catch(error => {
    logger.error('Initial health check failed:', error);
  });
  
  logger.info('Scheduled tasks started');
}

function stopScheduledTasks() {
  logger.info('Stopping scheduled tasks');
  
  clearInterval(backupInterval);
  clearInterval(maintenanceInterval);
  clearInterval(healthCheckInterval);
  
  logger.info('Scheduled tasks stopped');
}

module.exports = { startScheduledTasks, stopScheduledTasks };

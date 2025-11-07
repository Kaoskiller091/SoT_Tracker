// scheduler.js
const { scheduleJob } = require('node-schedule');
const dbMaintenance = require('./db-maintenance');
const dbMonitor = require('./monitor-db');

// Schedule database health checks
function scheduleHealthChecks() {
  // Run every 5 minutes
  scheduleJob('*/5 * * * *', async () => {
    console.log('Running scheduled health check...');
    await dbMonitor.performHealthCheck();
  });
  
  // Print statistics every hour
  scheduleJob('0 * * * *', () => {
    console.log('Generating hourly statistics...');
    dbMonitor.printStatistics();
  });
}

// Schedule database maintenance
function scheduleMaintenance() {
  // Run daily at 3:00 AM
  scheduleJob('0 3 * * *', async () => {
    console.log('Running scheduled database maintenance...');
    await dbMaintenance.runMaintenance();
  });
  
  // Create backup every 6 hours
  scheduleJob('0 */6 * * *', async () => {
    console.log('Creating scheduled backup...');
    await dbMaintenance.createBackup();
  });
}

// Start all scheduled tasks
function startScheduler() {
  console.log('Starting scheduled tasks...');
  scheduleHealthChecks();
  scheduleMaintenance();
  console.log('Scheduler started');
}

// Run if called directly
if (require.main === module) {
  startScheduler();
}

module.exports = {
  scheduleHealthChecks,
  scheduleMaintenance,
  startScheduler
};


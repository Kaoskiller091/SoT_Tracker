// monitor-db.js
const dbManager = require('./db-manager');
const fs = require('fs');
const path = require('path');

// Configuration
const LOG_FILE = path.join(__dirname, 'logs', 'db-monitor.log');
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const HISTORY_LENGTH = 100; // Keep last 100 checks

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// History of checks
const history = [];

// Function to perform a health check
async function performHealthCheck() {
  const startTime = Date.now();
  let status = 'error';
  let error = null;
  let responseTime = null;
  
  try {
    // Initialize if not already
    if (!dbManager.isConnected) {
      await dbManager.initialize();
    }
    
    // Test connection
    const connection = await dbManager.pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    
    status = 'healthy';
    responseTime = Date.now() - startTime;
  } catch (err) {
    error = err;
    console.error('Health check failed:', err);
  }
  
  // Record check
  const check = {
    timestamp: new Date(),
    status,
    responseTime,
    error: error ? { message: error.message, code: error.code } : null
  };
  
  // Add to history
  history.push(check);
  if (history.length > HISTORY_LENGTH) {
    history.shift(); // Remove oldest
  }
  
  // Log to file
  const logEntry = `${check.timestamp.toISOString()} | Status: ${status} | Response: ${responseTime}ms | ${error ? 'Error: ' + error.message : 'OK'}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
  
  // Print summary
  console.log(`[${check.timestamp.toLocaleTimeString()}] Database health: ${status} ${responseTime ? `(${responseTime}ms)` : ''}`);
  
  return check;
}

// Function to print statistics
function printStatistics() {
  if (history.length === 0) {
    console.log('No health checks recorded yet');
    return;
  }
  
  const totalChecks = history.length;
  const healthyChecks = history.filter(check => check.status === 'healthy').length;
  const errorChecks = totalChecks - healthyChecks;
  const uptime = (healthyChecks / totalChecks * 100).toFixed(2);
  
  const responseTimes = history
    .filter(check => check.responseTime)
    .map(check => check.responseTime);
  
  const avgResponse = responseTimes.length > 0
    ? (responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(2)
    : 'N/A';
  
  console.log('\n=== Database Health Statistics ===');
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Healthy: ${healthyChecks} (${uptime}% uptime)`);
  console.log(`Errors: ${errorChecks}`);
  console.log(`Average Response Time: ${avgResponse}ms`);
  console.log('================================\n');
}

// Start monitoring
async function startMonitoring() {
  console.log('Starting database monitoring...');
  console.log(`Checks will be performed every ${CHECK_INTERVAL / 1000} seconds`);
  console.log(`Logs will be written to ${LOG_FILE}`);
  
  // Perform initial check
  await performHealthCheck();
  
  // Schedule regular checks
  setInterval(async () => {
    await performHealthCheck();
    
    // Print statistics every 10 checks
    if (history.length % 10 === 0) {
      printStatistics();
    }
  }, CHECK_INTERVAL);
}

// Start if run directly
if (require.main === module) {
  startMonitoring();
}

module.exports = {
  performHealthCheck,
  getHistory: () => history,
  printStatistics
};

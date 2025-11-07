// simple-monitor.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuration
const CHECK_INTERVAL = 10000; // 10 seconds for testing

// Function to perform a health check
async function performHealthCheck() {
  const startTime = Date.now();
  console.log(`[${new Date().toLocaleTimeString()}] Performing health check...`);
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sotc'
    });
    
    // Test with a simple query
    await connection.query('SELECT 1');
    
    // Close connection
    await connection.end();
    
    const responseTime = Date.now() - startTime;
    console.log(`[${new Date().toLocaleTimeString()}] Health check: OK (${responseTime}ms)`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Health check failed:`, error);
    return false;
  }
}

// Start monitoring
console.log('Starting simple database monitoring...');
console.log(`Checks will be performed every ${CHECK_INTERVAL / 1000} seconds`);
console.log('Press Ctrl+C to stop');

// Perform initial check
performHealthCheck();

// Schedule regular checks
const interval = setInterval(performHealthCheck, CHECK_INTERVAL);

// Handle termination
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('Monitoring stopped');
  process.exit();
});

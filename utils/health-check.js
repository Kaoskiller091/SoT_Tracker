// utils/health-check.js
const dbManager = require('../database');
const logger = require('../logger');
const fs = require('fs');
const path = require('path');

async function checkBotHealth() {
  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };
  
  try {
    // Check database connection
    results.checks.database = await checkDatabase();
    
    // Check disk space
    results.checks.diskSpace = checkDiskSpace();
    
    // Check log files
    results.checks.logs = checkLogFiles();
    
    // Check memory usage
    results.checks.memory = checkMemoryUsage();
    
    // Determine overall status
    results.status = Object.values(results.checks).every(check => check.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';
    
    // Log results
    if (results.status === 'healthy') {
      logger.info('Health check passed', results);
    } else {
      logger.warn('Health check failed', results);
    }
    
    return results;
  } catch (error) {
    logger.error('Error performing health check:', error);
    results.status = 'error';
    results.error = error.message;
    return results;
  }
}

async function checkDatabase() {
  try {
    const healthCheck = await dbManager.healthCheck();
    
    return {
      status: healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
      responseTime: healthCheck.responseTime || null,
      error: healthCheck.error || null
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

function checkDiskSpace() {
  try {
    const stats = fs.statfsSync(path.resolve(__dirname, '..'));
    const totalSpace = stats.blocks * stats.bsize;
    const freeSpace = stats.bfree * stats.bsize;
    const usedSpace = totalSpace - freeSpace;
    const usedPercentage = (usedSpace / totalSpace) * 100;
    
    return {
      status: usedPercentage < 90 ? 'healthy' : 'unhealthy',
      totalGB: (totalSpace / 1024 / 1024 / 1024).toFixed(2),
      freeGB: (freeSpace / 1024 / 1024 / 1024).toFixed(2),
      usedPercentage: usedPercentage.toFixed(2)
    };
  } catch (error) {
    logger.error('Disk space check failed:', error);
    return {
      status: 'unknown',
      error: error.message
    };
  }
}

function checkLogFiles() {
  try {
    const logsDir = path.join(__dirname, '../logs');
    
    if (!fs.existsSync(logsDir)) {
      return {
        status: 'unhealthy',
        error: 'Logs directory does not exist'
      };
    }
    
    const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
    const totalSize = logFiles.reduce((total, file) => {
      return total + fs.statSync(path.join(logsDir, file)).size;
    }, 0);
    
    return {
      status: 'healthy',
      fileCount: logFiles.length,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  } catch (error) {
    logger.error('Log files check failed:', error);
    return {
      status: 'unknown',
      error: error.message
    };
  }
}

function checkMemoryUsage() {
  try {
    const memoryUsage = process.memoryUsage();
    const usedMemoryMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
    const heapTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
    const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    
    // Consider unhealthy if using more than 1GB of memory
    const status = memoryUsage.rss < 1024 * 1024 * 1024 ? 'healthy' : 'unhealthy';
    
    return {
      status,
      usedMemoryMB,
      heapTotalMB,
      heapUsedMB
    };
  } catch (error) {
    logger.error('Memory usage check failed:', error);
    return {
      status: 'unknown',
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  checkBotHealth()
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
      process.exit(results.status === 'healthy' ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkBotHealth };

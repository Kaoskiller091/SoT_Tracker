// logger.js - Enhanced logging system
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log file streams
const errorStream = fs.createWriteStream(
  path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`),
  { flags: 'a' }
);

const infoStream = fs.createWriteStream(
  path.join(logsDir, `info-${new Date().toISOString().split('T')[0]}.log`),
  { flags: 'a' }
);

// Simple logger that preserves existing console behavior while adding file logging
const logger = {
  error: (message, data) => {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [ERROR] ${message}`;
    
    if (data) {
      try {
        logMessage += '\n' + (typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      } catch (e) {
        logMessage += '\n[Object could not be stringified]';
      }
    }
    
    console.error(message, data); // Preserve existing behavior
    errorStream.write(logMessage + '\n');
  },
  
  warn: (message, data) => {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [WARN] ${message}`;
    
    if (data) {
      try {
        logMessage += '\n' + (typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      } catch (e) {
        logMessage += '\n[Object could not be stringified]';
      }
    }
    
    console.warn(message, data); // Preserve existing behavior
    infoStream.write(logMessage + '\n');
  },
  
  info: (message, data) => {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [INFO] ${message}`;
    
    if (data) {
      try {
        logMessage += '\n' + (typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      } catch (e) {
        logMessage += '\n[Object could not be stringified]';
      }
    }
    
    console.log(message, data); // Preserve existing behavior
    infoStream.write(logMessage + '\n');
  },
  
  debug: (message, data) => {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [DEBUG] ${message}`;
    
    if (data) {
      try {
        logMessage += '\n' + (typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      } catch (e) {
        logMessage += '\n[Object could not be stringified]';
      }
    }
    
    console.log(message, data); // Preserve existing behavior
  },
  
  // Close log streams (for graceful shutdown)
  close: () => {
    errorStream.end();
    infoStream.end();
  }
};

module.exports = logger;

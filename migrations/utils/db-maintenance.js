// db-maintenance.js
require('dotenv').config();
const dbManager = require('./db-manager');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const BACKUP_DIR = path.join(__dirname, 'backups');
const LOG_FILE = path.join(__dirname, 'logs', 'db-maintenance.log');

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log function
function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${message}\n`;
  
  console.log(message);
  fs.appendFileSync(LOG_FILE, logEntry);
}

// Create database backup
async function createBackup() {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `sotc-backup-${timestamp}.sql`);
    
    // Database credentials from .env
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'sotc';
    
    // Construct mysqldump command
    const mysqldump = `mysqldump --host=${dbHost} --user=${dbUser} ${dbPassword ? `--password=${dbPassword}` : ''} ${dbName} > "${backupFile}"`;
    
    log(`Creating database backup: ${backupFile}`);
    
    exec(mysqldump, (error, stdout, stderr) => {
      if (error) {
        log(`Backup failed: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        log(`Backup warning: ${stderr}`);
      }
      
      log(`Backup created successfully: ${backupFile}`);
      resolve(backupFile);
    });
  });
}

// Clean up old backups (keep last 10)
function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('sotc-backup-') && file.endsWith('.sql'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Sort by time, newest first
  
  // Keep only the 10 most recent backups
  if (files.length > 10) {
    const filesToDelete = files.slice(10);
    log(`Cleaning up ${filesToDelete.length} old backups...`);
    
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        log(`Deleted old backup: ${file.name}`);
      } catch (error) {
        log(`Failed to delete backup ${file.name}: ${error.message}`);
      }
    });
  }
}

// Optimize tables
async function optimizeTables() {
  try {
    await dbManager.initialize();
    
    log('Getting list of tables...');
    const tables = await dbManager.query('SHOW TABLES');
    
    if (tables.length === 0) {
      log('No tables found to optimize');
      return;
    }
    
    // Get table name from the first column (column name varies by MySQL version)
    const tableNameColumn = Object.keys(tables[0])[0];
    const tableNames = tables.map(table => table[tableNameColumn]);
    
    log(`Optimizing ${tableNames.length} tables...`);
    
    for (const tableName of tableNames) {
      log(`Optimizing table: ${tableName}`);
      await dbManager.query(`OPTIMIZE TABLE ${tableName}`);
    }
    
    log('Table optimization complete');
  } catch (error) {
    log(`Error optimizing tables: ${error.message}`);
    throw error;
  }
}

// Run full maintenance
async function runMaintenance() {
  log('Starting database maintenance...');
  
  try {
    // Create backup
    await createBackup();
    
    // Clean up old backups
    cleanupOldBackups();
    
    // Optimize tables
    await optimizeTables();
    
    log('Maintenance completed successfully');
  } catch (error) {
    log(`Maintenance failed: ${error.message}`);
  } finally {
    // Close database connection
    await dbManager.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMaintenance();
}

module.exports = {
  createBackup,
  cleanupOldBackups,
  optimizeTables,
  runMaintenance
};

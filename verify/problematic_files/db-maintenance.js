// db-maintenance.js - Simplified version
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Created backup directory: ${BACKUP_DIR}`);
}

// Log function
function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

// Create database backup
function createBackup() {
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
      return;
    }
    if (stderr) {
      log(`Backup warning: ${stderr}`);
    }
    
    log(`Backup created successfully: ${backupFile}`);
  });
}

// Run maintenance
log('Starting database maintenance...');
createBackup();

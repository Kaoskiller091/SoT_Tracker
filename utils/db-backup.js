// utils/db-backup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../logger');
require('dotenv').config();

// Backup directory
const backupDir = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function createBackup() {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
    
    logger.info(`Creating database backup: ${backupFile}`);
    
    const dbName = process.env.DB_NAME || 'sotc';
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbHost = process.env.DB_HOST || 'localhost';
    
    // Create mysqldump command
    const cmd = `mysqldump -h ${dbHost} -u ${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} > "${backupFile}"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error creating backup: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        logger.warn(`Backup warning: ${stderr}`);
      }
      
      logger.info(`Backup created successfully: ${backupFile}`);
      
      // Clean up old backups (keep last 10)
      cleanupOldBackups();
      
      resolve(backupFile);
    });
  });
}

function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort newest to oldest
    
    // Keep only the 10 most recent backups
    if (files.length > 10) {
      logger.info(`Cleaning up old backups, keeping the 10 most recent of ${files.length} total`);
      
      for (let i = 10; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
        logger.info(`Deleted old backup: ${files[i].name}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up old backups:', error);
  }
}

// Run if called directly
if (require.main === module) {
  createBackup()
    .then(() => {
      logger.info('Backup script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Backup script failed:', error);
      process.exit(1);
    });
}

module.exports = { createBackup, cleanupOldBackups };

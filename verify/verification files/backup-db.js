// backup-db.js
require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create backups directory if it doesn't exist
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `sotc-backup-${timestamp}.sql`);

// Database credentials from .env
const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'sotc';

// Construct mysqldump command
const mysqldump = `mysqldump --host=${dbHost} --user=${dbUser} ${dbPassword ? `--password=${dbPassword}` : ''} ${dbName} > "${backupFile}"`;

console.log('Creating database backup...');
exec(mysqldump, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Backup warning: ${stderr}`);
    return;
  }
  console.log(`Backup created successfully: ${backupFile}`);
});

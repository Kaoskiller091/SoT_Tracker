// start.js
require('dotenv').config();
const database = require('./database');
const dbManager = require('./db-manager');
const scheduler = require('./scheduler');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file streams
const outStream = fs.createWriteStream(path.join(logsDir, 'bot-out.log'), { flags: 'a' });
const errStream = fs.createWriteStream(path.join(logsDir, 'bot-err.log'), { flags: 'a' });

// Start the bot
async function startBot() {
  console.log('Starting Sea of Thieves Companion Bot...');
  
  try {
    // Initialize database
    console.log('Initializing database...');
    await database.initDatabase();
    console.log('Database initialized successfully');
    
    // Start scheduler
    console.log('Starting scheduler...');
    scheduler.startScheduler();
    
    // Start the bot process
    console.log('Starting bot process...');
    const botProcess = spawn('node', ['index.js'], {
      stdio: ['ignore', outStream, errStream]
    });
    
    botProcess.on('exit', (code, signal) => {
      console.log(`Bot process exited with code ${code} and signal ${signal}`);
      
      if (code !== 0) {
        console.log('Bot crashed, restarting in 5 seconds...');
        setTimeout(startBot, 5000);
      }
    });
    
    console.log('Bot started successfully');
  } catch (error) {
    console.error('Failed to start bot:', error);
    console.log('Retrying in 10 seconds...');
    setTimeout(startBot, 10000);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  try {
    await database.closeDatabase();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
  process.exit(0);
});

// Start the bot
startBot();

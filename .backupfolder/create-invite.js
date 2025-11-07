// create-invite.js
require('dotenv').config();

const clientId = process.env.CLIENT_ID;
if (!clientId) {
  console.error('CLIENT_ID is missing in .env file');
  process.exit(1);
}

// Define required scopes and permissions
const scopes = ['bot', 'applications.commands'];

// Bot permissions based on Discord's documentation
// 277025770560 = Send Messages, View Channels, Read Message History, Use Slash Commands, etc.
const permissions = '277025770560';

// Create the URL
const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes.join('%20')}`;

console.log('=== Discord Bot Invitation URL ===');
console.log('\nUse this URL to invite your bot to a server:');
console.log('\n' + url + '\n');
console.log('Instructions:');
console.log('1. Open this URL in your browser');
console.log('2. Select a server where you have "Manage Server" permissions');
console.log('3. Keep all permissions checked and click "Authorize"');
console.log('\nAfter inviting the bot, run your bot with: node index.js');

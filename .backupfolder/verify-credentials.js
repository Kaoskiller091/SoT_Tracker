// verify-credentials.js
require('dotenv').config();
const { REST } = require('discord.js');

console.log('=== Discord Credentials Verification ===\n');

// Check if token exists
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN is missing in your .env file');
  process.exit(1);
}

// Check if client ID exists
const clientId = process.env.CLIENT_ID;
if (!clientId) {
  console.error('❌ CLIENT_ID is missing in your .env file');
  process.exit(1);
}

// Create REST instance
const rest = new REST({ version: '10' }).setToken(token);

// Test the token by making an API call
(async () => {
  try {
    console.log('Testing bot token...');
    
    // Try to get the bot's own user information
    const botUser = await rest.get('/users/@me');
    
    console.log('✅ Token is valid!');
    console.log(`Bot Username: ${botUser.username}${botUser.discriminator ? `#${botUser.discriminator}` : ''}`);
    console.log(`Bot ID: ${botUser.id}`);
    
    // Verify the Client ID matches the bot's ID
    if (botUser.id === clientId) {
      console.log('✅ CLIENT_ID matches the bot\'s ID');
    } else {
      console.error(`❌ CLIENT_ID (${clientId}) does not match the bot's ID (${botUser.id})`);
      console.error('Please update your CLIENT_ID in the .env file to match your bot\'s ID');
    }
    
    // Get the bot's guilds (servers)
    const guilds = await rest.get('/users/@me/guilds');
    console.log(`\nBot is in ${guilds.length} servers:`);
    
    // List the first 10 servers
    const displayLimit = Math.min(guilds.length, 10);
    for (let i = 0; i < displayLimit; i++) {
      console.log(`- ${guilds[i].name} (ID: ${guilds[i].id})`);
    }
    
    if (guilds.length > 10) {
      console.log(`  ...and ${guilds.length - 10} more`);
    }
    
    // Check if GUILD_ID is set and valid
    const guildId = process.env.GUILD_ID;
    if (guildId) {
      const guildExists = guilds.some(guild => guild.id === guildId);
      if (guildExists) {
        console.log(`\n✅ Bot is a member of the guild specified in GUILD_ID (${guildId})`);
      } else {
        console.error(`\n❌ Bot is NOT a member of the guild specified in GUILD_ID (${guildId})`);
        console.error('Please invite the bot to this guild or update your GUILD_ID');
      }
    } else {
      console.log('\n⚠️ No GUILD_ID specified in .env file');
    }
    
  } catch (error) {
    console.error('❌ Token verification failed!');
    
    if (error.status === 401) {
      console.error('The token is invalid. Please check your .env file and make sure you have the correct token.');
    } else {
      console.error('Error details:', error);
    }
  }
})();

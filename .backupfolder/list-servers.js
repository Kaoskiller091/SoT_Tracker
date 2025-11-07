// list-servers.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds] 
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('\nServers this bot is in:');
  console.log('=======================');
  
  client.guilds.cache.forEach(guild => {
    console.log(`${guild.name}: ${guild.id}`);
  });
  
  console.log('\nCopy the ID of the server you want to use');
  client.destroy(); // Properly disconnect the bot
});

client.login(process.env.DISCORD_TOKEN)
  .catch(error => {
    console.error('Failed to log in:', error);
  });

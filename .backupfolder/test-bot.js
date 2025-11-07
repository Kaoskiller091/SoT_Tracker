const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Test bot is ready!');
});

client.on(Events.MessageCreate, message => {
  if (message.content === '!hello') {
    message.reply('Hello! I am working!');
  }
});

client.login(process.env.DISCORD_TOKEN);

// simple-bot.js
const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

// Check for token
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Error: DISCORD_TOKEN is missing in .env file');
  process.exit(1);
}

// Create client with required intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  }
}

// When the client is ready, run this code
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Bot is in ${client.guilds.cache.size} servers`);
});

// Regular message command for testing
client.on(Events.MessageCreate, message => {
  if (message.author.bot) return;
  
  if (message.content === '!ping') {
    message.reply('Pong! Bot is working.');
  }
});

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ 
      content: 'There was an error executing this command!', 
      ephemeral: true 
    }).catch(console.error);
  }
});

// Log in to Discord
client.login(token)
  .catch(error => {
    console.error('Failed to log in:', error);
    if (error.code === 'TokenInvalid') {
      console.error('The provided token is invalid. Please check your .env file.');
    }
  });

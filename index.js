// index.js - Main entry point for the Sea of Thieves Companion Bot
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

// Import database and API server
const dbManager = require('./database');
const apiServer = require('./api-server');
const accessControl = require('./access-control');

// Import new utilities
const logger = require('./logger');
const runMigrations = require('./run-migrations');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Create collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

console.log('Starting Sea of Thieves Companion Bot...');

// Load command files
console.log('Loading commands...');
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  try {
    console.log(`Loading command file: ${file}`);
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('name' in command && 'execute' in command) {
      client.commands.set(command.name, command);
      console.log(`Registered command: ${command.name}`);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property.`);
    }
  } catch (error) {
    console.error(`Error loading command file ${file}:`, error);
  }
}

// Initialize database
console.log('Initializing database...');

// When the client is ready, run this code (only once)
console.log('Logging in to Discord...');
client.once(Events.ClientReady, async () => {
  try {
    console.log('Login successful!');
    
    // Initialize database
    await dbManager.init();
    console.log('Database initialized successfully');
    
    // Run database migrations
    try {
      await runMigrations();
      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Error running migrations:', error);
      // Continue bot startup even if migrations fail
      // DO NOT close the database connection here
    }
    
    // Initialize access control
    await accessControl.init();
    console.log('Access control tables initialized successfully');
    
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Bot is in ${client.guilds.cache.size} servers`);
    console.log('Bot is ready!');
    
    // Start API server
    apiServer.startApiServer();
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});

// Handle interactions (commands, buttons, modals)
client.on(Events.InteractionCreate, async interaction => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      const [commandName, action] = interaction.customId.split('_');
      const command = client.commands.get(commandName);
      
      if (!command) {
        console.error(`No command matching button ${interaction.customId} was found.`);
        return;
      }
      
      try {
        await command.execute(interaction, action);
      } catch (error) {
        console.error(`Error handling button ${interaction.customId}:`, error);
        const errorMessage = { content: 'There was an error processing this button!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      const [commandName, action] = interaction.customId.split('_');
      const command = client.commands.get(commandName);
      
      if (!command) {
        console.error(`No command matching modal ${interaction.customId} was found.`);
        return;
      }
      
      try {
        await command.handleModal(interaction, action);
      } catch (error) {
        console.error(`Error handling modal ${interaction.customId}:`, error);
        const errorMessage = { content: 'There was an error processing your input!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});

// Handle message commands (prefix commands)
const prefix = '!sotc';
client.on(Events.MessageCreate, async message => {
  try {
    // Ignore messages from bots and messages that don't start with the prefix
    if (message.author.bot || !message.content.startsWith(prefix)) return;
    
    // Parse command and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase() || 'menu';
    
    // Get the command
    const command = client.commands.get(commandName);
    if (!command) return;
    
    // Execute the command
    try {
      await command.execute(message, args.join(' '));
    } catch (error) {
      console.error(`Error executing message command ${commandName}:`, error);
      await message.reply('There was an error executing that command!');
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  console.log('Shutting down due to uncaught exception...');
  
  try {
    // Close logger
    logger.close();
    
    // Close database connections
    await dbManager.closeConnections();
    console.log('Database connections closed');
  } catch (shutdownError) {
    console.error('Error during shutdown:', shutdownError);
  }
  
  // Exit with error code
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT signal. Shutting down...');
  
  try {
    // Close logger
    logger.close();
    
    // Close database connections
    await dbManager.closeConnections();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  // Exit the process
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal. Shutting down...');
  
  try {
    // Close logger
    logger.close();
    
    // Close database connections
    await dbManager.closeConnections();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  // Exit the process
  process.exit(0);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

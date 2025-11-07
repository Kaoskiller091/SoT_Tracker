// deploy-commands.js
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

// Check environment variables
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token) {
  console.error('Error: DISCORD_TOKEN is missing in .env file');
  process.exit(1);
}

if (!clientId) {
  console.error('Error: CLIENT_ID is missing in .env file');
  process.exit(1);
}

console.log('Deploying slash commands...');

const commands = [];
// Grab all command files
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
  console.error(`Error: Commands directory not found at ${commandsPath}`);
  process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
console.log(`Found ${commandFiles.length} command files`);

if (commandFiles.length === 0) {
  console.error('Error: No command files found in commands directory');
  process.exit(1);
}

// Load commands
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    
    if (!command.data) {
      console.error(`Error: Command ${file} is missing 'data' property`);
      continue;
    }
    
    if (!command.execute) {
      console.error(`Error: Command ${file} is missing 'execute' property`);
      continue;
    }
    
    commands.push(command.data.toJSON());
    console.log(`Loaded command: ${command.data.name}`);
  } catch (error) {
    console.error(`Error loading command ${file}:`, error);
  }
}

if (commands.length === 0) {
  console.error('Error: No valid commands found to register');
  process.exit(1);
}

// Create REST instance
const rest = new REST({ version: '10' }).setToken(token);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    let data;
    
    if (guildId) {
      // Guild commands - instant update, recommended for testing
      console.log(`Registering commands to guild: ${guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log(`Successfully registered ${data.length} guild commands.`);
    } else {
      // Global commands - can take up to an hour to update
      console.log('Registering global commands (may take up to an hour to propagate)');
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log(`Successfully registered ${data.length} global commands.`);
    }
    
    // List registered commands
    console.log('\nRegistered Commands:');
    data.forEach(cmd => {
      console.log(`- /${cmd.name}: ${cmd.description}`);
    });
    
  } catch (error) {
    console.error('Error deploying commands:');
    if (error.rawError) {
      console.error(`Code: ${error.rawError.code}`);
      console.error(`Message: ${error.rawError.message}`);
      
      if (error.rawError.code === 50001) {
        console.error('\nERROR: Bot doesn\'t have access to this guild.');
        console.error('Make sure:');
        console.error('1. The GUILD_ID is correct');
        console.error('2. You\'ve invited the bot to this guild');
        console.error('3. The bot has the "applications.commands" scope');
      }
    } else {
      console.error(error);
    }
  }
})();

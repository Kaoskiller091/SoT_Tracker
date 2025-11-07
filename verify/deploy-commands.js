// deploy-commands.js
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Grab all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder.toJSON() output of each command
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`Added command: ${command.data.name}`);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // Get the client ID from the environment variables
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      console.error('CLIENT_ID is missing in .env file');
      return;
    }

    // Get the guild ID from the environment variables
    const guildId = process.env.GUILD_ID;
    
    let data;
    if (guildId) {
      // Register commands to a specific guild for faster testing
      console.log(`Registering commands to guild: ${guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
    } else {
      // Register commands globally
      console.log('Registering commands globally (may take up to an hour to propagate)');
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
    }

    console.log(`Successfully reloaded ${data.length} application

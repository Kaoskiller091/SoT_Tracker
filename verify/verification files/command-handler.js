// command-handler.js - Handles command execution with access control
const accessControl = require('./access-control');

class CommandHandler {
  constructor() {
    this.commands = new Map();
  }

  // Register a command
  registerCommand(name, options, executeFunction) {
    this.commands.set(name, {
      name,
      options,
      execute: executeFunction
    });
    console.log(`Registered command: ${name}`);
  }

  // Handle a command
  async handleCommand(interaction) {
    const commandName = interaction.commandName;
    const command = this.commands.get(commandName);
    
    if (!command) {
      console.log(`Command not found: ${commandName}`);
      return;
    }
    
    try {
      // Check if user can use this command
      const canUse = await accessControl.canUseCommand(
        interaction.user.id,
        interaction.guildId,
        commandName
      );
      
      if (!canUse) {
        await interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true
        });
        return;
      }
      
      // Execute the command
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      
      // Try to respond with an error message
      try {
        const content = 'There was an error executing this command!';
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, ephemeral: true });
        } else {
          await interaction.reply({ content, ephemeral: true });
        }
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }

  // Get all registered commands
  getCommands() {
    return Array.from(this.commands.values());
  }
}

module.exports = new CommandHandler();

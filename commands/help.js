// commands/help.js - Help command
const { EmbedBuilder } = require('discord.js');
const { createEmbed, LOGO_URL } = require('../utils/embed-utils');

module.exports = {
  name: 'help',
  description: 'Shows help information for bot commands',
  
  async execute(interaction) {
    try {
      // Get admin IDs from environment variables
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
      const isAdmin = adminIds.includes(interaction.user.id);
      
      // Create embed
      const embed = createEmbed(
        'Sea of Thieves Companion Help',
        'Here are the available commands for the Sea of Thieves Companion bot.'
      );
      
      // Add general commands
      embed.addFields(
        { name: 'General Commands', value: 'Commands available to all users' },
        { name: '/menu', value: 'Shows the main menu with all available options' },
        { name: '/gold', value: 'Track and update your gold' },
        { name: '/session', value: 'Start, end, and manage your gaming sessions' },
        { name: '/stats', value: 'View your statistics' },
        { name: '/leaderboard', value: 'View the server leaderboard' },
        { name: '/help', value: 'Shows this help message' }
      );
      
      // Add usage examples
      embed.addFields(
        { name: 'Usage Examples', value: 'How to use the bot effectively' },
        { name: 'Track your gold', value: 'Use `/gold` to view and update your current gold amount' },
        { name: 'Start a session', value: 'Use `/session` and click "Start Session" to begin tracking a gaming session' },
        { name: 'Record earnings', value: 'During an active session, use `/session` and click "Record Cash-in" to log your earnings' }
      );
      
      // Add admin commands section if user is an admin
      if (isAdmin) {
        embed.addFields(
          { name: '\u200B', value: '\u200B' }, // Empty field as spacer
          { name: 'Admin Commands', value: 'Commands available only to administrators' },
          { name: '/admin', value: 'Access administrative functions' },
          { name: '/shutdown', value: 'Gracefully shuts down the bot' }
        );
      }
      
      // Add footer with additional info
      embed.setFooter({ 
        text: 'For more help, contact the bot administrator or visit our website'
      });
      
      // Send the help message
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error in help command:', error);
      await interaction.reply({ 
        content: 'There was an error showing the help information.', 
        ephemeral: true 
      });
    }
  }
};

// commands/shutdown.js - Command to gracefully shut down the bot
const { EmbedBuilder } = require('discord.js');
const dbManager = require('../database');

module.exports = {
  name: 'shutdown',
  description: 'Gracefully shuts down the bot (Admin only)',
  
  async execute(interaction) {
    try {
      // Check if user is an admin
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
      
      if (!adminIds.includes(interaction.user.id)) {
        await interaction.reply({ 
          content: 'You do not have permission to use this command.', 
          ephemeral: true 
        });
        return;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Bot Shutdown')
        .setDescription('The bot is shutting down...')
        .addFields(
          { name: 'Initiated by', value: interaction.user.tag },
          { name: 'Time', value: new Date().toLocaleString() }
        )
        .setTimestamp();
      
      // Reply to the interaction
      await interaction.reply({ embeds: [embed] });
      
      console.log(`Bot shutdown initiated by ${interaction.user.tag} (${interaction.user.id})`);
      
      // Wait a moment for the reply to be sent
      setTimeout(async () => {
        try {
          // Close database connections
          console.log('Closing database connections...');
          await dbManager.closeConnections();
          console.log('Database connections closed');
          
          // Log shutdown
          console.log('Bot shutting down gracefully...');
          
          // Exit the process
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          await interaction.followUp({ 
            content: 'An error occurred during shutdown. Check the console for details.', 
            ephemeral: true 
          }).catch(console.error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error executing shutdown command:', error);
      await interaction.reply({ 
        content: 'There was an error executing the shutdown command.', 
        ephemeral: true 
      }).catch(console.error);
    }
  }
};

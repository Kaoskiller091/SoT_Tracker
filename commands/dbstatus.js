// commands/dbstatus.js
const { EmbedBuilder } = require('discord.js');
const dbManager = require('../database');
// List of admin user IDs
const ADMIN_IDS = [
  '134226800808034304', // Replace with your Discord user ID
  // Add other admin IDs here
];

module.exports = {
  name: 'dbstatus',
  description: 'Check database status (Admin only)',
  
  async execute(interaction, params) {
    try {
      // Check if user is an admin
      if (!ADMIN_IDS.includes(interaction.user.id)) {
        await interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true
        });
        return;
      }
      
      // Run a fresh health check
      await dbManager.healthCheck();
      
      // Get status
      const status = dbManager.getStatus();
      
      const embed = new EmbedBuilder()
        .setTitle('Database Status')
        .setColor(status.isConnected ? 0x00FF00 : 0xFF0000)
        .addFields(
          { name: 'Connection Status', value: status.isConnected ? '✅ Connected' : '❌ Disconnected', inline: true },
          { name: 'Queries Executed', value: status.stats.queriesExecuted.toString(), inline: true },
          { name: 'Errors Encountered', value: status.stats.errorsEncountered.toString(), inline: true },
          { name: 'Reconnections', value: status.stats.reconnections.toString(), inline: true }
        );
      
      if (status.stats.lastHealthCheck) {
        const healthCheck = status.stats.lastHealthCheck;
        embed.addFields({
          name: 'Last Health Check',
          value: `${healthCheck.status === 'healthy' ? '✅ Healthy' : '❌ Failed'}\nTime: ${healthCheck.timestamp.toLocaleString()}\n${healthCheck.responseTime ? `Response: ${healthCheck.responseTime}ms` : ''}`
        });
      }
      
      if (status.lastError) {
        embed.addFields({
          name: 'Last Error',
          value: `Code: ${status.lastError.code || 'N/A'}\nMessage: ${status.lastError.message}\nTime: ${status.lastError.timestamp.toLocaleString()}`
        });
      }
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error executing dbstatus command:', error);
      await interaction.reply({ 
        content: 'There was an error checking the database status.', 
        ephemeral: true 
      });
    }
  }
};

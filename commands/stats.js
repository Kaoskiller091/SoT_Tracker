// commands/stats.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const sessionModel = require('../session-model');
const goldModel = require('../gold-model');
const logger = require('../logger');
const { createEmbed, LOGO_URL } = require('../utils/embed-utils');

module.exports = {
  name: 'stats',
  description: 'View your Sea of Thieves statistics',
  
  async execute(interaction, params) {
    try {
      logger.debug(`Executing stats command with params: ${params}`);
      
      // If this is a button interaction
      if (interaction.isButton()) {
        const action = params || 'show';
        
        switch (action) {
          case 'show':
            await this.showStats(interaction);
            break;
          case 'gold':
            await this.showGoldStats(interaction);
            break;
          case 'sessions':
            await this.showSessionStats(interaction);
            break;
          default:
            await this.showStats(interaction);
            break;
        }
        return;
      }
      
      // If this is a slash command
      if (interaction.isChatInputCommand()) {
        // Check if there's a subcommand
        const subcommand = interaction.options?.getSubcommand(false);
        
        if (subcommand === 'gold') {
          await this.showGoldStats(interaction);
        } else if (subcommand === 'sessions') {
          await this.showSessionStats(interaction);
        } else {
          await this.showStats(interaction);
        }
        return;
      }
      
      // Default to showing stats menu
      await this.showStats(interaction);
    } catch (error) {
      logger.error('Error in stats command:', error);
      
      try {
        const errorMessage = { content: 'There was an error processing your request. Please try again.', ephemeral: true };
        
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        logger.error('Error sending error message:', replyError);
      }
    }
  },
  
  async showStats(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Get user's current gold
      let currentGold = 0;
      try {
        currentGold = await goldModel.getCurrentGold(userId);
      } catch (error) {
        logger.error('Error getting current gold:', error);
      }
      
      // Get user's session stats
      let sessionStats = {
        totalSessions: 0,
        completedSessions: 0,
        totalEarnings: 0,
        averageEarnings: 0,
        totalTime: 0,
        averageTime: 0
      };
      
      try {
        sessionStats = await sessionModel.getUserSessionStats(userId);
      } catch (error) {
        logger.error('Error getting session stats:', error);
      }
      
      // Create embed
      const embed = createEmbed(
        `${interaction.user.username}'s Statistics`,
        'Your Sea of Thieves statistics'
      )
      .addFields(
        { name: 'Current Gold', value: currentGold.toLocaleString(), inline: true },
        { name: 'Total Sessions', value: sessionStats.totalSessions.toString(), inline: true },
        { name: 'Completed Sessions', value: sessionStats.completedSessions.toString(), inline: true },
        { name: 'Total Earnings', value: sessionStats.totalEarnings.toLocaleString(), inline: true },
        { name: 'Average Earnings', value: sessionStats.averageEarnings.toLocaleString(), inline: true }
      );
      
      // Add average session time if available
      if (sessionStats.averageTime > 0) {
        const hours = Math.floor(sessionStats.averageTime / 3600);
        const minutes = Math.floor((sessionStats.averageTime % 3600) / 60);
        embed.addFields({ 
          name: 'Average Session Time', 
          value: `${hours}h ${minutes}m`, 
          inline: true 
        });
      }
      
      // Create buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('stats_gold')
            .setLabel('Gold Stats')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('stats_sessions')
            .setLabel('Session Stats')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send the message
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
    } catch (error) {
      logger.error('Error showing stats:', error);
      throw error;
    }
  },
  
  async showGoldStats(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Get gold history
      const history = await goldModel.getGoldHistory(userId, 10);
      
      if (history.length === 0) {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: 'You have no gold history yet.', ephemeral: true });
        } else {
          await interaction.reply({ content: 'You have no gold history yet.', ephemeral: true });
        }
        return;
      }
      
      // Calculate statistics
      const currentGold = history[0].gold_amount || history[0].amount;
      let netChange = 0;
      let percentChange = 0;
      
      if (history.length > 1) {
        const oldestRecord = history[history.length - 1];
        const oldestAmount = oldestRecord.gold_amount || oldestRecord.amount;
        netChange = currentGold - oldestAmount;
        if (oldestAmount > 0) {
          percentChange = ((netChange / oldestAmount) * 100).toFixed(1);
        }
      }
      
      // Create embed
      const embed = createEmbed(
        `${interaction.user.username}'s Gold Statistics`,
        'Your gold earning statistics'
      )
      .setColor('#ffd700')
      .addFields(
        { name: 'Current Gold', value: currentGold.toLocaleString(), inline: true },
        { name: 'Net Change', value: `${netChange >= 0 ? '+' : ''}${netChange.toLocaleString()} (${percentChange}%)`, inline: true },
        { name: 'Records Analyzed', value: history.length.toString(), inline: true }
      );
      
      // Create buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('gold_history')
            .setLabel('View History')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('stats_show')
            .setLabel('Back to Stats')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send the message
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
    } catch (error) {
      logger.error('Error showing gold stats:', error);
      throw error;
    }
  },
  
  async showSessionStats(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Get session stats
      const stats = await sessionModel.getUserSessionStats(userId);
      
      if (stats.totalSessions === 0) {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: 'You have no session history yet.', ephemeral: true });
        } else {
          await interaction.reply({ content: 'You have no session history yet.', ephemeral: true });
        }
        return;
      }
      
      // Format time values
      const totalHours = Math.floor(stats.totalTime / 3600);
      const totalMinutes = Math.floor((stats.totalTime % 3600) / 60);
      const avgHours = Math.floor(stats.averageTime / 3600);
      const avgMinutes = Math.floor((stats.averageTime % 3600) / 60);
      
      // Create embed
      const embed = createEmbed(
        `${interaction.user.username}'s Session Statistics`,
        'Your gaming session statistics'
      )
      .addFields(
        { name: 'Total Sessions', value: stats.totalSessions.toString(), inline: true },
        { name: 'Completed Sessions', value: stats.completedSessions.toString(), inline: true },
        { name: 'Total Earnings', value: stats.totalEarnings.toLocaleString(), inline: true },
        { name: 'Average Earnings', value: stats.averageEarnings.toLocaleString(), inline: true },
        { name: 'Total Time', value: `${totalHours}h ${totalMinutes}m`, inline: true },
        { name: 'Average Session', value: `${avgHours}h ${avgMinutes}m`, inline: true }
      );
      
      // Create buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('session_view')
            .setLabel('View Sessions')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('stats_show')
            .setLabel('Back to Stats')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send the message
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
    } catch (error) {
      logger.error('Error showing session stats:', error);
      throw error;
    }
  }
};

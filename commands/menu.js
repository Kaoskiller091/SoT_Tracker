// menu.js - Main menu command
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const accessControl = require('../access-control'); // Add this import

module.exports = {
  name: 'menu',
  description: 'Show the main menu',
  
  // Execute method that handles both slash commands and prefix commands
  async execute(interaction, args) {
    try {
      // Check if this is a message (prefix command) or an interaction (slash command)
      const isMessage = interaction.content !== undefined;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Sea of Thieves Companion')
        .setDescription('Choose an option below:')
        .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        .setTimestamp();
      
      // Create buttons
      const row1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('session_menu')
            .setLabel('Session Tracker')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('gold_menu')
            .setLabel('Gold Tracker')
            .setStyle(ButtonStyle.Success)
        );
      
      const row2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('leaderboard_show')
            .setLabel('Leaderboard')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('stats_show')
            .setLabel('Statistics')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Add Crew Manager button if feature is enabled
      if (accessControl.isFeatureEnabled('crew-tracking')) {
        const row3 = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('crew_menu')
              .setLabel('Crew Manager')
              .setStyle(ButtonStyle.Primary)
          );
        
        // Send the message with all three rows of buttons
        if (isMessage) {
          await interaction.reply({ 
            embeds: [embed], 
            components: [row1, row2, row3]
          });
        } else {
          await interaction.reply({ 
            embeds: [embed], 
            components: [row1, row2, row3], 
            ephemeral: true 
          });
        }
      } else {
        // Send the message with just the original two rows
        if (isMessage) {
          await interaction.reply({ 
            embeds: [embed], 
            components: [row1, row2]
          });
        } else {
          await interaction.reply({ 
            embeds: [embed], 
            components: [row1, row2], 
            ephemeral: true 
          });
        }
      }
    } catch (error) {
      console.error('Error showing menu:', error);
      
      // Handle errors differently based on interaction type
      if (interaction.content !== undefined) {
        await interaction.reply('There was an error showing the menu!');
      } else {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: 'There was an error showing the menu!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error showing the menu!', ephemeral: true });
        }
      }
    }
  }
};

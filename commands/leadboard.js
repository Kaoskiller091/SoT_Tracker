// commands/leaderboard.js - Leaderboard command (placeholder)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, LOGO_URL } = require('../utils/embed-utils');

module.exports = {
  name: 'leaderboard',
  description: 'View the leaderboard',
  
  async execute(interaction, params) {
    console.log(`Executing leaderboard command with params: ${params}`);
    
    const embed = createEmbed(
      'Sea of Thieves Leaderboard',
      'Leaderboards will be implemented in a separate chat!'
    )
    .setColor(0xF1C232)
    .addFields(
      { name: 'Coming Soon', value: 'This feature will be developed in the Statistics and Leaderboards chat.' }
    );
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};

// utils/embed-utils.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Logo URL - using raw GitHub URL (fixed to use raw URL)
const LOGO_URL = 'https://raw.githubusercontent.com/Kaoskiller091/Discord-Bot/3c89403106556f8cb8697caf67cf41e41bd1252a/SoT_GT-Logo.png';

/**
 * Creates a standard embed with the bot logo
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {string} color - The embed color (hex code)
 * @returns {EmbedBuilder} The configured embed
 */
function createEmbed(title, description, color = '#0099ff') {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setThumbnail(LOGO_URL)
    .setTimestamp();
}

/**
 * Creates a styled menu with the given options
 * @param {string} title - The menu title
 * @param {string} description - The menu description
 * @param {Array} options - Array of {label, customId, style, emoji} objects
 * @returns {Object} Object containing embed and components
 */
function createMenu(title, description, options) {
  const embed = createEmbed(title, description)
    .setTitle('Sea of Thieves Companion')
    .setDescription('Choose an option below:');
  
  // Create button rows (max 5 buttons per row)
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let buttonCount = 0;
  
  for (const option of options) {
    // Create a new row after every 2 buttons for better spacing
    if (buttonCount > 0 && buttonCount % 2 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    
    const button = new ButtonBuilder()
      .setCustomId(option.customId)
      .setLabel(option.label)
      .setStyle(option.style || ButtonStyle.Primary);
    
    if (option.emoji) {
      button.setEmoji(option.emoji);
    }
    
    currentRow.addComponents(button);
    buttonCount++;
  }
  
  // Add the last row if it has any buttons
  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }
  
  return {
    embed: embed,
    components: rows
  };
}

module.exports = { 
  createEmbed, 
  createMenu, 
  LOGO_URL,
  COLORS: {
    PRIMARY: '#0099ff',
    SUCCESS: '#00cc44',
    DANGER: '#ff3333',
    WARNING: '#ffaa00',
    INFO: '#8855ff',
    SECONDARY: '#555555'
  }
};

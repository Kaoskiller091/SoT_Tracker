// gold.js - Gold tracking command
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const goldModel = require('../gold-model');
const userModel = require('../user-model');
const { createEmbed, LOGO_URL } = require('../utils/embed-utils');

module.exports = {
  name: 'gold',
  description: 'Track your gold',
  
  // Main command execution
  async execute(interaction, params) {
    try {
      console.log(`Gold command executed with params: ${params}`);
      
      // Check if this is a message (prefix command)
      if (interaction.content !== undefined) {
        console.log('Handling prefix command for gold');
        // For prefix commands, just show the gold menu
        await this.showGoldMenuForMessage(interaction);
        return;
      }
      
      // If this is a button interaction
      if (interaction.isButton()) {
        const action = params || 'menu';
        console.log(`Gold button action: ${action}`);
        
        switch (action) {
          case 'update':
            await this.showUpdateGoldModal(interaction);
            break;
          case 'history':
            await this.showGoldHistory(interaction);
            break;
          case 'menu':
          default:
            await this.showGoldMenu(interaction);
            break;
        }
      } else {
        // If this is a regular slash command
        await this.showGoldMenu(interaction);
      }
    } catch (error) {
      console.error('Error in gold command:', error);
      const errorMessage = 'There was an error processing the gold command.';
      
      if (interaction.content !== undefined) {
        // For message-based commands
        await interaction.reply(errorMessage);
      } else {
        // For interaction-based commands
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(console.error);
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
        }
      }
    }
  },
  
  // Handle modal submissions
  async handleModal(interaction, params) {
    try {
      const action = params || '';
      console.log(`Handling gold modal: ${action}`);
      
      switch (action) {
        case 'update':
          await this.handleUpdateGold(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown action', ephemeral: true });
          break;
      }
    } catch (error) {
      console.error('Error handling gold modal:', error);
      await interaction.reply({ content: 'There was an error processing your input.', ephemeral: true }).catch(console.error);
    }
  },
  
  // Show the main gold menu for message-based commands
  async showGoldMenuForMessage(message) {
    try {
      console.log('Showing gold menu for message command');
      
      // Get user's Discord ID
      const userId = message.author.id;
      
      // Create or update user in database
      await userModel.createOrUpdateUser(userId, message.author.username);
      
      // Get user's current gold
      const currentGold = await goldModel.getCurrentGold(userId);
      
      // Create embed
      const embed = createEmbed(
        'Sea of Thieves Gold Tracker',
        'Track your gold earnings in Sea of Thieves'
      )
      .setColor('#ffd700')
      .addFields(
        { name: 'Current Gold', value: currentGold.toString() }
      );
      
      // Create buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gold_update')
          .setLabel('Update Gold')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('gold_history')
          .setLabel('View History')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send the message with buttons
      await message.reply({ 
        embeds: [embed], 
        components: [row]
      });
      
      console.log('Gold menu for message sent successfully');
    } catch (error) {
      console.error('Error showing gold menu for message:', error);
      await message.reply('There was an error showing the gold menu!');
    }
  },
  
  // Show the main gold menu for interaction-based commands
  async showGoldMenu(interaction) {
    try {
      console.log('Showing gold menu');
      
      // Get user's Discord ID
      const userId = interaction.user.id;
      console.log(`User ID: ${userId}`);
      
      // Create or update user in database
      await userModel.createOrUpdateUser(userId, interaction.user.username);
      
      // Get user's current gold
      const currentGold = await goldModel.getCurrentGold(userId);
      console.log(`Current gold: ${currentGold}`);
      
      // Create embed
      const embed = createEmbed(
        'Sea of Thieves Gold Tracker',
        'Track your gold earnings in Sea of Thieves'
      )
      .setColor('#ffd700')
      .addFields(
        { name: 'Current Gold', value: currentGold.toString() }
      );
      
      // Create buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gold_update')
          .setLabel('Update Gold')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('gold_history')
          .setLabel('View History')
          .setStyle(ButtonStyle.Secondary)
      );
      
      console.log('Prepared buttons:', row);
      
      // Send the message
      if (interaction.deferred || interaction.replied) {
        console.log('Following up with gold menu');
        await interaction.followUp({ 
          embeds: [embed], 
          components: [row], 
          ephemeral: true 
        });
      } else {
        console.log('Replying with gold menu');
        await interaction.reply({ 
          embeds: [embed], 
          components: [row], 
          ephemeral: true 
        });
      }
      
      console.log('Gold menu sent successfully');
    } catch (error) {
      console.error('Error showing gold menu:', error);
      throw error;
    }
  },
  
  // Show modal to update gold
  async showUpdateGoldModal(interaction) {
    try {
      console.log('Showing update gold modal');
      
      // Get user's current gold
      const userId = interaction.user.id;
      let currentGold = 0;
      
      try {
        currentGold = await goldModel.getCurrentGold(userId);
        console.log(`Current gold: ${currentGold}`);
      } catch (error) {
        console.error('Error getting current gold, using 0 as default:', error);
        // Continue with default value of 0
      }
      
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId('gold_update')
        .setTitle('Update Gold');
      
      // Add inputs
      const goldInput = new TextInputBuilder()
        .setCustomId('gold')
        .setLabel('Current Gold')
        .setStyle(TextInputStyle.Short)
        .setValue(currentGold.toString())
        .setPlaceholder('Enter your current gold amount')
        .setRequired(true);
      
      // Add inputs to modal
      const firstRow = new ActionRowBuilder().addComponents(goldInput);
      modal.addComponents(firstRow);
      
      // Show the modal
      await interaction.showModal(modal);
      console.log('Update gold modal shown');
    } catch (error) {
      console.error('Error showing update gold modal:', error);
      await interaction.reply({ 
        content: 'There was an error showing the gold update form. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Show gold history
  async showGoldHistory(interaction) {
    try {
      console.log('Showing gold history');
      
      const userId = interaction.user.id;
      
      // Get user's gold history
      const history = await goldModel.getGoldHistory(userId, 10);
      console.log(`Retrieved ${history.length} history entries`);
      
      // Create embed
      const embed = createEmbed(
        'Your Gold History',
        'Your recent gold updates'
      )
      .setColor('#ffd700');
      
      // Add history entries
      if (history.length > 0) {
        for (const entry of history) {
          // Format the date properly
          let timestampStr = 'Unknown Date';
          try {
            if (entry.timestamp) {
              const timestamp = new Date(entry.timestamp);
              if (!isNaN(timestamp.getTime())) {
                timestampStr = timestamp.toLocaleString();
              }
            }
          } catch (err) {
            console.error('Error formatting date:', err);
          }
          
          embed.addFields({
            name: `${entry.amount} gold`,
            value: `Updated on ${timestampStr}`
          });
        }
      } else {
        embed.addFields({ name: 'No History Found', value: 'Update your gold to begin tracking' });
      }
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gold_menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send the message
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      console.log('Gold history sent successfully');
    } catch (error) {
      console.error('Error showing gold history:', error);
      await interaction.reply({ 
        content: 'There was an error showing your gold history. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Handle update gold form submission
  async handleUpdateGold(interaction) {
    try {
      console.log('Handling update gold submission');
      
      const userId = interaction.user.id;
      
      // Get form values
      const goldStr = interaction.fields.getTextInputValue('gold');
      const gold = parseInt(goldStr);
      
      console.log(`Updating gold to: ${gold}`);
      
      if (isNaN(gold)) {
        await interaction.reply({ content: 'Please enter a valid number for gold.', ephemeral: true });
        return;
      }
      
      // Update user's gold
      await goldModel.updateGold(userId, gold);
      
      // Create response embed
      const embed = createEmbed(
        'Gold Updated',
        `Your gold has been updated to ${gold}!`
      )
      .setColor('#00ff00');
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gold_menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send response
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      console.log('Gold update response sent successfully');
    } catch (error) {
      console.error('Error handling update gold:', error);
      await interaction.reply({ content: 'There was an error updating your gold.', ephemeral: true });
    }
  }
};

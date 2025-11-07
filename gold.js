// commands/gold.js - Gold tracking command
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const goldModel = require('../gold-model');
const userModel = require('../user-model');

module.exports = {
  name: 'gold',
  description: 'Track your gold',
  
  async execute(interaction, params) {
    try {
      console.log(`Executing gold command with params: ${params}`);
      
      // Handle different subcommands based on params
      if (params === 'track') {
        await this.showGoldInputModal(interaction);
      } else if (params && params.startsWith('confirm_')) {
        const goldAmount = params.replace('confirm_', '');
        await this.confirmGoldUpdate(interaction, goldAmount);
      } else if (params === 'history') {
        await this.showGoldHistory(interaction);
      } else if (params === 'leaderboard') {
        await this.showLeaderboard(interaction);
      } else if (params === 'diagnose') {
        await this.diagnoseHistory(interaction);
      } else {
        // Default action - show gold menu
        await this.showGoldMenu(interaction);
      }
    } catch (error) {
      console.error('Error in gold command:', error);
      try {
        const errorMessage = { content: 'There was an error processing your request. Please try again.', ephemeral: true };
        
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  },
  
  async handleModal(interaction, params) {
    try {
      console.log(`Handling gold modal with params: ${params}`);
      
      if (params === 'input') {
        const goldAmount = interaction.fields.getTextInputValue('goldAmount');
        await this.processGoldInput(interaction, goldAmount);
      }
    } catch (error) {
      console.error('Error handling gold modal:', error);
      await interaction.reply({ 
        content: 'There was an error processing your input. Please try again.', 
        ephemeral: true 
      }).catch(console.error);
    }
  },
  
  async showGoldMenu(interaction) {
    try {
      // Get user's Discord ID
      const discordId = interaction.user.id;
      
      // Create or update user in database
      await userModel.createOrUpdateUser(discordId, interaction.user.username);
      
      // Get user's current gold
      const currentGold = await goldModel.getCurrentGold(discordId);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0xF1C232)
        .setTitle('Sea of Thieves Gold Tracker')
        .setDescription('Track your gold earnings in Sea of Thieves')
        .addFields(
          { name: 'Current Gold', value: currentGold.toLocaleString() }
        )
        .setTimestamp();
      
      // Create buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gold_track')
          .setLabel('Update Gold')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('gold_history')
          .setLabel('View History')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('gold_leaderboard')
          .setLabel('Leaderboard')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send the message
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error showing gold menu:', error);
      throw error;
    }
  },
  
  async showGoldInputModal(interaction) {
    try {
      // Get current gold amount
      const discordId = interaction.user.id;
      const currentGold = await goldModel.getCurrentGold(discordId);
      
      const modal = new ModalBuilder()
        .setCustomId('gold_input')
        .setTitle('Update Your Gold');
      
      const goldInput = new TextInputBuilder()
        .setCustomId('goldAmount')
        .setLabel('How much gold do you currently have?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter amount (numbers only)')
        .setValue(currentGold.toString())
        .setRequired(true);
      
      const firstActionRow = new ActionRowBuilder().addComponents(goldInput);
      modal.addComponents(firstActionRow);
      
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing gold input modal:', error);
      await interaction.reply({ 
        content: 'There was an error processing your request. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  async processGoldInput(interaction, goldAmount) {
    try {
      // Validate input is a number
      const gold = parseInt(goldAmount.replace(/,/g, ''));
      
      if (isNaN(gold)) {
        await interaction.reply({ 
          content: 'Please enter a valid number for your gold amount.', 
          ephemeral: true 
        });
        return;
      }
      
      // Get user info and ensure they exist in the database
      const discordId = interaction.user.id;
      const username = interaction.user.username;
      await userModel.createOrUpdateUser(discordId, username);
      
      // Get previous gold amount from database
      const previousGold = await goldModel.getCurrentGold(discordId);
      
      // Create confirmation message
      const embed = new EmbedBuilder()
        .setColor(0xF1C232)
        .setTitle('Confirm Gold Update')
        .setDescription(`You're about to update your gold to **${gold.toLocaleString()}**`)
        .addFields(
          { name: 'Previous Amount', value: previousGold.toLocaleString() },
          { name: 'New Amount', value: gold.toLocaleString() },
          { name: 'Difference', value: (gold - previousGold).toLocaleString() }
        );
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`gold_confirm_${gold}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error processing gold input:', error);
      await interaction.reply({ 
        content: 'There was an error processing your request. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  async confirmGoldUpdate(interaction, goldAmount) {
    try {
      const gold = parseInt(goldAmount);
      const discordId = interaction.user.id;
      
      // Update gold in database
      await goldModel.updateGold(discordId, gold);
      
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Gold Updated!')
        .setDescription(`Your gold has been updated to **${gold.toLocaleString()}**`)
        .setFooter({ text: 'Sea of Thieves Companion' });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('gold_history')
            .setLabel('View History')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.update({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error confirming gold update:', error);
      await interaction.reply({ 
        content: 'There was an error updating your gold. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  async showGoldHistory(interaction) {
    try {
      const discordId = interaction.user.id;
      
      console.log(`Retrieving gold history for user ${discordId}`);
      
      // Get gold history from database with error handling
      let history = [];
      try {
        history = await goldModel.getGoldHistory(discordId, 10);
        console.log(`Retrieved ${history.length} history entries`);
        
        // Log the first entry to debug field names
        if (history.length > 0) {
          console.log('First history entry:', JSON.stringify(history[0]));
        }
      } catch (historyError) {
        console.error('Error retrieving gold history:', historyError);
        await interaction.reply({ 
          content: 'There was an error retrieving your gold history. Please try again.', 
          ephemeral: true 
        });
        return;
      }
      
      if (history.length === 0) {
        await interaction.reply({ 
          content: 'You have no gold history yet. Update your gold to start tracking!', 
          ephemeral: true 
        });
        return;
      }
      
      // Calculate statistics with safe field access
      const currentGold = history[0].gold_amount;
      let netChange = 0;
      let percentChange = 0;
      
      if (history.length > 1) {
        const oldestRecord = history[history.length - 1];
        netChange = currentGold - oldestRecord.gold_amount;
        if (oldestRecord.gold_amount > 0) {
          percentChange = ((netChange / oldestRecord.gold_amount) * 100).toFixed(1);
        }
      }
      
      // Find biggest gain and loss
      let biggestGain = 0;
      let biggestLoss = 0;
      
      for (const entry of history) {
        if (entry.change_amount > biggestGain) {
          biggestGain = entry.change_amount;
        }
        if (entry.change_amount < biggestLoss) {
          biggestLoss = entry.change_amount;
        }
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xF1C232)
        .setTitle(`${interaction.user.username}'s Gold History`)
        .setDescription('Your recent gold updates:')
        .addFields(
          { name: 'Current Gold', value: currentGold.toLocaleString(), inline: true },
          { name: 'Net Change', value: `${netChange >= 0 ? '+' : ''}${netChange.toLocaleString()} (${percentChange}%)`, inline: true },
          { name: 'Records Shown', value: history.length.toString(), inline: true }
        );
      
      if (biggestGain > 0) {
        embed.addFields({ name: 'Biggest Gain', value: biggestGain.toLocaleString(), inline: true });
      }
      
      if (biggestLoss < 0) {
        embed.addFields({ name: 'Biggest Loss', value: biggestLoss.toLocaleString(), inline: true });
      }
      
      // Add history entries with safe field access
      history.forEach((entry, index) => {
        // Format date safely
        let dateStr = 'Unknown Date';
        try {
          if (entry.timestamp) {
            const date = new Date(entry.timestamp);
            if (!isNaN(date.getTime())) {
              dateStr = date.toLocaleString();
            }
          }
        } catch (err) {
          console.error('Error formatting date:', err);
        }
        
        // Format change text
        const changeText = entry.change_amount >= 0 ? 
          `+${entry.change_amount.toLocaleString()}` : 
          entry.change_amount.toLocaleString();
        
        embed.addFields({
          name: `${index + 1}. ${dateStr}`,
          value: `Amount: ${entry.gold_amount.toLocaleString()} (${changeText})`
        });
      });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      console.log('Gold history displayed successfully');
    } catch (error) {
      console.error('Error showing gold history:', error);
      await interaction.reply({ 
        content: 'There was an error retrieving your gold history. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  async showLeaderboard(interaction) {
    try {
      // Get leaderboard from database
      const leaderboard = await goldModel.getLeaderboard(10);
      
      if (!leaderboard || leaderboard.length === 0) {
        await interaction.reply({ 
          content: 'No gold data available for the leaderboard yet.', 
          ephemeral: true 
        });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xF1C232)
        .setTitle('Gold Leaderboard')
        .setDescription('Top pirates by current gold:');
      
      // Add medals for top 3
      const medals = ['🥇', '🥈', '🥉'];
      
      leaderboard.forEach((entry, index) => {
        const prefix = index < 3 ? medals[index] : `${index + 1}.`;
        
        embed.addFields({
          name: `${prefix} ${entry.username || 'Unknown User'}`,
          value: `${entry.current_gold.toLocaleString()} gold`
        });
      });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error showing leaderboard:', error);
      await interaction.reply({ 
        content: 'There was an error retrieving the leaderboard. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  async diagnoseHistory(interaction) {
    try {
      const discordId = interaction.user.id;
      await interaction.deferReply({ ephemeral: true });
      
      const diagnosis = await goldModel.diagnoseGoldHistory(discordId);
      console.log('Gold history diagnosis:', diagnosis);
      
      let responseText = '**Gold History Diagnosis**\n\n';
      
      if (diagnosis.error) {
        responseText += `Error: ${diagnosis.error}\n`;
      } else {
        responseText += `Table exists: ${diagnosis.tableExists}\n`;
        if (diagnosis.columns) {
          const columnNames = diagnosis.columns.map(c => 
            c.column_name || c.COLUMN_NAME
          ).join(', ');
          responseText += `Columns: ${columnNames}\n`;
        }
        if (diagnosis.sampleData && diagnosis.sampleData.length > 0) {
          responseText += `Sample data: ${JSON.stringify(diagnosis.sampleData[0])}\n`;
        } else {
          responseText += `No sample data found for your user.\n`;
        }
      }
      
      await interaction.editReply({ content: responseText });
    } catch (error) {
      console.error('Error diagnosing history:', error);
      await interaction.editReply({ content: 'Error running diagnosis.' });
    }
  }
};

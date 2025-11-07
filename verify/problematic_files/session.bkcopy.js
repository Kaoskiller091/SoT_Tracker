// Debug helper
const debug = (...args) => {
  console.log('[DEBUG]', ...args);
  // Also write to a file for persistent logging
  const fs = require('fs');
  fs.appendFileSync('debug.log', `[${new Date().toISOString()}] ${args.join(' ')}\n`);
};

// commands/session.js - Session tracking command
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const sessionModel = require('../session-model');
const goldModel = require('../gold-model');
const userModel = require('../user-model');

module.exports = {
  name: 'session',
  description: 'Track your gaming sessions',
  
  async execute(interaction, params) {
    console.log(`Executing session command with params: ${params}`);
    
    // Handle different subcommands based on params
    if (params === 'menu' || params === '') {
      await this.showSessionMenu(interaction);
    } else if (params === 'start') {
      await this.showStartSessionModal(interaction);
    } else if (params.startsWith('start_confirm')) {
      // Extract the session name and gold amount correctly
      // The format is "start_confirm_sessionName_goldAmount"
      const parts = params.split('_');
      // The session name might contain underscores, so we need to handle that
      const startingGold = parts.pop(); // Get the last part (gold amount)
      const sessionName = parts.slice(2).join('_'); // Join everything after "start_confirm"
      
      console.log(`Parsed session name: "${sessionName}", starting gold: ${startingGold}`);
      
      // Ensure gold amount is a valid number
      const goldAmount = parseInt(startingGold);
      if (isNaN(goldAmount)) {
        await interaction.reply({
          content: 'Invalid gold amount. Please enter a valid number.',
          ephemeral: true
        });
        return;
      }
      
      await this.startSession(interaction, sessionName, goldAmount);
    } else if (params === 'end') {
      await this.showEndSessionModal(interaction);
    } else if (params.startsWith('end_confirm')) {
      const [_, sessionId, endingGold] = params.split('_');
      await this.endSession(interaction, parseInt(sessionId), parseInt(endingGold));
    } else if (params === 'cashin') {
      await this.showCashInModal(interaction);
    } else if (params.startsWith('cashin_confirm')) {
      console.log(`Processing cash-in confirmation with params: ${params}`);
      const parts = params.split('_');
      
      // Make sure we have enough parts
      if (parts.length < 4) {
        await interaction.reply({
          content: 'Invalid cash-in parameters. Please try again.',
          ephemeral: true
        });
        return;
      }
      
      const amount = parseInt(parts.pop()); // Get the last part (amount)
      const sessionId = parseInt(parts[2]); // Get the third part (session ID)
      
      console.log(`Parsed cash-in: Session ID: ${sessionId}, Amount: ${amount}`);
      
      if (isNaN(sessionId) || sessionId <= 0) {
        await interaction.reply({
          content: 'Invalid session ID. Please try again.',
          ephemeral: true
        });
        return;
      }
      
      await this.addCashIn(interaction, sessionId, amount);
    } else if (params === 'history') {
      await this.showSessionHistory(interaction);
    } else if (params.startsWith('view_')) {
      const sessionId = params.replace('view_', '');
      await this.viewSessionDetails(interaction, parseInt(sessionId));
    }
  },
  
  async handleModal(interaction, params) {
    console.log(`Handling session modal with params: ${params}`);
    
    if (params === 'start') {
      const sessionName = interaction.fields.getTextInputValue('sessionName');
      const startingGoldInput = interaction.fields.getTextInputValue('startingGold');
      
      // Validate starting gold
      const gold = parseInt(startingGoldInput.replace(/,/g, ''));
      if (isNaN(gold) || gold < 0) {
        await interaction.reply({
          content: 'Please enter a valid number for your starting gold.',
          ephemeral: true
        });
        return;
      }
      
      console.log(`Parsed gold amount: ${gold}`);
      
      // Show confirmation
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Confirm Session Start')
        .setDescription(`You're about to start a new session: **${sessionName}**`)
        .addFields(
          { name: 'Starting Gold', value: gold.toLocaleString() }
        );
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`session_start_confirm_${sessionName}_${gold}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
    else if (params === 'end') {
      const endingGold = interaction.fields.getTextInputValue('endingGold');
      const notes = interaction.fields.getTextInputValue('notes') || '';
      
      // Validate ending gold
      const gold = parseInt(endingGold.replace(/,/g, ''));
      if (isNaN(gold)) {
        await interaction.reply({
          content: 'Please enter a valid number for your ending gold.',
          ephemeral: true
        });
        return;
      }
      
      // Get active session
      const discordId = interaction.user.id;
      const activeSession = await sessionModel.getActiveSession(discordId);
      
      if (!activeSession) {
        await interaction.reply({
          content: 'You don\'t have an active session to end.',
          ephemeral: true
        });
        return;
      }
      
      // Calculate earnings
      const earnings = gold - activeSession.starting_gold;
      
      // Show confirmation
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Confirm Session End')
        .setDescription(`You're about to end your session: **${activeSession.session_name}**`)
        .addFields(
          { name: 'Starting Gold', value: activeSession.starting_gold.toLocaleString(), inline: true },
          { name: 'Ending Gold', value: gold.toLocaleString(), inline: true },
          { name: 'Earnings', value: earnings.toLocaleString(), inline: true }
        );
      
      if (notes) {
        embed.addFields({ name: 'Notes', value: notes });
      }
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`session_end_confirm_${activeSession.id}_${gold}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
    else if (params === 'cashin') {
      const amount = interaction.fields.getTextInputValue('amount');
      const notes = interaction.fields.getTextInputValue('notes') || '';
      
      // Validate amount
      const cashInAmount = parseInt(amount.replace(/,/g, ''));
      if (isNaN(cashInAmount)) {
        await interaction.reply({
          content: 'Please enter a valid number for the cash-in amount.',
          ephemeral: true
        });
        return;
      }
      
      // Get active session
      const discordId = interaction.user.id;
      const activeSession = await sessionModel.getActiveSession(discordId);
      
      if (!activeSession) {
        await interaction.reply({
          content: 'You don\'t have an active session for cash-in.',
          ephemeral: true
        });
        return;
      }
      
      console.log(`Active session found: ${activeSession.id} (${typeof activeSession.id})`);
      
      // Show confirmation
      const embed = new EmbedBuilder()
        .setColor(0xF1C232)
        .setTitle('Confirm Cash-In')
        .setDescription(`You're about to record a cash-in for your session: **${activeSession.session_name}**`)
        .addFields(
          { name: 'Amount', value: cashInAmount.toLocaleString() }
        );
      
      if (notes) {
        embed.addFields({ name: 'Notes', value: notes });
      }
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`session_cashin_confirm_${activeSession.id}_${cashInAmount}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
  },
  
  async showSessionMenu(interaction) {
    try {
      // Get user info
      const discordId = interaction.user.id;
      const username = interaction.user.username;
      await userModel.createOrUpdateUser(discordId, username);
      
      // Check if user has an active session
      const activeSession = await sessionModel.getActiveSession(discordId);
      
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Session Tracking')
        .setDescription('Track your Sea of Thieves gaming sessions to monitor your earnings over time.');
      
      let row;
      
      if (activeSession) {
        // User has an active session
        const startTime = new Date(activeSession.start_time).toLocaleString();
        const currentGold = await goldModel.getCurrentGold(discordId);
        const earnings = currentGold - activeSession.starting_gold;
        
        embed.addFields(
          { name: 'Active Session', value: activeSession.session_name, inline: true },
          { name: 'Started', value: startTime, inline: true },
          { name: 'Starting Gold', value: activeSession.starting_gold.toLocaleString(), inline: true },
          { name: 'Current Gold', value: currentGold.toLocaleString(), inline: true },
          { name: 'Current Earnings', value: earnings.toLocaleString(), inline: true }
        );
        
        row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('session_cashin')
              .setLabel('Record Cash-In')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('💰'),
            new ButtonBuilder()
              .setCustomId('session_end')
              .setLabel('End Session')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🏁'),
            new ButtonBuilder()
              .setCustomId('session_history')
              .setLabel('Session History')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('📊'),
            new ButtonBuilder()
              .setCustomId('menu')
              .setLabel('Back to Menu')
              .setStyle(ButtonStyle.Secondary)
          );
      } else {
        // No active session
        embed.addFields(
          { name: 'No Active Session', value: 'You don\'t have an active session. Start a new one to track your earnings!' }
        );
        
        row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('session_start')
              .setLabel('Start New Session')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🏴‍☠️'),
            new ButtonBuilder()
              .setCustomId('session_history')
              .setLabel('Session History')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('📊'),
            new ButtonBuilder()
              .setCustomId('menu')
              .setLabel('Back to Menu')
              .setStyle(ButtonStyle.Secondary)
          );
      }
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error showing session menu:', error);
      await interaction.reply({
        content: 'There was an error showing the session menu. Please try again.',
        ephemeral: true
      });
    }
  },
  
  async showStartSessionModal(interaction) {
    try {
      // Check if user already has an active session
      const discordId = interaction.user.id;
      const activeSession = await sessionModel.getActiveSession(discordId);
      
      if (activeSession) {
        await interaction.reply({
          content: `You already have an active session: "${activeSession.session_name}". Please end it before starting a new one.`,
          ephemeral: true
        });
        return;
      }
      
      // Get current gold
      const currentGold = await goldModel.getCurrentGold(discordId);
      
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId('session_start')
        .setTitle('Start New Session');
      
      const sessionNameInput = new TextInputBuilder()
        .setCustomId('sessionName')
        .setLabel('Session Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Friday Night Voyage')
        .setRequired(true);
      
      const startingGoldInput = new TextInputBuilder()
        .setCustomId('startingGold')
        .setLabel('Starting Gold')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your current gold amount')
        .setValue(currentGold.toString())
        .setRequired(true);
      
      const firstRow = new ActionRowBuilder().addComponents(sessionNameInput);
      const secondRow = new ActionRowBuilder().addComponents(startingGoldInput);
      
      modal.addComponents(firstRow, secondRow);
      
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing start session modal:', error);
      await interaction.reply({
        content: 'There was an error starting a new session. Please try again.',
        ephemeral: true
      });
    }
  },
  
  async startSession(interaction, sessionName, startingGold) {
    try {
      console.log(`Starting session with name: ${sessionName}, starting gold: ${startingGold}, type: ${typeof startingGold}`);
      
      // Ensure startingGold is a valid number
      const goldAmount = parseInt(startingGold);
      if (isNaN(goldAmount)) {
        await interaction.reply({
          content: 'Invalid gold amount. Please enter a valid number.',
          ephemeral: true
        });
        return;
      }
      
      const discordId = interaction.user.id;
      const username = interaction.user.username;
      
      // Create or update user
      await userModel.createOrUpdateUser(discordId, username);
      
      // Start session with validated gold amount
      const session = await sessionModel.startSession(discordId, sessionName, goldAmount);
      
      // Update gold
      await goldModel.updateGold(discordId, goldAmount);
      
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Session Started!')
        .setDescription(`**${sessionName}**`)
        .addFields(
          { name: 'Starting Gold', value: goldAmount.toLocaleString(), inline: true },
          { name: 'Started At', value: new Date().toLocaleString(), inline: true }
        )
        .setFooter({ text: 'Use the buttons below to manage your session' });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('session_cashin')
            .setLabel('Record Cash-In')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💰'),
          new ButtonBuilder()
            .setCustomId('session_end')
            .setLabel('End Session')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🏁'),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.update({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error starting session:', error);
      await interaction.reply({
        content: `Error starting session: ${error.message}`,
        ephemeral: true
      });
    }
  },
  
  async showEndSessionModal(interaction) {
    try {
      // Check if user has an active session
      const discordId = interaction.user.id;
      const activeSession = await sessionModel.getActiveSession(discordId);
      
      if (!activeSession) {
        await interaction.reply({
          content: 'You don\'t have an active session to end.',
          ephemeral: true
        });
        return;
      }
      
      // Get current gold
      const currentGold = await goldModel.getCurrentGold(discordId);
      
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId('session_end')
        .setTitle('End Session');
      
      const endingGoldInput = new TextInputBuilder()
        .setCustomId('endingGold')
        .setLabel('Ending Gold')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your current gold amount')
        .setValue(currentGold.toString())
        .setRequired(true);
      
      const notesInput = new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Session Notes (Optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Add any notes about this session')
        .setRequired(false);
      
      const firstRow = new ActionRowBuilder().addComponents(endingGoldInput);
      const secondRow = new ActionRowBuilder().addComponents(notesInput);
      
      modal.addComponents(firstRow, secondRow);
      
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing end session modal:', error);
      await interaction.reply({
        content: 'There was an error ending your session. Please try again.',
        ephemeral: true
      });
    }
  },
  
  async endSession(interaction, sessionId, endingGold) {
    try {
      const discordId = interaction.user.id;
      
      // End session
      const session = await sessionModel.endSession(sessionId, endingGold);
      
      // Update gold
      await goldModel.updateGold(discordId, endingGold);
      
      // Get cash-ins
      const cashIns = await sessionModel.getSessionCashIns(sessionId);
      
      // Calculate session duration
      const startTime = new Date(session.start_time);
      const endTime = new Date();
      const durationMs = endTime - startTime;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Session Complete!')
        .setDescription(`**${session.session_name}**`)
        .addFields(
          { name: 'Duration', value: `${hours}h ${minutes}m`, inline: true },
          { name: 'Starting Gold', value: session.starting_gold.toLocaleString(), inline: true },
          { name: 'Ending Gold', value: endingGold.toLocaleString(), inline: true },
          { name: 'Gold Earned', value: (endingGold - session.starting_gold).toLocaleString(), inline: true },
          { name: 'Cash-ins', value: cashIns.length.toString(), inline: true }
        );
      
      if (session.notes) {
        embed.addFields({ name: 'Session Notes', value: session.notes });
      }
      
      if (cashIns.length > 0) {
        let cashInText = '';
        cashIns.forEach((cashIn, index) => {
          cashInText += `${index + 1}. ${cashIn.amount.toLocaleString()} gold`;
          if (cashIn.notes) {
            cashInText += ` - ${cashIn.notes}`;
          }
          cashInText += '\n';
        });
        embed.addFields({ name: 'Cash-in Details', value: cashInText });
      }
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('session_history')
            .setLabel('View Session History')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('session_start')
            .setLabel('Start New Session')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.update({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error ending session:', error);
      await interaction.reply({
        content: `Error ending session: ${error.message}`,
        ephemeral: true
      });
    }
  },
  
  async showCashInModal(interaction) {
    try {
      // Check if user has an active session
      const discordId = interaction.user.id;
      const activeSession = await sessionModel.getActiveSession(discordId);
      
      if (!activeSession) {
        await interaction.reply({
          content: 'You don\'t have an active session for cash-in.',
          ephemeral: true
        });
        return;
      }
      
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId('session_cashin')
        .setTitle('Record Cash-In');
      
      const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Amount')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter the cash-in amount')
        .setRequired(true);
      
      const notesInput = new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Notes (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Sold treasure chests')
        .setRequired(false);
      
      const firstRow = new ActionRowBuilder().addComponents(amountInput);
      const secondRow = new ActionRowBuilder().addComponents(notesInput);
      
      modal.addComponents(firstRow, secondRow);
      
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing cash-in modal:', error);
      await interaction.reply({
        content: 'There was an error recording your cash-in. Please try again.',
        ephemeral: true
      });
    }
  },
  
  async addCashIn(interaction, sessionId, amount) {
    try {
      console.log(`Adding cash-in: Session ID: ${sessionId} (${typeof sessionId}), Amount: ${amount}`);
      
      if (!sessionId) {
        await interaction.reply({
          content: 'Session ID is required for cash-in.',
          ephemeral: true
        });
        return;
      }
      
      const discordId = interaction.user.id;
      
      // Verify the session exists and belongs to this user
      const session = await sessionModel.getSessionById(sessionId);
      if (!session) {
        await interaction.reply({
          content: 'Session not found. Please try again.',
          ephemeral: true
        });
        return;
      }
      
      if (session.discord_id !== discordId) {
        await interaction.reply({
          content: 'You can only add cash-ins to your own sessions.',
          ephemeral: true
        });
        return;
      }
      
      // Add cash-in
      const cashIn = await sessionModel.addCashIn(sessionId, amount);
      
      // Get current gold
      const currentGold = await goldModel.getCurrentGold(discordId);
      const newGold = currentGold + amount;
      
      // Update gold
      await goldModel.updateGold(discordId, newGold);
      
      const embed = new EmbedBuilder()
        .setColor(0xF1C232)
        .setTitle('Cash-in Recorded!')
        .setDescription(`Added **${amount.toLocaleString()}** gold to your session.`)
        .addFields(
          { name: 'Session', value: session.session_name, inline: true },
          { name: 'Previous Gold', value: currentGold.toLocaleString(), inline: true },
          { name: 'New Gold', value: newGold.toLocaleString(), inline: true }
        );
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('session_cashin')
            .setLabel('Record Another Cash-in')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('session_end')
            .setLabel('End Session')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.update({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error adding cash-in:', error);
      await interaction.reply({
        content: `Error recording cash-in: ${error.message}`,
        ephemeral: true
      });
    }
  },
  
  async showSessionHistory(interaction) {
    try {
      const discordId = interaction.user.id;
      
      // Get session history
      const sessions = await sessionModel.getUserSessions(discordId, 5);
      
      if (sessions.length === 0) {
        await interaction.reply({
          content: 'You have no recorded sessions yet. Use the "Start New Session" button to begin tracking!',
          ephemeral: true
        });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Your Session History')
        .setDescription(`Showing your last ${sessions.length} sessions`);
      
      sessions.forEach((session, index) => {
        const startDate = new Date(session.start_time).toLocaleDateString();
        const startTime = new Date(session.start_time).toLocaleTimeString();
        
        let endInfo = 'In Progress';
        let duration = 'Ongoing';
        let earnedGold = 'In Progress';
        
        if (session.end_time) {
          const endDate = new Date(session.end_time).toLocaleDateString();
          const endTime = new Date(session.end_time).toLocaleTimeString();
          endInfo = `${endDate} ${endTime}`;
          
          const durationMs = new Date(session.end_time) - new Date(session.start_time);
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          duration = `${hours}h ${minutes}m`;
          
          earnedGold = `${session.earned_gold.toLocaleString()} gold`;
        }
        
        embed.addFields({
          name: `${index + 1}. ${session.session_name} (ID: ${session.id})`,
          value: `📅 Started: ${startDate} ${startTime}\n⏱️ Duration: ${duration}\n💰 Earned: ${earnedGold}`
        });
      });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('session_menu')
            .setLabel('Session Menu')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('menu')
            .setLabel('Back to Main Menu')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error getting session history:', error);
      await interaction.reply({
        content: `Error getting session history: ${error.message}`,
        ephemeral: true
      });
    }
  },
  
  async viewSessionDetails(interaction, sessionId) {
    try {
      // Get session
      const session = await sessionModel.getSessionById(sessionId);
      
      if (!session) {
        await interaction.reply({
          content: `Session with ID ${sessionId} not found.`,
          ephemeral: true
        });
        return;
      }
      
      // Check if session belongs to user
      if (session.discord_id !== interaction.user.id) {
        await interaction.reply({
          content: 'You can only view your own sessions.',
          ephemeral: true
        });
        return;
      }
      
      // Get cash-ins
      const cashIns = await sessionModel.getSessionCashIns(sessionId);
      
      const startDate = new Date(session.start_time).toLocaleDateString();
      const startTime = new Date(session.start_time).toLocaleTimeString();
      
      let endInfo = 'In Progress';
      let duration = 'Ongoing';
      
      if (session.end_time) {
        const endDate = new Date(session.end_time).toLocaleDateString();
        const endTime = new Date(session.end_time).toLocaleTimeString();
        endInfo = `${endDate} ${endTime}`;
        
        const durationMs = new Date(session.end_time) - new Date(session.start_time);
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${hours}h ${minutes}m`;
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Session: ${session.session_name}`)
        .addFields(
          { name: 'Session ID', value: session.id.toString(), inline: true },
          { name: 'Started', value: `${startDate} ${startTime}`, inline: true },
          { name: 'Ended', value: endInfo, inline: true },
          { name: 'Duration', value: duration, inline: true },
          { name: 'Starting Gold', value: session.starting_gold.toLocaleString(), inline: true }
        );
      
      if (session.end_time) {
        embed.addFields(
          { name: 'Ending Gold', value: session.ending_gold.toLocaleString(), inline: true },
          { name: 'Gold Earned', value: session.earned_gold.toLocaleString(), inline: true }
        );
      }
      
      if (session.notes) {
        embed.addFields({ name: 'Notes', value: session.notes });
      }
      
      if (cashIns.length > 0)

_Note: `EmissaryModel.php`, `GoldModel.php`, `UserModel.php`, and 7 more were excluded from the analysis due to size limit. Please upload again or start a new conversation if your question is related to them._

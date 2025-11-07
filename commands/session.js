// session.js - Session tracking command
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const sessionModel = require('../session-model');
const goldModel = require('../gold-model');
const userModel = require('../user-model');

// Add logo URL - using raw GitHub URL
const LOGO_URL = 'https://raw.githubusercontent.com/Kaoskiller091/Discord-Bot/3c89403106556f8cb8697caf67cf41e41bd1252a/SoT_GT-Logo.png';

module.exports = {
  name: 'session',
  description: 'Track your gaming sessions',
  
  // Main command execution
  async execute(interaction, params) {
    try {
      console.log(`Session command executed with params: ${params}`);
      
      // Check if this is a message (prefix command)
      if (interaction.content !== undefined) {
        console.log('Handling prefix command for session');
        // For prefix commands, just show the session menu
        await this.showSessionMenuForMessage(interaction);
        return;
      }
      
      // If this is a button interaction
      if (interaction.isButton()) {
        const action = params || 'menu';
        console.log(`Session button action: ${action}`);
        
        // Handle confirmation buttons for starting session
        if (action && action.startsWith('confirmstart_')) {
          const startingGold = parseInt(action.split('_')[1]);
          await interaction.deferReply({ ephemeral: true });
          
          // Update the user's gold to match the entered amount
          await goldModel.updateGold(interaction.user.id, startingGold, 'Gold updated when starting session');
          
          // Then start the session with this amount
          const sessionName = "Sea of Thieves Session"; // Default name
          return await this.handleStartSessionWithGold(interaction, sessionName, startingGold);
        }
        
        if (action && action.startsWith('useexisting_')) {
          const startingGold = parseInt(action.split('_')[1]);
          await interaction.deferReply({ ephemeral: true });
          
          // Use the existing gold amount without updating it
          const sessionName = "Sea of Thieves Session"; // Default name
          return await this.handleStartSessionWithGold(interaction, sessionName, startingGold);
        }
        
        switch (action) {
          case 'start':
            await this.showStartSessionModal(interaction);
            break;
          case 'end':
            await this.showEndSessionModal(interaction);
            break;
          case 'cashin':
            await this.showCashInModal(interaction);
            break;
          case 'view':
            await this.showSessionHistory(interaction);
            break;
          case 'menu':
          default:
            await this.showSessionMenu(interaction);
            break;
        }
      } else {
        // If this is a regular slash command
        await this.showSessionMenu(interaction);
      }
    } catch (error) {
      console.error('Error in session command:', error);
      const errorMessage = 'There was an error processing the session command.';
      
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
      console.log(`Handling session modal: ${action}`);
      
      switch (action) {
        case 'start':
          // Get form values
          const sessionName = interaction.fields.getTextInputValue('sessionName');
          const startingGoldInput = interaction.fields.getTextInputValue('startingGold');
          let startingGold = parseInt(startingGoldInput.replace(/,/g, ''));
          
          if (isNaN(startingGold) || startingGold < 0) {
            return await interaction.reply({
              content: 'Please enter a valid gold amount.',
              ephemeral: true
            });
          }
          
          // Check if the entered gold matches the current gold
          const currentGold = await goldModel.getCurrentGold(interaction.user.id);
          
          // If the user has gold records and the entered amount is different, confirm the change
          if (currentGold > 0 && startingGold !== currentGold) {
            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`session_confirmstart_${startingGold}`)
                  .setLabel('Use This Amount')
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId(`session_useexisting_${currentGold}`)
                  .setLabel(`Use Existing (${currentGold.toLocaleString()})`)
                  .setStyle(ButtonStyle.Secondary)
              );
            
            return await interaction.reply({
              content: `The gold amount you entered (${startingGold.toLocaleString()}) is different from your current gold (${currentGold.toLocaleString()}). Which would you like to use?`,
              components: [row],
              ephemeral: true
            });
          }
          
          await interaction.deferReply({ ephemeral: true });
          await this.handleStartSessionWithGold(interaction, sessionName, startingGold);
          break;
        case 'end':
          await this.handleEndSession(interaction);
          break;
        case 'cashin':
          await this.handleCashIn(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown action', ephemeral: true });
          break;
      }
    } catch (error) {
      console.error('Error handling session modal:', error);
      await interaction.reply({ content: 'There was an error processing your input.', ephemeral: true }).catch(console.error);
    }
  },
  
  // Show the main session menu for message-based commands
  async showSessionMenuForMessage(message) {
    try {
      console.log('Showing session menu for message command');
      
      // Get user's Discord ID
      const userId = message.author.id;
      
      // Create or update user in database
      await userModel.createOrUpdateUser(userId, message.author.username);
      
      // Check if user has an active session
      const activeSession = await sessionModel.getActiveSession(userId);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Sea of Thieves Session Tracker')
        .setDescription('Track your gold earnings during gaming sessions')
        .setThumbnail(LOGO_URL)
        .setTimestamp();
      
      // Add fields based on active session status
      if (activeSession) {
        // Format date properly
        let startTimeStr = 'Unknown';
        try {
          if (activeSession.start_time) {
            const startTime = new Date(activeSession.start_time);
            if (!isNaN(startTime.getTime())) {
              startTimeStr = startTime.toLocaleString();
            }
          }
        } catch (err) {
          console.error('Error formatting date:', err);
        }
        
        embed.addFields(
          { name: 'Active Session', value: activeSession.session_name },
          { name: 'Started', value: startTimeStr },
          { name: 'Starting Gold', value: activeSession.starting_gold.toString() }
        );
      } else {
        embed.addFields(
          { name: 'No Active Session', value: 'Start a new session to track your gold earnings' }
        );
      }
      
      // Create buttons
      const row = new ActionRowBuilder();
      
      if (activeSession) {
        // Buttons for active session
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('session_end')
            .setLabel('End Session')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('session_cashin')
            .setLabel('Record Cash-in')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('session_view')
            .setLabel('View History')
            .setStyle(ButtonStyle.Secondary)
        );
      } else {
        // Buttons for no active session
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('session_start')
            .setLabel('Start Session')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('session_view')
            .setLabel('View History')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      // Send the message with buttons
      await message.reply({ 
        embeds: [embed], 
        components: [row]
      });
      
      console.log('Session menu for message sent successfully');
    } catch (error) {
      console.error('Error showing session menu for message:', error);
      await message.reply('There was an error showing the session menu!');
    }
  },
  
  // Show the main session menu for interaction-based commands
  async showSessionMenu(interaction) {
    try {
      console.log('Showing session menu');
      
      // Get user's Discord ID
      const userId = interaction.user.id;
      console.log(`User ID: ${userId}`);
      
      // Create or update user in database
      await userModel.createOrUpdateUser(userId, interaction.user.username);
      
      // Check if user has an active session
      console.log('Checking for active session...');
      const activeSession = await sessionModel.getActiveSession(userId);
      console.log('Active session result:', activeSession);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Sea of Thieves Session Tracker')
        .setDescription('Track your gold earnings during gaming sessions')
        .setThumbnail(LOGO_URL)
        .setTimestamp();
      
      // Add fields based on active session status
      if (activeSession) {
        // Format date properly
        let startTimeStr = 'Unknown';
        try {
          if (activeSession.start_time) {
            const startTime = new Date(activeSession.start_time);
            if (!isNaN(startTime.getTime())) {
              startTimeStr = startTime.toLocaleString();
            }
          }
        } catch (err) {
          console.error('Error formatting date:', err);
        }
        
        embed.addFields(
          { name: 'Active Session', value: activeSession.session_name },
          { name: 'Started', value: startTimeStr },
          { name: 'Starting Gold', value: activeSession.starting_gold.toString() }
        );
      } else {
        embed.addFields(
          { name: 'No Active Session', value: 'Start a new session to track your gold earnings' }
        );
      }
      
      // Create buttons
      const row = new ActionRowBuilder();
      
      if (activeSession) {
        // Buttons for active session
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('session_end')
            .setLabel('End Session')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('session_cashin')
            .setLabel('Record Cash-in')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('session_view')
            .setLabel('View History')
            .setStyle(ButtonStyle.Secondary)
        );
      } else {
        // Buttons for no active session
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('session_start')
            .setLabel('Start Session')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('session_view')
            .setLabel('View History')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      console.log('Prepared buttons:', row);
      
      // Send the message
      if (interaction.deferred || interaction.replied) {
        console.log('Following up with session menu');
        await interaction.followUp({ 
          embeds: [embed], 
          components: [row], 
          ephemeral: true 
        });
      } else {
        console.log('Replying with session menu');
        await interaction.reply({ 
          embeds: [embed], 
          components: [row], 
          ephemeral: true 
        });
      }
      
      console.log('Session menu sent successfully');
    } catch (error) {
      console.error('Error showing session menu:', error);
      throw error;
    }
  },
  
  // Show modal to start a session
  async showStartSessionModal(interaction) {
    try {
      // Get user's current gold
      const userId = interaction.user.id;
      let currentGold = 0;
      
      try {
        currentGold = await goldModel.getCurrentGold(userId);
      } catch (error) {
        console.error('Error getting current gold, using 0 as default:', error);
        // Continue with default value of 0
      }
      
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId('session_start')
        .setTitle('Start New Session');
      
      // Add inputs
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
        .setValue(currentGold.toString())
        .setPlaceholder('Enter your current gold amount')
        .setRequired(true);
      
      // Add inputs to modal
      const firstRow = new ActionRowBuilder().addComponents(sessionNameInput);
      const secondRow = new ActionRowBuilder().addComponents(startingGoldInput);
      modal.addComponents(firstRow, secondRow);
      
      // Show the modal
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing start session modal:', error);
      await interaction.reply({ 
        content: 'There was an error showing the session form. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Show modal to end a session
  async showEndSessionModal(interaction) {
    try {
      // Get user's active session
      const userId = interaction.user.id;
      const activeSession = await sessionModel.getActiveSession(userId);
      
      if (!activeSession) {
        await interaction.reply({ content: 'You don\'t have an active session to end.', ephemeral: true });
        return;
      }
      
      // Get user's current gold
      let currentGold;
      try {
        currentGold = await goldModel.getCurrentGold(userId);
      } catch (error) {
        console.error('Error getting current gold, using starting gold as fallback:', error);
        currentGold = activeSession.starting_gold;
      }
      
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId('session_end')
        .setTitle('End Session');
      
      // Add inputs
      const endingGoldInput = new TextInputBuilder()
        .setCustomId('endingGold')
        .setLabel('Ending Gold')
        .setStyle(TextInputStyle.Short)
        .setValue(currentGold.toString())
        .setPlaceholder('Enter your current gold amount')
        .setRequired(true);
      
      const notesInput = new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Session Notes (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Add any notes about this session')
        .setRequired(false);
      
      // Add inputs to modal
      const firstRow = new ActionRowBuilder().addComponents(endingGoldInput);
      const secondRow = new ActionRowBuilder().addComponents(notesInput);
      modal.addComponents(firstRow, secondRow);
      
      // Show the modal
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing end session modal:', error);
      await interaction.reply({ 
        content: 'There was an error showing the end session form. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Show modal to record a cash-in
  async showCashInModal(interaction) {
    try {
      // Get user's active session
      const userId = interaction.user.id;
      const activeSession = await sessionModel.getActiveSession(userId);
      
      if (!activeSession) {
        await interaction.reply({ content: 'You don\'t have an active session to record a cash-in.', ephemeral: true });
        return;
      }
      
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId('session_cashin')
        .setTitle('Record Cash-in');
      
      // Add inputs
      const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Gold Amount')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter the gold amount you just earned')
        .setRequired(true);
      
      const notesInput = new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Notes (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Sold Chest of Legends')
        .setRequired(false);
      
      // Add inputs to modal
      const firstRow = new ActionRowBuilder().addComponents(amountInput);
      const secondRow = new ActionRowBuilder().addComponents(notesInput);
      modal.addComponents(firstRow, secondRow);
      
      // Show the modal
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing cash-in modal:', error);
      await interaction.reply({ 
        content: 'There was an error showing the cash-in form. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Show session history
  async showSessionHistory(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Get user's sessions
      let sessions = [];
      try {
        sessions = await sessionModel.getUserSessions(userId, 5);
        console.log('Retrieved sessions:', sessions);
      } catch (error) {
        console.error('Error getting user sessions:', error);
        // Continue with empty sessions array
      }
      
      // Get user's stats
      let stats = {
        totalSessions: 0,
        completedSessions: 0,
        totalEarnings: 0,
        averageEarnings: 0
      };
      
      try {
        stats = await sessionModel.getUserSessionStats(userId);
      } catch (error) {
        console.error('Error getting user stats:', error);
        // Continue with default stats
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Your Session History')
        .setDescription('Your recent Sea of Thieves sessions')
        .setThumbnail(LOGO_URL)
        .setTimestamp();
      
      // Add stats fields
      embed.addFields(
        { name: 'Total Sessions', value: stats.totalSessions.toString(), inline: true },
        { name: 'Completed Sessions', value: stats.completedSessions.toString(), inline: true },
        { name: 'Total Earnings', value: stats.totalEarnings.toString(), inline: true },
        { name: 'Average Earnings', value: stats.averageEarnings.toString(), inline: true }
      );
      
      // Add recent sessions with improved date handling
      if (sessions.length > 0) {
        embed.addFields({ name: 'Recent Sessions', value: '\u200B' });
        
        for (const session of sessions) {
          // Format the date properly
          let startTimeStr = 'Unknown Date';
          try {
            if (session.start_time) {
              const startTime = new Date(session.start_time);
              if (!isNaN(startTime.getTime())) {
                startTimeStr = startTime.toLocaleDateString();
              }
            }
          } catch (err) {
            console.error('Error formatting date:', err);
          }
          
          const status = session.end_time ? 'Completed' : 'Active';
          const earnings = session.earned_gold !== null ? session.earned_gold.toString() : 'In progress';
          
          embed.addFields({
            name: `${session.session_name} (${startTimeStr})`,
            value: `Status: ${status}\nEarnings: ${earnings}`
          });
        }
      } else {
        embed.addFields({ name: 'No Sessions Found', value: 'Start a session to begin tracking' });
      }
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('session_menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send the message
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error showing session history:', error);
      await interaction.reply({ 
        content: 'There was an error showing your session history. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Handle start session with gold (new method to avoid duplicate code)
  async handleStartSessionWithGold(interaction, sessionName, startingGold) {
    try {
      const userId = interaction.user.id;
      
      // Check if user already has an active session
      const activeSession = await sessionModel.getActiveSession(userId);
      if (activeSession) {
        await interaction.editReply({ content: 'You already have an active session. End it before starting a new one.', ephemeral: true });
        return;
      }
      
      if (isNaN(startingGold)) {
        await interaction.editReply({ content: 'Please enter a valid number for starting gold.', ephemeral: true });
        return;
      }
      
      // Start session without updating gold
      const session = await sessionModel.startSession(userId, sessionName, startingGold);
      
      // Format date properly
      let startTimeStr = 'Unknown';
      try {
        if (session.start_time) {
          const startTime = new Date(session.start_time);
          if (!isNaN(startTime.getTime())) {
            startTimeStr = startTime.toLocaleString();
          }
        }
      } catch (err) {
        console.error('Error formatting date:', err);
      }
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Session Started')
        .setDescription(`Your "${sessionName}" session has been started!`)
        .setThumbnail(LOGO_URL)
        .addFields(
          { name: 'Starting Gold', value: startingGold.toString() },
          { name: 'Start Time', value: startTimeStr }
        )
        .setTimestamp();
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('session_menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send response
      await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error handling start session:', error);
      await interaction.editReply({ content: 'There was an error starting your session.', ephemeral: true });
    }
  },
  
  // Handle end session form submission
  async handleEndSession(interaction) {
    try {
      console.log('Handling end session submission');
      const userId = interaction.user.id;
      
      // Get active session
      const activeSession = await sessionModel.getActiveSession(userId);
      if (!activeSession) {
        await interaction.reply({ content: 'You don\'t have an active session to end.', ephemeral: true });
        return;
      }
      
      console.log('Active session found:', activeSession);
      
      // Get form values
      const endingGoldStr = interaction.fields.getTextInputValue('endingGold');
      const endingGold = parseInt(endingGoldStr.replace(/,/g, ''));
      const notes = interaction.fields.getTextInputValue('notes');
      
      console.log('Form values:', { endingGoldStr, endingGold, notes });
      
      if (isNaN(endingGold)) {
        await interaction.reply({ content: 'Please enter a valid number for ending gold.', ephemeral: true });
        return;
      }
      
      // Update user's gold
      console.log('Updating gold to:', endingGold);
      await goldModel.updateGold(userId, endingGold);
      
      // End session
      console.log('Ending session with ID:', activeSession.id);
      const session = await sessionModel.endSession(activeSession.id, endingGold);
      console.log('Session ended:', session);
      
      // Add notes if provided
      if (notes) {
        console.log('Adding notes to session');
        await sessionModel.addSessionNotes(activeSession.id, notes);
      }
      
      // Format dates properly
      let startTimeStr = 'Unknown';
      let endTimeStr = 'Unknown';
      
      try {
        if (session.start_time) {
          const startTime = new Date(session.start_time);
          if (!isNaN(startTime.getTime())) {
            startTimeStr = startTime.toLocaleString();
          }
        }
        
        if (session.end_time) {
          const endTime = new Date(session.end_time);
          if (!isNaN(endTime.getTime())) {
            endTimeStr = endTime.toLocaleString();
          }
        }
      } catch (err) {
        console.error('Error formatting dates:', err);
      }
      
      // Calculate duration
      let durationText = 'Unknown';
      try {
        const startTime = new Date(session.start_time);
        const endTime = new Date(session.end_time);
        
        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
          const durationMs = endTime - startTime;
          const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
          const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          durationText = `${durationHours}h ${durationMinutes}m`;
        }
      } catch (err) {
        console.error('Error calculating duration:', err);
      }
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Session Ended')
        .setDescription(`Your "${session.session_name}" session has ended!`)
        .setThumbnail(LOGO_URL)
        .addFields(
          { name: 'Starting Gold', value: session.starting_gold.toString(), inline: true },
          { name: 'Ending Gold', value: session.ending_gold.toString(), inline: true },
          { name: 'Earned Gold', value: session.earned_gold.toString(), inline: true },
          { name: 'Duration', value: durationText, inline: true },
          { name: 'Start Time', value: startTimeStr, inline: true },
          { name: 'End Time', value: endTimeStr, inline: true }
        )
        .setTimestamp();
      
      // Add notes field if provided
      if (notes) {
        embed.addFields({ name: 'Notes', value: notes });
      }
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('session_menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      console.log('Sending response');
      // Send response
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error handling end session:', error);
      await interaction.reply({ content: 'There was an error ending your session. Error: ' + error.message, ephemeral: true });
    }
  },
  
  // Handle cash-in form submission
  async handleCashIn(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Get active session
      const activeSession = await sessionModel.getActiveSession(userId);
      if (!activeSession) {
        await interaction.reply({ content: 'You don\'t have an active session to record a cash-in.', ephemeral: true });
        return;
      }
      
      // Get form values
      const amountInput = interaction.fields.getTextInputValue('amount');
      const amount = parseInt(amountInput.replace(/,/g, ''));
      const notes = interaction.fields.getTextInputValue('notes');
      
      if (isNaN(amount)) {
        await interaction.reply({ content: 'Please enter a valid number for the gold amount.', ephemeral: true });
        return;
      }
      
      // Add cash-in
      const cashIn = await sessionModel.addCashIn(activeSession.id, amount, notes);
      
      // Format timestamp properly
      let timestampStr = 'Just now';
      try {
        if (cashIn.timestamp) {
          const timestamp = new Date(cashIn.timestamp);
          if (!isNaN(timestamp.getTime())) {
            timestampStr = timestamp.toLocaleString();
          }
        }
      } catch (err) {
        console.error('Error formatting timestamp:', err);
      }
      
      // Get current gold and update
	const currentGold = await goldModel.getCurrentGold(userId);
	const newGold = currentGold + amount;
	await goldModel.updateGold(userId, newGold);
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Cash-in Recorded')
        .setDescription(`Added ${amount} gold to your session!`)
        .setThumbnail(LOGO_URL)
        .addFields(
          { name: 'Session', value: activeSession.session_name },
          { name: 'Amount', value: amount.toString() },
          { name: 'Time', value: timestampStr },
          { name: 'New Total Gold', value: newGold.toString() }
        )
        .setTimestamp();
      
      // Add notes field if provided
      if (notes) {
        embed.addFields({ name: 'Notes', value: notes });
      }
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('session_menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send response
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error handling cash-in:', error);
      await interaction.reply({ content: 'There was an error recording your cash-in.', ephemeral: true });
    }
  }
};
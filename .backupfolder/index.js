// index.js
const { 
  Client, 
  GatewayIntentBits, 
  Events, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  EmbedBuilder 
} = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// When the client is ready, run this code
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready!');
});

// Handle message commands to show the control panel
client.on(Events.MessageCreate, async message => {
  // Ignore messages from bots
  if (message.author.bot) return;
  
  // Check if message is asking for the bot
  if (message.content.toLowerCase() === '!sotc' || 
      message.content.toLowerCase() === '!sot' || 
      message.content.toLowerCase() === '!companion') {
    await sendControlPanel(message.channel);
  }
});

// Handle button interactions
client.on(Events.InteractionCreate, async interaction => {
  // Handle button clicks
  if (interaction.isButton()) {
    const buttonId = interaction.customId;
    
    console.log(`Button clicked: ${buttonId} by ${interaction.user.tag}`);
    
    // Handle different button actions
    switch (buttonId) {
      case 'control_panel':
        await sendControlPanel(interaction.channel);
        await interaction.deferUpdate();
        break;
        
      case 'track_gold':
        await handleTrackGold(interaction);
        break;
        
      case 'track_session':
        await handleTrackSession(interaction);
        break;
        
      case 'view_stats':
        await handleViewStats(interaction);
        break;
        
      case 'leaderboard':
        await handleLeaderboard(interaction);
        break;
        
      case 'help':
        await handleHelp(interaction);
        break;
        
      default:
        // Check if it's a custom button with parameters
        if (buttonId.startsWith('gold_confirm_')) {
          await handleGoldConfirmation(interaction, buttonId.replace('gold_confirm_', ''));
        } else if (buttonId.startsWith('session_start_')) {
          await handleSessionStart(interaction, buttonId.replace('session_start_', ''));
        } else if (buttonId.startsWith('session_end_')) {
          await handleSessionEnd(interaction, buttonId.replace('session_end_', ''));
        } else {
          await interaction.reply({ content: 'This button is not yet implemented.', ephemeral: true });
        }
    }
    return;
  }
  
  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    const modalId = interaction.customId;
    
    console.log(`Modal submitted: ${modalId} by ${interaction.user.tag}`);
    
    if (modalId === 'gold_input') {
      const goldAmount = interaction.fields.getTextInputValue('goldAmount');
      await handleGoldInput(interaction, goldAmount);
    } else if (modalId === 'session_details') {
      await handleSessionDetails(interaction);
    }
    return;
  }
});

// Function to send the main control panel
async function sendControlPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(0xF1C232)
    .setTitle('Sea of Thieves Companion')
    .setDescription('Welcome to your Sea of Thieves tracking companion! Choose an option below:')
    .setThumbnail('https://i.imgur.com/6z9tl68.png')
    .addFields(
      { name: 'Track Gold', value: 'Update your current gold amount' },
      { name: 'Track Session', value: 'Record a new gaming session' },
      { name: 'View Stats', value: 'See your personal statistics' },
      { name: 'Leaderboard', value: 'View the server leaderboard' }
    )
    .setFooter({ text: 'Sea of Thieves Companion' });
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('track_gold')
        .setLabel('Track Gold')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💰'),
      new ButtonBuilder()
        .setCustomId('track_session')
        .setLabel('Track Session')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⏱️'),
      new ButtonBuilder()
        .setCustomId('view_stats')
        .setLabel('View Stats')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId('leaderboard')
        .setLabel('Leaderboard')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏆'),
      new ButtonBuilder()
        .setCustomId('help')
        .setLabel('Help')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❓')
    );
  
  await channel.send({ embeds: [embed], components: [row] });
}

// Function to handle the Track Gold button
async function handleTrackGold(interaction) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
  
  // Create the modal
  const modal = new ModalBuilder()
    .setCustomId('gold_input')
    .setTitle('Update Your Gold');
  
  // Add components to modal
  const goldInput = new TextInputBuilder()
    .setCustomId('goldAmount')
    .setLabel('How much gold do you currently have?')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter amount (numbers only)')
    .setRequired(true);
  
  // Add inputs to the modal
  const firstActionRow = new ActionRowBuilder().addComponents(goldInput);
  modal.addComponents(firstActionRow);
  
  // Show the modal
  await interaction.showModal(modal);
}

// Function to handle gold input from modal
async function handleGoldInput(interaction, goldAmount) {
  // Validate input is a number
  const gold = parseInt(goldAmount.replace(/,/g, ''));
  
  if (isNaN(gold)) {
    await interaction.reply({ 
      content: 'Please enter a valid number for your gold amount.', 
      ephemeral: true 
    });
    return;
  }
  
  // Create confirmation message
  const embed = new EmbedBuilder()
    .setColor(0xF1C232)
    .setTitle('Confirm Gold Update')
    .setDescription(`You're about to update your gold to **${gold.toLocaleString()}**`)
    .addFields(
      { name: 'Previous Amount', value: 'Unknown (not implemented yet)' },
      { name: 'New Amount', value: gold.toLocaleString() }
    );
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`gold_confirm_${gold}`)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('control_panel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );
  
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// Function to handle gold confirmation
async function handleGoldConfirmation(interaction, goldAmount) {
  const gold = parseInt(goldAmount);
  
  // Here you would update the database with the new gold amount
  // For now, we'll just acknowledge the update
  
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('Gold Updated!')
    .setDescription(`Your gold has been updated to **${gold.toLocaleString()}**`)
    .setFooter({ text: 'Sea of Thieves Companion' });
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('control_panel')
        .setLabel('Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.update({ embeds: [embed], components: [row] });
}

// Function to handle the Track Session button
async function handleTrackSession(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('Track Gaming Session')
    .setDescription('Let\'s record your Sea of Thieves session!')
    .addFields(
      { name: 'Start Session', value: 'Begin tracking a new gaming session' },
      { name: 'End Session', value: 'Complete your current session and record earnings' }
    );
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_start_new')
        .setLabel('Start New Session')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️'),
      new ButtonBuilder()
        .setCustomId('session_end_current')
        .setLabel('End Current Session')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️'),
      new ButtonBuilder()
        .setCustomId('control_panel')
        .setLabel('Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// Function to handle session start
async function handleSessionStart(interaction, sessionType) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
  
  // Create the modal
  const modal = new ModalBuilder()
    .setCustomId('session_details')
    .setTitle('New Gaming Session');
  
  // Add components to modal
  const sessionName = new TextInputBuilder()
    .setCustomId('sessionName')
    .setLabel('Session Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Friday Night Voyage')
    .setRequired(true);
  
  const startingGold = new TextInputBuilder()
    .setCustomId('startingGold')
    .setLabel('Starting Gold Amount')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your current gold amount')
    .setRequired(true);
  
  // Add inputs to the modal
  const firstActionRow = new ActionRowBuilder().addComponents(sessionName);
  const secondActionRow = new ActionRowBuilder().addComponents(startingGold);
  modal.addComponents(firstActionRow, secondActionRow);
  
  // Show the modal
  await interaction.showModal(modal);
}

// Function to handle session details from modal
async function handleSessionDetails(interaction) {
  const sessionName = interaction.fields.getTextInputValue('sessionName');
  const startingGold = interaction.fields.getTextInputValue('startingGold');
  
  // Validate input
  const gold = parseInt(startingGold.replace(/,/g, ''));
  
  if (isNaN(gold)) {
    await interaction.reply({ 
      content: 'Please enter a valid number for your starting gold amount.', 
      ephemeral: true 
    });
    return;
  }
  
  // Here you would save the session to the database
  // For now, we'll just acknowledge the session start
  
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('Session Started!')
    .setDescription(`Your "${sessionName}" session has begun!`)
    .addFields(
      { name: 'Starting Gold', value: gold.toLocaleString() },
      { name: 'Start Time', value: new Date().toLocaleString() }
    )
    .setFooter({ text: 'Use "End Current Session" when you\'re done playing' });
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('session_end_current')
        .setLabel('End Session')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️'),
      new ButtonBuilder()
        .setCustomId('control_panel')
        .setLabel('Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.reply({ embeds: [embed], components: [row] });
}

// Function to handle session end
async function handleSessionEnd(interaction, sessionId) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
  
  // Create the modal
  const modal = new ModalBuilder()
    .setCustomId('session_end_details')
    .setTitle('End Gaming Session');
  
  // Add components to modal
  const endingGold = new TextInputBuilder()
    .setCustomId('endingGold')
    .setLabel('Ending Gold Amount')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your current gold amount')
    .setRequired(true);
  
  const sessionNotes = new TextInputBuilder()
    .setCustomId('sessionNotes')
    .setLabel('Session Notes (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('What did you accomplish this session?')
    .setRequired(false);
  
  // Add inputs to the modal
  const firstActionRow = new ActionRowBuilder().addComponents(endingGold);
  const secondActionRow = new ActionRowBuilder().addComponents(sessionNotes);
  modal.addComponents(firstActionRow, secondActionRow);
  
  // Show the modal
  await interaction.showModal(modal);
}

// Function to handle View Stats button
async function handleViewStats(interaction) {
  // Here you would fetch stats from the database
  // For now, we'll show placeholder stats
  
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`${interaction.user.username}'s Statistics`)
    .setDescription('Your Sea of Thieves progress')
    .addFields(
      { name: 'Current Gold', value: '0', inline: true },
      { name: 'Total Earned', value: '0', inline: true },
      { name: 'Sessions Completed', value: '0', inline: true },
      { name: 'Average Gold per Session', value: '0', inline: true },
      { name: 'Best Session', value: 'None recorded', inline: true },
      { name: 'Total Playtime', value: '0 hours', inline: true }
    )
    .setFooter({ text: 'Start tracking sessions to see your stats!' });
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('control_panel')
        .setLabel('Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// Function to handle Leaderboard button
async function handleLeaderboard(interaction) {
  // Here you would fetch leaderboard data from the database
  // For now, we'll show a placeholder leaderboard
  
  const embed = new EmbedBuilder()
    .setColor(0xF1C232)
    .setTitle('Sea of Thieves Leaderboard')
    .setDescription('Top pirates by gold earned')
    .addFields(
      { name: '🥇 First Place', value: 'No data yet' },
      { name: '🥈 Second Place', value: 'No data yet' },
      { name: '🥉 Third Place', value: 'No data yet' }
    )
    .setFooter({ text: 'Start tracking to appear on the leaderboard!' });
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('control_panel')
        .setLabel('Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// Function to handle Help button
async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('Sea of Thieves Companion Help')
    .setDescription('How to use this bot:')
    .addFields(
      { name: 'Getting Started', value: 'Type `!sotc` in any channel to open the main menu' },
      { name: 'Track Gold', value: 'Update your current gold amount after playing' },
      { name: 'Track Session', value: 'Record your gaming sessions to track earnings over time' },
      { name: 'View Stats', value: 'See your personal statistics and progress' },
      { name: 'Leaderboard', value: 'Compare your earnings with other server members' }
    )
    .setFooter({ text: 'Sea of Thieves Companion v1.0' });
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('control_panel')
        .setLabel('Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

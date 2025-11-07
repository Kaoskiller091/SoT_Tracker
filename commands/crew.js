// commands/crew.js - Crew management command
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const crewModel = require('../crew-model');
const sessionModel = require('../session-model');
const goldModel = require('../gold-model');
const userModel = require('../user-model');
const dbManager = require('../database'); // Add this import

// Add logo URL or use embed-utils
const LOGO_URL = 'https://raw.githubusercontent.com/Kaoskiller091/Discord-Bot/3c89403106556f8cb8697caf67cf41e41bd1252a/SoT_GT-Logo.png';

// Helper function to create embeds if you don't have embed-utils
function createEmbed(title, description, color = '#0099ff') {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setThumbnail(LOGO_URL)
    .setTimestamp();
}

module.exports = {
  name: 'crew',
  description: 'Manage your Sea of Thieves crew',
  
  // Main command execution
  async execute(interaction, params) {
    try {
      console.log(`Crew command executed with params: ${params}`);
      
      // If this is a button interaction
      if (interaction.isButton()) {
        const action = params || 'menu';
        console.log(`Crew button action: ${action}`);
        
        if (action.startsWith('join_')) {
          const crewId = parseInt(action.split('_')[1]);
          await this.showJoinCrewModal(interaction, crewId);
          return;
        }
        
        if (action.startsWith('leave_')) {
          const crewId = parseInt(action.split('_')[1]);
          await this.handleLeaveCrew(interaction, crewId);
          return;
        }
        
        if (action.startsWith('session_')) {
          const crewId = parseInt(action.split('_')[1]);
          await this.showStartCrewSessionModal(interaction, crewId);
          return;
        }
        
        if (action.startsWith('cashin_')) {
          const sessionId = parseInt(action.split('_')[1]);
          await this.showCrewCashInModal(interaction, sessionId);
          return;
        }
        
        if (action.startsWith('view_')) {
          const crewId = parseInt(action.split('_')[1]);
          await this.showCrewDetails(interaction, crewId);
          return;
        }
        
        switch (action) {
          case 'create':
            await this.showCreateCrewModal(interaction);
            break;
          case 'list':
            await this.showCrewList(interaction);
            break;
          case 'menu':
          default:
            await this.showCrewMenu(interaction);
            break;
        }
      } else if (interaction.isChatInputCommand()) {
        // If this is a slash command
        await this.showCrewMenu(interaction);
      }
    } catch (error) {
      console.error('Error in crew command:', error);
      const errorMessage = 'There was an error processing the crew command.';
      
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(console.error);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
      }
    }
  },
  
  // Handle modal submissions
  async handleModal(interaction, params) {
    try {
      const action = params || '';
      console.log(`Handling crew modal: ${action}`);
      
      if (action.startsWith('join_')) {
        const crewId = parseInt(action.split('_')[1]);
        await this.handleJoinCrew(interaction, crewId);
        return;
      }
      
      if (action.startsWith('session_')) {
        const crewId = parseInt(action.split('_')[1]);
        await this.handleStartCrewSession(interaction, crewId);
        return;
      }
      
      if (action.startsWith('cashin_')) {
        const sessionId = parseInt(action.split('_')[1]);
        await this.handleCrewCashIn(interaction, sessionId);
        return;
      }
      
      switch (action) {
        case 'create':
          await this.handleCreateCrew(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown action', ephemeral: true });
          break;
      }
    } catch (error) {
      console.error('Error handling crew modal:', error);
      await interaction.reply({ content: 'There was an error processing your input.', ephemeral: true }).catch(console.error);
    }
  },
  
  // Show the main crew menu
  async showCrewMenu(interaction) {
    try {
      // Get user's Discord ID
      const userId = interaction.user.id;
      
      // Create or update user in database
      await userModel.createOrUpdateUser(userId, interaction.user.username);
      
      // Get user's crews
      const userCrews = await crewModel.getUserCrews(userId);
      
      // Create embed
      const embed = createEmbed(
        'Sea of Thieves Crew Manager',
        'Manage your pirate crews and track gold together'
      );
      
      // Add fields based on user's crews
      if (userCrews.length > 0) {
        embed.addFields(
          { name: 'Your Crews', value: userCrews.map(c => `${c.name} (${c.role})`).join('\n') }
        );
      } else {
        embed.addFields(
          { name: 'No Crews', value: 'You are not part of any crews yet. Create or join a crew to get started!' }
        );
      }
      
      // Create buttons
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('crew_create')
          .setLabel('Create Crew')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('crew_list')
          .setLabel('List Crews')
          .setStyle(ButtonStyle.Secondary)
      );
      
      const components = [row1];
      
      // Add crew-specific buttons if user has crews
      if (userCrews.length > 0) {
        const row2 = new ActionRowBuilder();
        
        // Add buttons for first crew (can expand this later)
        const firstCrew = userCrews[0];
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`crew_view_${firstCrew.id}`)
            .setLabel(`View ${firstCrew.name}`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`crew_leave_${firstCrew.id}`)
            .setLabel(`Leave ${firstCrew.name}`)
            .setStyle(ButtonStyle.Danger)
        );
        
        components.push(row2);
      }
      
      // Send the message
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ 
          embeds: [embed], 
          components: components, 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          embeds: [embed], 
          components: components, 
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error('Error showing crew menu:', error);
      throw error;
    }
  },
  
  // Show modal to create a crew
  async showCreateCrewModal(interaction) {
    try {
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId('crew_create')
        .setTitle('Create New Crew');
      
      // Add inputs
      const crewNameInput = new TextInputBuilder()
        .setCustomId('crewName')
        .setLabel('Crew Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., The Golden Hoarders')
        .setRequired(true);
      
      const passwordInput = new TextInputBuilder()
        .setCustomId('password')
        .setLabel('Password (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Leave blank for no password')
        .setRequired(false);
      
      // Add inputs to modal
      const firstRow = new ActionRowBuilder().addComponents(crewNameInput);
      const secondRow = new ActionRowBuilder().addComponents(passwordInput);
      modal.addComponents(firstRow, secondRow);
      
      // Show the modal
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing create crew modal:', error);
      await interaction.reply({ 
        content: 'There was an error showing the crew creation form. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Handle create crew form submission
  async handleCreateCrew(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Get form values
      const crewName = interaction.fields.getTextInputValue('crewName');
      let password = interaction.fields.getTextInputValue('password');
      
      // If password is empty, set to null
      if (!password) password = null;
      
      // Create crew
      const crew = await crewModel.createCrew(crewName, userId, password);
      
      // Add creator as captain
      await crewModel.addCrewMember(crew.id, userId, 'captain');
      
      // Create response embed
      const embed = createEmbed(
        'Crew Created',
        `Your crew "${crewName}" has been created!`
      )
      .setColor('#00ff00')
      .addFields(
        { name: 'Crew Name', value: crewName },
        { name: 'Your Role', value: 'Captain' },
        { name: 'Password Protected', value: password ? 'Yes' : 'No' }
      );
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('crew_menu')
          .setLabel('Back to Crew Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send response
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error handling create crew:', error);
      await interaction.reply({ content: 'There was an error creating your crew.', ephemeral: true });
    }
  },
  
  // Show list of all crews
  async showCrewList(interaction) {
    try {
      // Get all crews
      const crews = await dbManager.query('SELECT * FROM crews ORDER BY name');
      
      // Create embed
      const embed = createEmbed(
        'Available Crews',
        'Join an existing crew or create your own'
      );
      
      // Add crews to embed
      if (crews.length > 0) {
        for (const crew of crews) {
          const memberCount = await dbManager.get(
            'SELECT COUNT(*) as count FROM crew_members WHERE crew_id = ?',
            [crew.id]
          );
          
          embed.addFields({
            name: crew.name,
            value: `Members: ${memberCount.count}\nPassword Protected: ${crew.password ? 'Yes' : 'No'}`
          });
        }
      } else {
        embed.addFields({ name: 'No Crews Found', value: 'Be the first to create a crew!' });
      }
      
      // Create buttons
      const rows = [];
      let currentRow = new ActionRowBuilder();
      let buttonCount = 0;
      
      // Add join buttons for each crew (max 5 per row)
      for (let i = 0; i < Math.min(crews.length, 10); i++) {
        if (buttonCount > 0 && buttonCount % 2 === 0) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
        
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`crew_join_${crews[i].id}`)
            .setLabel(`Join ${crews[i].name}`)
            .setStyle(ButtonStyle.Primary)
        );
        
        buttonCount++;
      }
      
      // Add the last row if it has buttons
      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }
      
      // Add back button
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('crew_menu')
          .setLabel('Back to Crew Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      rows.push(backRow);
      
      // Send the message
      await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    } catch (error) {
      console.error('Error showing crew list:', error);
      await interaction.reply({ 
        content: 'There was an error showing the crew list. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Show modal to join a crew
  async showJoinCrewModal(interaction, crewId) {
    try {
      // Get crew
      const crew = await crewModel.getCrewById(crewId);
      
      if (!crew) {
        await interaction.reply({ content: 'Crew not found.', ephemeral: true });
        return;
      }
      
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId(`crew_join_${crewId}`)
        .setTitle(`Join ${crew.name}`);
      
      // Add password input if crew has password
      if (crew.password) {
        const passwordInput = new TextInputBuilder()
          .setCustomId('password')
          .setLabel('Crew Password')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter the crew password')
          .setRequired(true);
        
        const row = new ActionRowBuilder().addComponents(passwordInput);
        modal.addComponents(row);
      }
      
      // Show the modal
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing join crew modal:', error);
      await interaction.reply({ 
        content: 'There was an error showing the join crew form. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Handle join crew form submission
  async handleJoinCrew(interaction, crewId) {
    try {
      const userId = interaction.user.id;
      
      // Get crew
      const crew = await crewModel.getCrewById(crewId);
      
      if (!crew) {
        await interaction.reply({ content: 'Crew not found.', ephemeral: true });
        return;
      }
      
      // Check if user is already in the crew
      const isInCrew = await crewModel.isUserInCrew(crewId, userId);
      
      if (isInCrew) {
        await interaction.reply({ content: 'You are already a member of this crew.', ephemeral: true });
        return;
      }
      
      // Verify password if crew has one
      if (crew.password) {
        const password = interaction.fields.getTextInputValue('password');
        
        if (password !== crew.password) {
          await interaction.reply({ content: 'Incorrect password.', ephemeral: true });
          return;
        }
      }
      
      // Get user's current gold
      const currentGold = await goldModel.getCurrentGold(userId);
      
      // Add user to crew
      await crewModel.addCrewMember(crewId, userId, 'member', currentGold);
      
      // Create response embed
      const embed = createEmbed(
        'Joined Crew',
        `You have joined the "${crew.name}" crew!`
      )
      .setColor('#00ff00')
      .addFields(
        { name: 'Crew Name', value: crew.name },
        { name: 'Your Role', value: 'Member' },
        { name: 'Starting Gold', value: currentGold.toString() }
      );
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('crew_menu')
          .setLabel('Back to Crew Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send response
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error handling join crew:', error);
      await interaction.reply({ content: 'There was an error joining the crew.', ephemeral: true });
    }
  },
  
  // Handle leave crew
  async handleLeaveCrew(interaction, crewId) {
    try {
      const userId = interaction.user.id;
      
      // Get crew
      const crew = await crewModel.getCrewById(crewId);
      
      if (!crew) {
        await interaction.reply({ content: 'Crew not found.', ephemeral: true });
        return;
      }
      
      // Check if user is in the crew
      const isInCrew = await crewModel.isUserInCrew(crewId, userId);
      
      if (!isInCrew) {
        await interaction.reply({ content: 'You are not a member of this crew.', ephemeral: true });
        return;
      }
      
      // Check if user is the captain
      const isCaptain = await crewModel.isUserCrewCaptain(crewId, userId);
      
      if (isCaptain) {
        // Get crew members
        const members = await crewModel.getCrewMembers(crewId);
        
        // If there are other members, can't leave
        if (members.length > 1) {
          await interaction.reply({ 
            content: 'You are the captain of this crew. You must transfer captaincy before leaving.', 
            ephemeral: true 
          });
          return;
        }
      }
      
      // Remove user from crew
      await crewModel.removeCrewMember(crewId, userId);
      
      // Create response embed
      const embed = createEmbed(
        'Left Crew',
        `You have left the "${crew.name}" crew.`
      )
      .setColor('#ff9900');
      
      // Create button to go back to menu
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('crew_menu')
          .setLabel('Back to Crew Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send response
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error handling leave crew:', error);
      await interaction.reply({ content: 'There was an error leaving the crew.', ephemeral: true });
    }
  },
  
  // Show crew details
  async showCrewDetails(interaction, crewId) {
    try {
      // Get crew
      const crew = await crewModel.getCrewById(crewId);
      
      if (!crew) {
        await interaction.reply({ content: 'Crew not found.', ephemeral: true });
        return;
      }
      
      // Get crew members
      const members = await crewModel.getCrewMembers(crewId);
      
      // Create embed
      const embed = createEmbed(
        `Crew: ${crew.name}`,
        'Crew details and members'
      );
      
      // Add crew info
      embed.addFields(
        { name: 'Created By', value: crew.created_by, inline: true },
        { name: 'Created At', value: new Date(crew.created_at).toLocaleString(), inline: true },
        { name: 'Password Protected', value: crew.password ? 'Yes' : 'No', inline: true }
      );
      
      // Add members
      if (members.length > 0) {
        let membersText = '';
        for (const member of members) {
          const user = await userModel.getUserById(member.discord_id);
          const username = user ? user.username : member.discord_id;
          membersText += `${username} (${member.role}) - ${member.current_gold} gold\n`;
        }
        
        embed.addFields({ name: 'Members', value: membersText });
      } else {
        embed.addFields({ name: 'Members', value: 'No members found' });
      }
      
      // Create buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`crew_session_${crewId}`)
          .setLabel('Start Crew Session')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('crew_menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Send response
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error showing crew details:', error);
      await interaction.reply({ content: 'There was an error showing crew details.', ephemeral: true });
    }
  }
};

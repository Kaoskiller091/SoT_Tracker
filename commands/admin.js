// commands/admin.js - Admin commands for user management
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const accessControl = require('../access-control');

module.exports = {
  name: 'admin',
  description: 'Admin commands for user management',
  
  // Command builder
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands for user management')
    .addSubcommand(subcommand =>
      subcommand
        .setName('whitelist')
        .setDescription('Add or remove a user from the whitelist')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to whitelist/unwhitelist')
            .setRequired(true))
        .addBooleanOption(option =>
          option.setName('add')
            .setDescription('Add to whitelist (true) or remove (false)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('admin')
        .setDescription('Add or remove an admin')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to make admin/remove admin')
            .setRequired(true))
        .addBooleanOption(option =>
          option.setName('add')
            .setDescription('Add as admin (true) or remove (false)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('server')
        .setDescription('Configure server settings')
        .addBooleanOption(option =>
          option.setName('require_whitelist')
            .setDescription('Require users to be whitelisted to use the bot')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all whitelisted users and admins')),
  
  // Command execution
  async execute(interaction) {
    // Check if user is an admin
    const isAdmin = await accessControl.isAdmin(interaction.user.id);
    
    if (!isAdmin) {
      await interaction.reply({
        content: 'You do not have permission to use admin commands.',
        ephemeral: true
      });
      return;
    }
    
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'whitelist') {
      await handleWhitelist(interaction);
    } else if (subcommand === 'admin') {
      await handleAdmin(interaction);
    } else if (subcommand === 'server') {
      await handleServer(interaction);
    } else if (subcommand === 'list') {
      await handleList(interaction);
    }
  }
};

// Handle whitelist subcommand
async function handleWhitelist(interaction) {
  const user = interaction.options.getUser('user');
  const add = interaction.options.getBoolean('add');
  
  try {
    if (add) {
      await accessControl.addToWhitelist(user.id);
      await interaction.reply({
        content: `✅ Added ${user.username} to the whitelist.`,
        ephemeral: true
      });
    } else {
      await accessControl.removeFromWhitelist(user.id);
      await interaction.reply({
        content: `✅ Removed ${user.username} from the whitelist.`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error handling whitelist command:', error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    });
  }
}

// Handle admin subcommand
async function handleAdmin(interaction) {
  const user = interaction.options.getUser('user');
  const add = interaction.options.getBoolean('add');
  
  try {
    if (add) {
      await accessControl.addAdmin(user.id);
      await interaction.reply({
        content: `✅ Added ${user.username} as an admin.`,
        ephemeral: true
      });
    } else {
      await accessControl.removeAdmin(user.id);
      await interaction.reply({
        content: `✅ Removed ${user.username} from admins.`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error handling admin command:', error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    });
  }
}

// Handle server subcommand
async function handleServer(interaction) {
  const requireWhitelist = interaction.options.getBoolean('require_whitelist');
  
  try {
    await accessControl.setServerWhitelistRequired(interaction.guildId, requireWhitelist);
    
    await interaction.reply({
      content: requireWhitelist 
        ? '✅ Server now requires users to be whitelisted to use the bot.'
        : '✅ Server now allows all users to use the bot.',
      ephemeral: true
    });
  } catch (error) {
    console.error('Error handling server command:', error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    });
  }
}

// Handle list subcommand
async function handleList(interaction) {
  try {
    const admins = await accessControl.getAdminUsers();
    const whitelisted = await accessControl.getWhitelistedUsers();
    
    const embed = new EmbedBuilder()
      .setTitle('User Access List')
      .setColor(0x0099FF)
      .addFields(
        { name: 'Admins', value: admins.length > 0 ? admins.join('\n') : 'None' },
        { name: 'Whitelisted Users', value: whitelisted.length > 0 ? whitelisted.join('\n') : 'None' }
      )
      .setFooter({ text: 'Sea of Thieves Companion' });
    
    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error handling list command:', error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    });
  }
}

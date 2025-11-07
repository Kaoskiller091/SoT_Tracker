const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows help information'),
  async execute(interaction) {
    await interaction.reply('Here are the available commands:\n- /help: Shows this help message\n- /ping: Checks if the bot is responding');
  },
};

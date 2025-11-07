const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gold')
    .setDescription('Track your Sea of Thieves gold')
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update your current gold amount')
        .addIntegerOption(option => 
          option.setName('amount')
            .setDescription('Your current gold amount')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check your current gold amount')),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'update') {
      const amount = interaction.options.getInteger('amount');
      await interaction.reply(`Gold updated! You now have ${amount.toLocaleString()} gold.`);
    } else if (subcommand === 'check') {
      // In a real implementation, this would fetch from a database
      await interaction.reply('Gold tracking feature coming soon! This will show your saved gold amount.');
    }
  },
};

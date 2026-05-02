const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('./utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View vouches leaderboard'),

  async execute(interaction) {
    const topUsers = db.prepare('SELECT id, vouches FROM users ORDER BY vouches DESC LIMIT 10').all();

    if (topUsers.length === 0) {
      return interaction.reply({ content: '❌ No vouches yet.', flags: MessageFlags.Ephemeral });
    }

    const description = await Promise.all(topUsers.map(async (user, index) => {
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const name = member ? member.user.username : user.id;
      return `**${index + 1}.** ${name} - ${user.vouches} vouches`;
    }));

    const embed = new EmbedBuilder()
      .setTitle('🏆 Vouches Leaderboard')
      .setDescription(description.join('\n'))
      .setColor(0xFEE75C)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('./utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your or another user\'s profile')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(target.id) || { vouches: 0, is_verified: false };

    const tickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE user_id = ?').get(target.id);
    const gens = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND status = ?').get(target.id, 'closed');

    const embed = new EmbedBuilder()
      .setTitle(`📋 Profile: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Vouches', value: `${user.vouches || 0}`, inline: true },
        { name: 'Tickets Created', value: `${tickets.count}`, inline: true },
        { name: 'Accounts Received', value: `${gens.count}`, inline: true },
        { name: 'Verified', value: user.is_verified ? '✅' : '❌', inline: true }
      )
      .setColor(0x5865F2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};

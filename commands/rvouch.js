const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rvouch')
    .setDescription('Remove a vouch from a staff member (Admin only)')
    .addUserOption(option =>
      option.setName('staff')
        .setDescription('Staff member to remove vouch from')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const staff = interaction.options.getUser('staff');

    db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(staff.id);
    db.prepare('UPDATE users SET vouches = MAX(0, vouches - 1) WHERE id = ?').run(staff.id);

    const user = db.prepare('SELECT vouches FROM users WHERE id = ?').get(staff.id);

    const embed = new EmbedBuilder()
      .setTitle('✅ Vouch Removed')
      .setDescription(`Removed 1 vouch from ${staff}\nTotal vouches: **${user.vouches || 0}**`)
      .setColor(0xED4245);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};

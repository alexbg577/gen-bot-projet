const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

const vouchRoles = [
  { vouches: 30, role: process.env.ROLE_TRAINED_MOD },
  { vouches: 60, role: process.env.ROLE_MEGA_DROPER },
  { vouches: 100, role: process.env.ROLE_ADMIN }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Vouch for a staff member (1 hour cooldown)')
    .addUserOption(option =>
      option.setName('staff')
        .setDescription('Staff member to vouch for')
        .setRequired(true)
    ),

  async execute(interaction) {
    const staff = interaction.options.getUser('staff');
    const member = interaction.member;

    if (staff.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot vouch for yourself.', flags: MessageFlags.Ephemeral });
    }

    const staffMember = await interaction.guild.members.fetch(staff.id).catch(() => null);
    if (!staffMember) {
      return interaction.reply({ content: '❌ Staff member not found.', flags: MessageFlags.Ephemeral });
    }

    const staffRoles = [process.env.ROLE_STAFF, process.env.ROLE_TRAINED_MOD, process.env.ROLE_MODERATOR, process.env.ROLE_ADMIN, process.env.ROLE_FOUNDER, process.env.ROLE_HEAD_ADMIN, process.env.ROLE_SUPER_ADMIN];
    if (!staffRoles.some(role => staffMember.roles.cache.has(role))) {
      return interaction.reply({ content: '❌ That user is not a staff member.', flags: MessageFlags.Ephemeral });
    }

    // Check cooldown (1 hour)
    const lastVouch = db.prepare('SELECT timestamp FROM vouch_logs WHERE voucher_id = ? AND staff_id = ? ORDER BY timestamp DESC LIMIT 1')
      .get(interaction.user.id, staff.id);

    if (lastVouch && (Date.now() / 1000 - lastVouch.timestamp) < 3600) {
      const timeLeft = Math.ceil(3600 - (Date.now() / 1000 - lastVouch.timestamp));
      return interaction.reply({ content: `❌ You can vouch again in ${Math.ceil(timeLeft / 60)} minutes.`, flags: MessageFlags.Ephemeral });
    }

    // Add vouch
    db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(staff.id);
    db.prepare('UPDATE users SET vouches = vouches + 1 WHERE id = ?').run(staff.id);
    db.prepare('INSERT INTO vouch_logs (staff_id, voucher_id) VALUES (?, ?)').run(staff.id, interaction.user.id);

    const user = db.prepare('SELECT vouches FROM users WHERE id = ?').get(staff.id);

    // Check for role promotions
    for (const vouchRole of vouchRoles) {
      if (user.vouches >= vouchRole.vouches && !staffMember.roles.cache.has(vouchRole.role)) {
        await staffMember.roles.add(vouchRole.role).catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Vouch Added')
      .setDescription(`${interaction.user} vouched for ${staff}\nTotal vouches: **${user.vouches}**`)
      .setColor(0x57F287);

    await interaction.reply({ embeds: [embed] });
  }
};

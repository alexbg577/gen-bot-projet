const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('./utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rall')
    .setDescription('Remove all roles from a user except mega droper+ (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to remove roles from')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    if (!target) {
      return interaction.reply({ content: '❌ User not found.', flags: MessageFlags.Ephemeral });
    }

    const keepRoles = [
      process.env.ROLE_MEGA_DROPER,
      process.env.ROLE_HEAD_ADMIN,
      process.env.ROLE_SUPER_ADMIN,
      process.env.ROLE_FOUNDER,
      process.env.ROLE_ADMIN
    ];

    const rolesToRemove = target.roles.cache.filter(role => !keepRoles.includes(role.id) && role.id !== interaction.guild.id);

    for (const [id, role] of rolesToRemove) {
      await target.roles.remove(role).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Roles Removed')
      .setDescription(`Removed all roles from ${target} except mega droper+`)
      .setColor(0x57F287);

    await interaction.reply({ embeds: [embed] });
  }
};

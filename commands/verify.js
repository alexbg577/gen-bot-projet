const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('./utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Send verification menu (Founder only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(process.env.ROLE_FOUNDER)) {
      return interaction.reply({ content: '❌ Only founders can use this command.', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setTitle('Welcome to the server!')
      .setDescription('To gain access, you need to pass a quick verification.\n\nClick the button below and answer the question to get verified.')
      .setColor(0x5865F2);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verify_start')
          .setLabel('Verify')
          .setStyle(ButtonStyle.Success)
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};

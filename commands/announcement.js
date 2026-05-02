const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Send an announcement (Staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('announcement_modal')
      .setTitle('Create Announcement');

    const titleInput = new TextInputBuilder()
      .setCustomId('announcement_title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('announcement_desc')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput)
    );

    await interaction.showModal(modal);
  }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('./utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close a ticket (Staff only)')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for closing')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: '❌ This is not a ticket channel.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    db.prepare('UPDATE tickets SET status = ?, closed_at = ?, staff_claimed = ? WHERE id = ?')
      .run('closed', Math.floor(Date.now() / 1000), interaction.user.id, ticket.id);

    const embed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`Closed by: ${interaction.user}\nReason: ${reason}`)
      .setColor(0xED4245);

    await interaction.reply({ embeds: [embed] });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
};

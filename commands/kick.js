const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user (Admin/Mod only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member || !member.kickable) {
      return interaction.reply({ content: '❌ I cannot kick this user.', flags: MessageFlags.Ephemeral });
    }

    await member.kick(reason);
    const embed = new EmbedBuilder()
      .setTitle('👢 User Kicked')
      .setDescription(`${member} has been kicked.\nReason: ${reason}`)
      .setColor(0xED4245);

    await interaction.reply({ embeds: [embed] });

    const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) logChannel.send({ embeds: [embed.setFooter({ text: `By ${interaction.user.username}` })] });
  }
};

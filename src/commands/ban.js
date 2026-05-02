const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user (Admin/Mod only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for ban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.options.getMember('user');

    if (member && !member.bannable) {
      return interaction.reply({ content: '❌ I cannot ban this user.', flags: MessageFlags.Ephemeral });
    }

    await interaction.guild.bans.create(user.id, { reason });
    const embed = new EmbedBuilder()
      .setTitle('🔨 User Banned')
      .setDescription(`${user} has been banned.\nReason: ${reason}`)
      .setColor(0xED4245);

    await interaction.reply({ embeds: [embed] });

    // Log
    const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) logChannel.send({ embeds: [embed.setFooter({ text: `By ${interaction.user.username}` })] });
  }
};

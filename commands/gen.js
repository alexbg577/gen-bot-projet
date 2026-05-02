const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } = require('discord.js');
const db = require('../utils/database');

const genChannels = {
  [process.env.FREE_GEN_CHANNEL_ID]: { tier: 'free', role: process.env.ROLE_BASIC_GEN },
  [process.env.PREMIUM_GEN_CHANNEL_ID]: { tier: 'premium', role: process.env.ROLE_PREMIUM_GEN },
  [process.env.BOOSTER_GEN_CHANNEL_ID]: { tier: 'booster', role: process.env.ROLE_BOOSTER_GEN },
  [process.env.EXTREME_GEN_CHANNEL_ID]: { tier: 'extreme', role: process.env.ROLE_EXTREME_GEN }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gen')
    .setDescription('Generate an account for a service')
    .addStringOption(option =>
      option.setName('service')
        .setDescription('Service name (e.g. Netflix, YouTube)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const channelConfig = genChannels[interaction.channel.id];
    if (!channelConfig) {
      return interaction.reply({ content: '❌ This command can only be used in gen channels.', flags: MessageFlags.Ephemeral });
    }

    const hasRole = interaction.member.roles.cache.has(channelConfig.role);
    if (!hasRole) {
      return interaction.reply({ content: '❌ You don\'t have permission to gen in this channel.', flags: MessageFlags.Ephemeral });
    }

    const service = interaction.options.getString('service');
    const tier = channelConfig.tier;

    // Check stock
    const account = db.prepare('SELECT * FROM stock WHERE tier = ? AND service LIKE ? AND claimed_by IS NULL LIMIT 1')
      .get(tier, `%${service}%`);

    if (!account) {
      return interaction.reply({ content: `❌ No ${service} accounts available in ${tier} stock.`, flags: MessageFlags.Ephemeral });
    }

    // Create ticket
    const ticketChannel = await interaction.guild.channels.create({
      name: `gen-${interaction.user.username}-${service}`,
      type: ChannelType.GuildText,
      parent: interaction.channel.parent,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: process.env.ROLE_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: process.env.ROLE_TRAINED_MOD, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: process.env.ROLE_MODERATOR, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: process.env.ROLE_ADMIN, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: process.env.ROLE_FOUNDER, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    db.prepare('INSERT INTO tickets (channel_id, user_id, service, tier, status) VALUES (?, ?, ?, ?, ?)')
      .run(ticketChannel.id, interaction.user.id, service, tier, 'open');

    const embed = new EmbedBuilder()
      .setTitle('🎫 Gen Ticket')
      .setDescription(`Service: **${service}**\nTier: **${tier}**\nUser: ${interaction.user}\n\nWaiting for staff to deliver the account.`)
      .setColor(0xFEE75C);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`deliver_${ticketChannel.id}`)
          .setLabel('Deliver Account')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`close_ticket_${ticketChannel.id}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

    await ticketChannel.send({ content: `<@&${process.env.ROLE_STAFF}> New gen request!`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, flags: MessageFlags.Ephemeral });
  }
};

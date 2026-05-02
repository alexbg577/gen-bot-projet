const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const cron = require('node-cron');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway (Staff only)')
    .addStringOption(option =>
      option.setName('prize')
        .setDescription('Prize to give away')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('winners')
        .setDescription('Number of winners')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getInteger('duration');
    const winnerCount = interaction.options.getInteger('winners') || 1;

    const endTime = Math.floor(Date.now() / 1000) + (duration * 60);

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY!')
      .setDescription(`Prize: **${prize}**\n\nEnds: <t:${endTime}:R>\nWinners: **${winnerCount}**\n\nClick the button below to enter!`)
      .setColor(0xFEE75C)
      .setFooter({ text: `Hosted by ${interaction.user.username}` });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_enter_${Date.now()}`)
          .setLabel('Enter Giveaway')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

    const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

    db.prepare('INSERT INTO giveaways (prize, end_time, winner_count, created_by, channel_id, message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(prize, endTime, winnerCount, interaction.user.id, interaction.channel.id, msg.id, 'active');

    await interaction.reply({ content: '✅ Giveaway started!', flags: MessageFlags.Ephemeral });

    // Schedule end
    setTimeout(async () => {
      const giveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(msg.id);
      if (!giveaway || giveaway.status !== 'active') return;

      const entries = JSON.parse(giveaway.entries || '[]');
      if (entries.length === 0) {
        const endEmbed = EmbedBuilder.from(embed)
          .setTitle('🎉 GIVEAWAY ENDED!')
          .setDescription(`Prize: **${prize}**\n\nNo valid entries. Giveaway cancelled.`)
          .setColor(0xED4245);
        msg.edit({ embeds: [endEmbed], components: [] });
        return;
      }

      const winners = [];
      const available = [...entries];
      for (let i = 0; i < Math.min(winnerCount, available.length); i++) {
        const idx = Math.floor(Math.random() * available.length);
        winners.push(available.splice(idx, 1)[0]);
      }

      const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
      const endEmbed = EmbedBuilder.from(embed)
        .setTitle('🎉 GIVEAWAY ENDED!')
        .setDescription(`Prize: **${prize}**\n\nWinners: ${winnerMentions}`)
        .setColor(0x57F287);
      msg.edit({ embeds: [endEmbed], components: [] });

      db.prepare('UPDATE giveaways SET status = ? WHERE id = ?').run('ended', giveaway.id);
    }, duration * 60 * 1000);
  }
};

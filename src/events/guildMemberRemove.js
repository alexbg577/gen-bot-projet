const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (member.guild.id !== process.env.GUILD_ID) return;

    const logChannel = await member.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📤 Member Left')
        .setDescription(`${member} (${member.user.tag})`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor(0xED4245)
        .setTimestamp();
      logChannel.send({ embeds: [embed] });
    }
  }
};

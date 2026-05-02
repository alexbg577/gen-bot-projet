const { Events, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (member.guild.id !== process.env.GUILD_ID) return;

    // Add unverified role
    await member.roles.add(process.env.ROLE_UNVERIFIED).catch(() => {});

    // Log
    const logChannel = await member.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📥 Member Joined')
        .setDescription(`${member} (${member.user.tag})`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor(0x57F287)
        .setTimestamp();
      logChannel.send({ embeds: [embed] });
    }

    db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(member.id);
  }
};

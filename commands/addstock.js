const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('./utils/database');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addstock')
    .setDescription('Add accounts to stock (Staff only)')
    .addStringOption(option =>
      option.setName('tier')
        .setDescription('Stock tier')
        .setRequired(true)
        .addChoices(
          { name: 'Free', value: 'free' },
          { name: 'Premium', value: 'premium' },
          { name: 'Booster', value: 'booster' },
          { name: 'Extreme', value: 'extreme' }
        )
    )
    .addStringOption(option =>
      option.setName('service')
        .setDescription('Service name')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('file')
        .setDescription('TXT or ZIP file with credentials')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tier = interaction.options.getString('tier');
    const service = interaction.options.getString('service');
    const attachment = interaction.options.getAttachment('file');

    if (!attachment.url.endsWith('.txt') && !attachment.url.endsWith('.zip')) {
      return interaction.editReply({ content: '❌ File must be .txt or .zip' });
    }

    const response = await fetch(attachment.url);
    const buffer = await response.buffer();
    const tempPath = path.join(__dirname, '../../data', `temp_${Date.now()}_${attachment.name}`);

    fs.writeFileSync(tempPath, buffer);

    let credentials = [];

    if (attachment.name.endsWith('.zip')) {
      const zip = new AdmZip(tempPath);
      const zipEntries = zip.getEntries();
      for (const entry of zipEntries) {
        if (!entry.isDirectory && (entry.entryName.endsWith('.txt') || entry.entryName.endsWith('.csv'))) {
          const content = entry.getData().toString('utf8');
          credentials.push(...content.split('\n').map(l => l.trim()).filter(l => l));
        }
      }
    } else {
      credentials = fs.readFileSync(tempPath, 'utf8').split('\n').map(l => l.trim()).filter(l => l);
    }

    const stmt = db.prepare('INSERT INTO stock (tier, service, credentials, added_by) VALUES (?, ?, ?, ?)');
    for (const cred of credentials) {
      stmt.run(tier, service, cred, interaction.user.id);
    }

    fs.unlinkSync(tempPath);

    const embed = new EmbedBuilder()
      .setTitle('✅ Stock Added')
      .setDescription(`Added **${credentials.length}** accounts to **${service}** (${tier})`)
      .setColor(0x57F287);

    await interaction.editReply({ embeds: [embed] });

    // Log
    const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      logChannel.send({ embeds: [embed.setFooter({ text: `By ${interaction.user.username}` })] });
    }
  }
};

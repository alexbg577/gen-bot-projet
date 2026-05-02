const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Create and send database backup (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const dbPath = process.env.DATABASE_PATH || './data/raizen_gen.db';
    const backupName = `backup_${Date.now()}.db`;
    const backupPath = path.join(__dirname, '../../data', backupName);

    fs.copyFileSync(dbPath, backupPath);

    db.prepare('INSERT INTO backups (data, created_by) VALUES (?, ?)').run(backupName, interaction.user.id);

    await interaction.editReply({ content: '✅ Backup created!', files: [backupPath] });

    setTimeout(() => fs.unlinkSync(backupPath), 5000);
  }
};

const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ Error executing command.', flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Verification start
      if (customId === 'verify_start') {
        const modal = new ModalBuilder()
          .setCustomId('verify_modal')
          .setTitle('Verification');

        const answerInput = new TextInputBuilder()
          .setCustomId('verify_answer')
          .setLabel('What is 2 + 2?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(answerInput));
        return interaction.showModal(modal);
      }

      // Verification submit
      if (interaction.isModalSubmit() && customId === 'verify_modal') {
        const answer = interaction.fields.getTextInputValue('verify_answer');
        if (answer.trim() === process.env.VERIFICATION_ANSWER) {
          const member = interaction.member;
          await member.roles.add(process.env.ROLE_VERIFIED).catch(() => {});
          await member.roles.remove(process.env.ROLE_UNVERIFIED).catch(() => {});
          db.prepare('INSERT OR IGNORE INTO users (id, is_verified) VALUES (?, ?)').run(member.id, 1);
          db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(member.id);

          const embed = new EmbedBuilder()
            .setTitle('✅ Verified!')
            .setDescription('You are now verified!')
            .setColor(0x57F287);

          return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else {
          return interaction.reply({ content: '❌ Wrong answer. Try again.', flags: MessageFlags.Ephemeral });
        }
      }

      // Deliver account
      if (customId.startsWith('deliver_')) {
        const ticketChannelId = customId.replace('deliver_', '');
        const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(ticketChannelId);
        if (!ticket) return;

        const modal = new ModalBuilder()
          .setCustomId(`deliver_modal_${ticketChannelId}`)
          .setTitle('Deliver Account');

        const credInput = new TextInputBuilder()
          .setCustomId('account_credentials')
          .setLabel('Email:Password or credentials')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(credInput));
        return interaction.showModal(modal);
      }

      // Close ticket button
      if (customId.startsWith('close_ticket_')) {
        const ticketChannelId = customId.replace('close_ticket_', '');
        const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(ticketChannelId);
        if (!ticket) return;

        db.prepare('UPDATE tickets SET status = ?, closed_at = ?, staff_claimed = ? WHERE id = ?')
          .run('closed', Math.floor(Date.now() / 1000), interaction.user.id, ticket.id);

        // Give vouch to staff
        db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(interaction.user.id);
        db.prepare('UPDATE users SET vouches = vouches + 1 WHERE id = ?').run(interaction.user.id);

        const embed = new EmbedBuilder()
          .setTitle('🔒 Ticket Closed')
          .setDescription(`Closed by ${interaction.user}`)
          .setColor(0xED4245);

        await interaction.reply({ embeds: [embed] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Modal submissions
    if (interaction.isModalSubmit()) {
      // Deliver account modal
      if (interaction.customId.startsWith('deliver_modal_')) {
        const ticketChannelId = interaction.customId.replace('deliver_modal_', '');
        const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(ticketChannelId);
        if (!ticket) return;

        const credentials = interaction.fields.getTextInputValue('account_credentials');

        // Update ticket
        db.prepare('UPDATE tickets SET status = ?, staff_claimed = ?, account_given = ?, closed_at = ? WHERE id = ?')
          .run('delivered', interaction.user.id, credentials, Math.floor(Date.now() / 1000), ticket.id);

        // Remove from stock
        db.prepare('UPDATE stock SET claimed_by = ?, claimed_at = ? WHERE id = (SELECT id FROM stock WHERE tier = ? AND service LIKE ? AND claimed_by IS NULL LIMIT 1)')
          .run(interaction.user.id, Math.floor(Date.now() / 1000), ticket.tier, `%${ticket.service}%`);

        // Send to user
        const user = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);
        if (user) {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🎉 Account Delivered!')
            .setDescription(`Service: **${ticket.service}**\nTier: **${ticket.tier}**\n\n**Credentials:**\n${credentials}`)
            .setColor(0x57F287);
          user.send({ embeds: [dmEmbed] }).catch(() => {});
        }

        // Give vouch to staff
        db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(interaction.user.id);
        db.prepare('UPDATE users SET vouches = vouches + 1 WHERE id = ?').run(interaction.user.id);

        const embed = new EmbedBuilder()
          .setTitle('✅ Account Delivered')
          .setDescription(`Delivered by ${interaction.user}\nCredentials sent to ${user || 'user'}`)
          .setColor(0x57F287);

        await interaction.reply({ embeds: [embed] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }

      // Announcement modal
      if (interaction.customId === 'announcement_modal') {
        const title = interaction.fields.getTextInputValue('announcement_title');
        const desc = interaction.fields.getTextInputValue('announcement_desc');

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(desc)
          .setColor(0x5865F2)
          .setFooter({ text: `Announcement by ${interaction.user.username}` })
          .setTimestamp();

        await interaction.reply({ content: '✅ Announcement sent!', flags: MessageFlags.Ephemeral });
        await interaction.channel.send({ embeds: [embed] });
        return;
      }
    }
  }
};

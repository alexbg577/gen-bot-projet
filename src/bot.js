require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const cron = require('node-cron');
const db = require('./utils/database');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command.data) {
    client.commands.set(command.data.name, command);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Stock update every 2 hours
cron.schedule('0 */2 * * *', async () => {
  await sendStockUpdate(client);
});

async function sendStockUpdate(client) {
  const stockChannel = await client.channels.fetch(process.env.STOCK_LOGS_CHANNEL_ID);
  if (!stockChannel) return;

  const tiers = ['free', 'premium', 'booster', 'extreme'];
  const embed = new EmbedBuilder()
    .setTitle('📦 Stock Update')
    .setColor(0x5865F2)
    .setTimestamp();

  for (const tier of tiers) {
    const stocks = db.prepare('SELECT service, COUNT(*) as count FROM stock WHERE tier = ? AND claimed_by IS NULL GROUP BY service').all(tier);
    if (stocks.length > 0) {
      const stockList = stocks.map(s => `**${s.service}**: ${s.count} available`).join('\n');
      embed.addFields({ name: `${tier.toUpperCase()} Stock`, value: stockList || 'Empty', inline: false });
    } else {
      embed.addFields({ name: `${tier.toUpperCase()} Stock`, value: 'Empty', inline: false });
    }
  }

  await stockChannel.send({ embeds: [embed] });
}

// Check member status for free gen access
async function checkFreeGenAccess(member) {
  const requiredInvite = process.env.REQUIRED_SERVER_INVITE;
  try {
    const presence = await member.fetch(true).catch(() => null);
    if (!presence || !presence.presence) return false;
    const activities = presence.presence.activities;
    return activities.some(activity =>
      activity.type === 4 && activity.state && activity.state.includes('discord.gg/PPdYTSFuby')
    );
  } catch {
    return false;
  }
}

// Monitor presence updates for free gen role
client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
  if (!newPresence?.member || newPresence.guild.id !== process.env.GUILD_ID) return;

  const member = newPresence.member;
  const basicGenRole = process.env.ROLE_BASIC_GEN;
  const hasRole = member.roles.cache.has(basicGenRole);
  const hasAccess = await checkFreeGenAccess(member);

  if (hasAccess && !hasRole) {
    await member.roles.add(basicGenRole).catch(() => {});
  } else if (!hasAccess && hasRole) {
    await member.roles.remove(basicGenRole).catch(() => {});
  }
});

client.once(Events.ClientReady, () => {
  console.log(`✅ ${client.user.tag} is online!`);
});

client.login(process.env.DISCORD_TOKEN);

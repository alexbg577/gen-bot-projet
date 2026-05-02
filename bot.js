require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const cron = require('node-cron');
const db = require('./utils/database');
const fs = require('fs');
const path = require('path');

// Start web server
try {
  const webApp = require('./web/app');
} catch (err) {
  console.log('Web server not started:', err.message);
}

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
  const stockChannel = await client.channels.fetch(process.env.STOCK_LOGS_CHANNEL_ID).catch(() => null);
  if (!stockChannel) return;

  const tiers = ['free', 'premium', 'booster', 'extreme'];
  const embed = new EmbedBuilder()
    .setTitle('📦 Stock Update')
    .setColor(0x5865F2)
    .setTimestamp();

  for (const tier of tiers) {
    const stocks = db.all('SELECT service, COUNT(*) as count FROM stock WHERE tier = ? AND claimed_by IS NULL GROUP BY service', [tier]);
    if (stocks.length > 0) {
      const stockList = stocks.map(s => `**${s.service}**: ${s.count} available`).join('\n');
      embed.addFields({ name: `${tier.toUpperCase()} Stock`, value: stockList || 'Empty', inline: false });
    } else {
      embed.addFields({ name: `${tier.toUpperCase()} Stock`, value: 'Empty', inline: false });
    }
  }

  stockChannel.send({ embeds: [embed] }).catch(() => {});
}

// Check member status for free gen access
async function checkFreeGenAccess(member) {
  try {
    await member.fetch();
    if (!member.presence) return false;
    return member.presence.activities.some(activity =>
      activity.type === 4 && activity.state && activity.state.includes('discord.gg/PPdYTSFuby')
    );
  } catch {
    return false;
  }
}

// Monitor presence updates for free gen role
client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
  if (!newPresence?.member || newPresence.guild?.id !== process.env.GUILD_ID) return;

  const member = newPresence.member;
  const basicGenRole = process.env.ROLE_BASIC_GEN;
  if (!basicGenRole) return;

  const hasRole = member.roles.cache.has(basicGenRole);
  const hasAccess = await checkFreeGenAccess(member);

  if (hasAccess && !hasRole) {
    await member.roles.add(basicGenRole).catch(() => {});
  } else if (!hasAccess && hasRole) {
    await member.roles.remove(basicGenRole).catch(() => {});
  }
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ ${client.user.tag} is online!`);

  // Deploy slash commands on startup
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if (command.data) {
        commands.push(command.data.toJSON());
      }
    }

    console.log(`Deploying ${commands.length} commands...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log(`✅ Successfully deployed ${commands.length} commands!`);
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);

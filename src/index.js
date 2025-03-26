const { Client, GatewayIntentBits, Events } = require('discord.js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const registerCommands = require('./commands/registerCommands');
const { loadData } = require('./data/embedData');
const { loadMonitors, getMonitorUpdateIntervalMs } = require('./data/monitorData');
const handleInteraction = require('./events/interactionCreate');
const handleReady = require('./events/ready');
const { updateCombinedMonitorMessage } = require('./utils/battlemetricsUtils');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const battlemetricsToken = process.env.BATTLEMETRICS_TOKEN;

if (!token) { console.error('❌ Error: TOKEN not found in .env!'); process.exit(1); }
if (!clientId) { console.error('❌ Error: CLIENT_ID not found in .env!'); process.exit(1); }
if (!guildId) { console.error('❌ Error: GUILD_ID not found in .env!'); process.exit(1); }
if (!battlemetricsToken) { console.warn('⚠️ Warning: BATTLEMETRICS_TOKEN not found. Monitoring will not work.'); }

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

loadData();
loadMonitors();

registerCommands(token, clientId, guildId);

client.once(Events.ClientReady, readyClient => {
    handleReady(readyClient, updateCombinedMonitorMessage, getMonitorUpdateIntervalMs);
});

client.on(Events.InteractionCreate, async interaction => {
    await handleInteraction(interaction, client);
});

process.on('unhandledRejection', e => console.error('❌ Unhandled Rejection:', e));
process.on('uncaughtException', e => console.error('❌ Uncaught Exception:', e));

client.login(token);
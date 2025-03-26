const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const path = require('path');

const setServerInfoCommand = new SlashCommandBuilder()
    .setName('setserverinfo')
    .setDescription('Create/update the main embed with server info')
    .addStringOption(o => o.setName('servername').setDescription('Name').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('HEX color').setRequired(true))
    .addStringOption(o => o.setName('ipaddress').setDescription('IP:PORT').setRequired(true))
    .addStringOption(o => o.setName('wipe_day').setDescription('Wipe day').addChoices(
        { name: 'Monday', value: 'Monday' }, { name: 'Tuesday', value: 'Tuesday' }, { name: 'Wednesday', value: 'Wednesday' },
        { name: 'Thursday', value: 'Thursday' }, { name: 'Friday', value: 'Friday' }, { name: 'Saturday', value: 'Saturday' },
        { name: 'Sunday', value: 'Sunday' }
    ).setRequired(true))
    .addStringOption(o => o.setName('wipe_time').setDescription('Wipe time (HH:MM)').setRequired(true))
    .addStringOption(o => o.setName('restart_time').setDescription('Restart time (HH:MM)').setRequired(true))
    .addStringOption(o => o.setName('mode').setDescription('Mode').addChoices(
        { name: 'Vanilla', value: 'Vanilla' }, { name: 'Modded', value: 'Modded' }, { name: 'Survival', value: 'Survival' },
        { name: 'Softcore', value: 'Softcore' }, { name: 'Hardcore', value: 'HardCore' }, { name: 'Primitive', value: 'Primitive' }
    ).setRequired(true))
    .addStringOption(o => o.setName('teamlimit').setDescription('Limit').addChoices(
        { name: 'Solo', value: 'Solo' }, { name: 'Duo', value: 'Duo' }, { name: 'Trio', value: 'Trio' },
        { name: 'Squad', value: 'Squad' }, { name: 'NoLimit', value: 'NoLimit' }
    ).setRequired(true))
    .addStringOption(o => o.setName('map').setDescription('Map').addChoices(
        { name: 'Procedural', value: 'Procedural' }, { name: 'Barren', value: 'Barren' }, { name: 'Custom', value: 'Custom' },
        { name: 'Hapis', value: 'Hapis Island' }, { name: 'Savas', value: 'Savas Island' }
    ).setRequired(true))
    .addStringOption(o => o.setName('iconurl').setDescription('Icon URL').setRequired(false));

const addEmbedCommand = new SlashCommandBuilder()
    .setName('addembed')
    .setDescription('Add an embed with server info')
    .addStringOption(o => o.setName('servername').setDescription('Name').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('HEX color').setRequired(true))
    .addStringOption(o => o.setName('ipaddress').setDescription('IP:PORT').setRequired(true))
    .addStringOption(o => o.setName('wipe_day').setDescription('Wipe day').addChoices(
        { name: 'Monday', value: 'Monday' }, { name: 'Tuesday', value: 'Tuesday' }, { name: 'Wednesday', value: 'Wednesday' },
        { name: 'Thursday', value: 'Thursday' }, { name: 'Friday', value: 'Friday' }, { name: 'Saturday', value: 'Saturday' },
        { name: 'Sunday', value: 'Sunday' }
    ).setRequired(true))
    .addStringOption(o => o.setName('wipe_time').setDescription('Wipe time (HH:MM)').setRequired(true))
    .addStringOption(o => o.setName('restart_time').setDescription('Restart time (HH:MM)').setRequired(true))
    .addStringOption(o => o.setName('mode').setDescription('Mode').addChoices(
        { name: 'Vanilla', value: 'Vanilla' }, { name: 'Modded', value: 'Modded' }, { name: 'Survival', value: 'Survival' },
        { name: 'Softcore', value: 'Softcore' }, { name: 'Hardcore', value: 'HardCore' }, { name: 'Primitive', value: 'Primitive' }
    ).setRequired(true))
    .addStringOption(o => o.setName('teamlimit').setDescription('Limit').addChoices(
        { name: 'Solo', value: 'Solo' }, { name: 'Duo', value: 'Duo' }, { name: 'Trio', value: 'Trio' },
        { name: 'Squad', value: 'Squad' }, { name: 'NoLimit', value: 'NoLimit' }
    ).setRequired(true))
    .addStringOption(o => o.setName('map').setDescription('Map').addChoices(
        { name: 'Procedural', value: 'Procedural' }, { name: 'Barren', value: 'Barren' }, { name: 'Custom', value: 'Custom' },
        { name: 'Hapis', value: 'Hapis Island' }, { name: 'Savas', value: 'Savas Island' }
    ).setRequired(true))
    .addStringOption(o => o.setName('iconurl').setDescription('Icon URL').setRequired(false));

const removeEmbedCommand = new SlashCommandBuilder()
    .setName('removeembed')
    .setDescription('Remove an embed by its number')
    .addIntegerOption(o => o.setName('index').setDescription('Embed number').setRequired(true).setMinValue(1));

const rustMonitorCommand = new SlashCommandBuilder()
    .setName('setrustmonitor')
    .setDescription('Add/update a server in monitoring (BM)')
    .addStringOption(o => o.setName('bmid').setDescription('Server ID on BattleMetrics').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('Embed HEX color (6 chars, e.g., FF0000). Empty = auto').setRequired(false));

const stopRustMonitorCommand = new SlashCommandBuilder()
    .setName('stoprustmonitor')
    .setDescription('Remove a server from monitoring (BM)')
    .addStringOption(o => o.setName('bmid').setDescription('BattleMetrics server ID to remove').setRequired(true));

const allCommands = [
    setServerInfoCommand, addEmbedCommand, removeEmbedCommand,
    rustMonitorCommand, stopRustMonitorCommand
];

module.exports = async (token, clientId, guildId) => {
    const rest = new REST({ version: '10' }).setToken(token);
    try {
        console.log(`[API] 🔧 Registering ${allCommands.length} commands for guild ${guildId}...`);
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: allCommands.map(c => c.toJSON()) }
        );
        console.log(`[API] ✅ Commands successfully registered.`);
    } catch (error) {
        console.error('[API] ❌ Error registering commands:', error);
    }
};
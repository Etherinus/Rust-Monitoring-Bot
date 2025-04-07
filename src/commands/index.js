const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger').child({ service: 'CommandLoader' });
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../config');

function loadCommands(client, services) {
    client.commands = new Collection();
    const commandsPath = path.join(__dirname);
    const commandFiles = getAllCommandFiles(commandsPath);

    for (const file of commandFiles) {
        try {
            const command = require(file);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, {...command, execute: (interaction) => command.execute(interaction, services)});
                logger.debug(`Loaded command: ${command.data.name}`);
            } else {
                logger.warn(`Command file ${file} is missing 'data' or 'execute' export.`);
            }
        } catch (error) {
            logger.error(`Failed to load command from ${file}: ${error.message}`, { stack: error.stack });
        }
    }
    logger.info(`✅ Loaded ${client.commands.size} commands.`);
}

function getAllCommandFiles(dirPath) {
    let files = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
            files = files.concat(getAllCommandFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith('.js') && item.name !== 'index.js') {
            files.push(fullPath);
        }
    }
    return files;
}

async function registerCommands(client) {
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    const commandsData = client.commands.map(cmd => cmd.data.toJSON());

    if (commandsData.length === 0) {
        logger.warn('No commands found to register.');
        return;
    }

    try {
        logger.info(`[API] Registering ${commandsData.length} application commands for guild ${config.discord.guildId}...`);
        await rest.put(
            Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
            { body: commandsData },
        );
        logger.info('[API] ✅ Successfully registered application commands.');
    } catch (error) {
        logger.error('[API] ❌ Failed to register application commands:', { error: error.message, stack: error.stack });
        if (error.rawError?.errors) {
            logger.error('[API] Discord API Errors:', JSON.stringify(error.rawError.errors, null, 2));
        }
    }
}

module.exports = { loadCommands, registerCommands };
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { loadCommands, registerCommands } = require('./commands');
const { loadEvents } = require('./events');

const embedDataService = require('./services/EmbedDataService');
const monitorDataService = require('./services/MonitorDataService');
const MonitoringService = require('./services/MonitoringService');

logger.info('Starting bot application...');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ]
});

const services = {
    embedDataService,
    monitorDataService,
    monitoringService: new MonitoringService(client),
    config,
    logger,
};

async function initializeDataServices() {
    logger.info('Initializing data services...');
    try {
        await embedDataService.initialize();
        await monitorDataService.initialize();
        logger.info('✅ Data services initialized successfully.');
    } catch (error) {
        logger.error(`❌ Critical error during data service initialization: ${error.message}`, { stack: error.stack });
        logger.error('Bot may not function correctly without data services. Shutting down.');
        process.exit(1);
    }
}

async function startBot() {
    try {
        await initializeDataServices();

        loadCommands(client, services);
        loadEvents(client, services);

        await registerCommands(client);

        logger.info('Logging in to Discord...');
        await client.login(config.discord.token);

    } catch (error) {
        logger.error(`❌ Fatal error during bot startup: ${error.message}`, { stack: error.stack });
        process.exit(1);
    }
}

startBot();

module.exports = { client, services };
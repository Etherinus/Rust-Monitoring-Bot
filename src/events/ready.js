const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger').child({ service: 'ReadyHandler' });
const { registerCommands } = require('../commands');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client, { monitoringService }) {
        logger.info(`✅ Bot ${client.user.tag} is ready!`);
        logger.info(`Operating in guild: ${client.guilds.cache.first()?.name} (${client.guilds.cache.first()?.id})`);

        try {
            client.user.setActivity('Creator: Etherinus', { type: ActivityType.Watching });
            logger.info('Bot activity set.');
        } catch (error) {
            logger.error('❌ Could not set bot activity:', error);
        }

        await registerCommands(client);

        monitoringService.start();
    }
};
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger').child({ service: 'EventHandler' });

function loadEvents(client, services) {
    const eventsPath = path.join(__dirname);
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js') && file !== 'index.js');
    let count = 0;

    for (const file of eventFiles) {
        try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);

            if (event.name && event.execute) {
                const eventExecutor = (...args) => event.execute(...args, services);

                if (event.once) {
                    client.once(event.name, eventExecutor);
                } else {
                    client.on(event.name, eventExecutor);
                }
                logger.debug(`Loaded event handler: ${event.name} (${event.once ? 'once' : 'on'})`);
                count++;
            } else {
                logger.warn(`Event file ${file} is missing 'name' or 'execute' export.`);
            }
        } catch (error) {
            logger.error(`Failed to load event handler from ${file}: ${error.message}`, { stack: error.stack });
        }
    }
    logger.info(`✅ Loaded ${count} event handlers.`);
}

module.exports = { loadEvents };
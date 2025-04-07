const dotenv = require('dotenv');
const path = require('path');
const { ConfigError } = require('../errors/AppError');
const logger = require('../utils/logger').child({ service: 'ConfigLoader' });

const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    logger.warn(`Failed to load .env file from ${envPath}: ${result.error.message}. Trying default location.`);
    dotenv.config();
}

const requiredEnvVars = ['TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const optionalEnvVars = ['BATTLEMETRICS_TOKEN', 'LOG_LEVEL'];

const config = {
    discord: {
        token: process.env.TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID,
    },
    battlemetrics: {
        token: process.env.BATTLEMETRICS_TOKEN || null,
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
    paths: {
        data: process.env.DATA_PATH || path.resolve(__dirname, '../../data'),
        embedsData: process.env.EMBEDS_DATA_FILE || 'embedsData.json',
        monitorData: process.env.MONITOR_DATA_FILE || 'monitors_combined_v1.json',
    },
    monitoring: {
        updateIntervalMinutes: parseInt(process.env.MONITOR_INTERVAL_MINUTES || '1', 10),
        requestDelayMs: parseInt(process.env.BM_REQUEST_DELAY_MS || '600', 10),
        initialUpdateDelayMs: parseInt(process.env.MONITOR_INITIAL_DELAY_MS || '10000', 10),
    },
    defaults: {
        embedIconUrl: process.env.DEFAULT_EMBED_ICON || 'https://cdn-icons-png.flaticon.com/512/5968/5968866.png',
        onlineColor: '#242429',
        offlineColor: '#242429',
    },
};

requiredEnvVars.forEach(key => {
    const value = key.split('.').reduce((o, i) => o?.[i], config);
     if (!process.env[key]) {
        throw new ConfigError(`❌ Critical: Required environment variable ${key} is missing!`);
    }
});

if (!config.battlemetrics.token) {
    logger.warn('⚠️ BATTLEMETRICS_TOKEN is not set. Monitoring features will be disabled.');
}

config.paths.embedsDataFile = path.join(config.paths.data, config.paths.embedsData);
config.paths.monitorDataFile = path.join(config.paths.data, config.paths.monitorData);

logger.info('✅ Configuration loaded successfully.');
if (config.battlemetrics.token) {
    logger.info(`BattleMetrics monitoring enabled. Update interval: ${config.monitoring.updateIntervalMinutes} min.`);
}

module.exports = config;
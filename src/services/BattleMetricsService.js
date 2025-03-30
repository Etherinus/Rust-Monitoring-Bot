const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const logger = require('../utils/logger').child({ service: 'BattleMetricsService' });
const config = require('../config');
const { AppError } = require('../errors/AppError');
const { formatDescription } = require('../utils/textUtils');

class BattleMetricsService {
    constructor(apiToken) {
        if (!apiToken) {
            logger.warn('BattleMetricsService initialized without an API token. API calls will fail.');
        }
        this.apiToken = apiToken;
        this.baseUrl = 'https://api.battlemetrics.com';
    }

    async getServerStatus(serverId) {
        if (!this.apiToken) {
            logger.error(`Cannot fetch server ${serverId}: API token is missing.`);
            return this._createErrorStatus(serverId, 'API Token Missing');
        }

        const url = `${this.baseUrl}/servers/${serverId}?include=serverDescription`;
        const headers = { 'Authorization': `Bearer ${this.apiToken}` };

        try {
            const response = await fetch(url, {
                headers,
                timeout: 15000
            });

            if (!response.ok) {
                let errorBody = `Status: ${response.status} ${response.statusText}`;
                try {
                    const errorJson = await response.json();
                    errorBody += `. Response: ${JSON.stringify(errorJson)}`;
                } catch {
                }
                logger.error(`HTTP error fetching server ${serverId}: ${errorBody}`);
                return this._createErrorStatus(serverId, `API Error ${response.status}`);
            }

            const json = await response.json();
            if (!json?.data?.attributes) {
                logger.error(`Invalid response structure for server ${serverId}: Missing data.attributes`);
                return this._createErrorStatus(serverId, 'Invalid API Response');
            }

            const attributes = json.data.attributes;
            const rawDescription = json.included?.find(item => item.type === 'serverDescription')?.attributes?.description;

            const status = {
                serverId: String(attributes.id || serverId),
                serverName: attributes.name || `Server ${serverId}`,
                isOnline: attributes.status === 'online',
                players: attributes.players ?? 0,
                maxPlayers: attributes.maxPlayers ?? 0,
                ip: attributes.ip,
                port: attributes.port,
                connectString: (attributes.ip && attributes.port) ? `connect ${attributes.ip}:${attributes.port}` : null,
                details: attributes.details || {},
                rank: attributes.rank,
                location: attributes.country,
                rawDescription: rawDescription,
                formattedDescription: formatDescription(rawDescription),
                lastUpdate: new Date().toISOString(),
                error: null,
            };
            logger.debug(`Fetched status for server ${serverId}: ${status.isOnline ? 'Online' : 'Offline'} (${status.players}/${status.maxPlayers})`);
            return status;

        } catch (err) {
            logger.error(`❌ Network or parsing error fetching status for server ${serverId}: ${err.message}`, { stack: err.stack });
            return this._createErrorStatus(serverId, 'Network/Fetch Error');
        }
    }

    _createErrorStatus(serverId, errorType) {
        return {
            serverId: String(serverId),
            serverName: `Server ${serverId} (Error)`,
            isOnline: false,
            players: 0,
            maxPlayers: 0,
            connectString: null,
            formattedDescription: null,
            lastUpdate: new Date().toISOString(),
            error: errorType,
        };
    }
}

const battleMetricsService = new BattleMetricsService(config.battlemetrics.token);

module.exports = battleMetricsService;
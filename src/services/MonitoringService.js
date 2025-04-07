const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger').child({ service: 'MonitoringService' });
const config = require('../config');
const monitorDataService = require('./MonitorDataService');
const battleMetricsService = require('./BattleMetricsService');
const { buildMonitorEmbed } = require('../utils/discordUtils');
const { AppError } = require('../errors/AppError');

class MonitoringService {
    constructor(client) {
        this.client = client;
        this.isUpdating = false;
        this.updateInterval = config.monitoring.updateIntervalMinutes * 60 * 1000;
        this.requestDelay = config.monitoring.requestDelayMs;
        this.initialDelay = config.monitoring.initialUpdateDelayMs;
        this.timeoutId = null;
    }

    start() {
        if (!config.battlemetrics.token) {
            logger.warn('MonitoringService not started: BattleMetrics token is missing.');
            return;
        }
        if (this.timeoutId) {
            logger.warn('MonitoringService already started.');
            return;
        }

        logger.info(`Starting monitoring service. Update interval: ${config.monitoring.updateIntervalMinutes} min. Initial delay: ${this.initialDelay / 1000}s.`);

        this.timeoutId = setTimeout(() => this.runUpdateCycle(), this.initialDelay);
    }

    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            logger.info('MonitoringService stopped.');
        }
        this.isUpdating = false;
    }

    async triggerUpdate(interaction = null) {
        logger.info(`Manual monitor update triggered ${interaction ? `by interaction ${interaction.id}`: ''}.`);
        if (this.isUpdating) {
            logger.warn('Skipping triggered update: An update is already in progress.');
            if (interaction) {
                const { safeReply } = require('../utils/discordUtils');
                await safeReply(interaction, '⏳ Monitoring is currently updating. Please wait for it to finish.', true);
            }
            return false;
        }

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        await this.runUpdateCycle();
        return true;
    }

    async runUpdateCycle() {
        if (this.isUpdating) {
            logger.warn('Update cycle skipped: Previous cycle still running.');
            this.scheduleNextUpdate();
            return;
        }

        this.isUpdating = true;
        logger.info('Starting monitoring update cycle...');
        const startTime = Date.now();

        try {
            const serversToMonitor = monitorDataService.getMonitoredServers();
            const messageInfo = monitorDataService.getMessageInfo();

            if (serversToMonitor.length === 0) {
                logger.info('No servers configured for monitoring.');
                await this.deleteOrphanedMessage(messageInfo);
                return;
            }

            if (!battleMetricsService.apiToken) {
                logger.error('Cannot perform monitoring update: BattleMetrics token is missing.');
                await this.displayErrorInMessage(messageInfo, 'Monitoring Disabled: BattleMetrics token is missing.');
                return;
            }

            const statuses = await this.fetchServerStatuses(serversToMonitor);

            const embeds = statuses
                .map(status => {
                    const serverConfig = serversToMonitor.find(s => s.id === status.serverId) || { id: status.serverId, showDescription: false, color: null };
                    return buildMonitorEmbed(status, serverConfig);
                })
                .filter(embed => embed);

            if (embeds.length === 0) {
                logger.error('Failed to generate any embeds for monitored servers.');
                await this.displayErrorInMessage(messageInfo, 'Failed to fetch status for all monitored servers.');
                return;
            }

            await this.updateDiscordMessage(messageInfo, embeds);

        } catch (error) {
            logger.error(`❌ Unexpected error during monitoring update cycle: ${error.message}`, { stack: error.stack });
            try {
                const messageInfo = monitorDataService.getMessageInfo();
                await this.displayErrorInMessage(messageInfo, `An internal error occurred during the update: ${error.message}`);
            } catch (displayError) {
                logger.error(`Failed to display monitoring cycle error in Discord: ${displayError.message}`);
            }

        } finally {
            this.isUpdating = false;
            const duration = Date.now() - startTime;
            logger.info(`Monitoring update cycle finished in ${duration}ms.`);
            this.scheduleNextUpdate();
        }
    }

    scheduleNextUpdate() {
        if (this.timeoutId) clearTimeout(this.timeoutId);

        const nextRunDelay = Math.max(0, this.updateInterval);
        this.timeoutId = setTimeout(() => this.runUpdateCycle(), nextRunDelay);
        logger.info(`Next monitoring update scheduled in ${nextRunDelay / 1000 / 60} minutes.`);
    }

    async fetchServerStatuses(servers) {
        const statuses = [];
        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];
            logger.debug(`Fetching status for server ${server.id}...`);
            try {
                const status = await battleMetricsService.getServerStatus(server.id);
                statuses.push(status);
            } catch (fetchError) {
                logger.error(`Critical error fetching status for ${server.id}, service didn't return error object: ${fetchError.message}`);
                statuses.push(battleMetricsService._createErrorStatus(server.id, 'Fetch Exception'));
            }

            if (i < servers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
            }
        }
        return statuses;
    }

     async updateDiscordMessage(messageInfo, embeds) {
        const { channelId, messageId } = messageInfo;

        if (!channelId) {
            logger.error('Cannot update monitoring message: Channel ID is unknown. Please use a command (e.g., setrustmonitor) in the desired channel first.');
            return;
        }

        try {
            const channel = await this.client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                logger.error(`Target channel ${channelId} for monitoring not found! Resetting monitor message info.`);
                monitorDataService.setMessageInfo(null, null);
                await monitorDataService.saveData();
                return;
            }

            const perms = channel.permissionsFor(this.client.user);
             if (!perms || !perms.has(['SendMessages', 'EmbedLinks', 'ViewChannel'])) {
                logger.error(`Missing permissions (SendMessages, EmbedLinks, ViewChannel) in channel ${channelId}. Cannot update monitoring message.`);
                return;
            }

            let message = null;
            if (messageId) {
                message = await channel.messages.fetch(messageId).catch(() => null);
            }

            if (message) {
                await message.edit({ embeds });
                logger.debug(`Monitoring message (${messageId}) updated in channel ${channelId}.`);
            } else {
                logger.info('Monitoring message not found or ID unknown, creating a new one...');
                const newMessage = await channel.send({ embeds });
                logger.info(`✅ New monitoring message created (${newMessage.id}) in channel ${channelId}.`);
                monitorDataService.setMessageInfo(channelId, newMessage.id);
                await monitorDataService.saveData();
            }
        } catch (error) {
            logger.error(`❌ Error updating/creating monitoring message in channel ${channelId}: ${error.message}`, { code: error.code, stack: error.stack });
            if ([10003, 10008, 50001, 50013].includes(error.code)) {
                logger.warn('Resetting monitoring message info due to access error or missing object.');
                monitorDataService.setMessageInfo(null, null);
                await monitorDataService.saveData();
            }
        }
    }

     async deleteOrphanedMessage(messageInfo) {
        const { channelId, messageId } = messageInfo;
        if (!messageId || !channelId) return;

        logger.info(`Attempting to delete orphaned monitoring message (${messageId}) in channel ${channelId}...`);
        try {
            const channel = await this.client.channels.fetch(channelId).catch(() => null);
            if (channel) {
                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (message) {
                    await message.delete();
                    logger.info(`Orphaned monitoring message (${messageId}) deleted.`);
                }
            }
        } catch (err) {
            if (err.code !== 10008 && err.code !== 10003) {
                logger.error(`Error deleting orphaned monitoring message: ${err.message}`, { code: err.code });
            }
        } finally {
            monitorDataService.setMessageInfo(null, null);
            await monitorDataService.saveData();
        }
    }

     async displayErrorInMessage(messageInfo, errorMessage) {
        const { channelId, messageId } = messageInfo;
        if (!channelId) return;

        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ Monitoring Error')
            .setDescription(errorMessage)
            .setTimestamp();

        try {
            const channel = await this.client.channels.fetch(channelId).catch(() => null);
            if (!channel) return;

            const perms = channel.permissionsFor(this.client.user);
            if (!perms || !perms.has(['SendMessages', 'EmbedLinks', 'ViewChannel'])) {
                logger.error(`Missing permissions in channel ${channelId} to display monitoring error.`);
                return;
            }

            let message = null;
            if (messageId) {
                message = await channel.messages.fetch(messageId).catch(() => null);
            }

            if (message) {
                await message.edit({ embeds: [errorEmbed] });
                logger.warn(`Displayed monitoring error in existing message ${messageId}.`);
            } else {
                logger.warn('Could not find existing monitoring message to display error.');
            }
        } catch (error) {
            logger.error(`Failed to display monitoring error in Discord message: ${error.message}`, { code: error.code });
            if ([10003, 10008, 50001, 50013].includes(error.code)) {
                monitorDataService.setMessageInfo(null, null);
                await monitorDataService.saveData();
            }
        }
    }
}

module.exports = MonitoringService;
const fs = require('fs').promises;
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger').child({ service: 'EmbedDataService' });
const config = require('../config');
const { AppError } = require('../errors/AppError');

let isSaving = false;
const saveQueue = [];

class EmbedDataService {
    constructor(filePath) {
        this.filePath = filePath;
        this.embeds = [];
        this.channelId = null;
        this.messageId = null;
        this._isInitialized = false;
    }

    async initialize() {
        if (this._isInitialized) return;
        try {
            await fs.access(this.filePath);
            const raw = await fs.readFile(this.filePath, 'utf8');
            const data = JSON.parse(raw);
            this.embeds = data.storedEmbeds ? data.storedEmbeds.map(d => new EmbedBuilder(d)) : [];
            this.channelId = data.storedEmbedsChannelId || null;
            this.messageId = data.storedEmbedsMessageId || null;
            logger.info(`✅ ${this.embeds.length} Embeds loaded from ${path.basename(this.filePath)}.`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                logger.warn(`File ${path.basename(this.filePath)} not found. Initializing with empty data.`);
                this.embeds = [];
                this.channelId = null;
                this.messageId = null;
            } else {
                logger.error(`❌ Error loading embeds data from ${path.basename(this.filePath)}: ${err.message}`, { stack: err.stack });
                this.embeds = [];
                this.channelId = null;
                this.messageId = null;
                throw new AppError(`Failed to initialize EmbedDataService: ${err.message}`, 500, false);
            }
        } finally {
            this._isInitialized = true;
        }
    }

    async _saveDataInternal() {
        const data = {
            storedEmbeds: this.embeds.map(e => e.toJSON()),
            storedEmbedsChannelId: this.channelId,
            storedEmbedsMessageId: this.messageId
        };
        try {
            await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
            logger.debug(`Embeds data saved to ${path.basename(this.filePath)}.`);
        } catch (err) {
            logger.error(`❌ Error saving embeds data to ${path.basename(this.filePath)}: ${err.message}`, { stack: err.stack });
        }
    }

    async saveData() {
        return new Promise((resolve, reject) => {
            saveQueue.push({ resolve, reject });
            this._processSaveQueue();
        });
    }

    async _processSaveQueue() {
        if (isSaving || saveQueue.length === 0) {
            return;
        }
        isSaving = true;
        const { resolve, reject } = saveQueue.shift();

        try {
            await this._saveDataInternal();
            resolve();
        } catch (error) {
            reject(error);
        } finally {
            isSaving = false;
            this._processSaveQueue();
        }
    }


    getEmbeds() {
        this._ensureInitialized();
        return [...this.embeds];
    }

    setEmbeds(newEmbeds) {
        this._ensureInitialized();
        this.embeds = newEmbeds.map(e => (e instanceof EmbedBuilder ? e : new EmbedBuilder(e)));
    }

    addEmbed(embed) {
        this._ensureInitialized();
        this.embeds.push(embed instanceof EmbedBuilder ? embed : new EmbedBuilder(embed));
    }

    removeEmbedByIndex(index) {
        this._ensureInitialized();
        if (index >= 0 && index < this.embeds.length) {
            this.embeds.splice(index, 1);
            return true;
        }
        return false;
    }

    getMessageInfo() {
        this._ensureInitialized();
        return { channelId: this.channelId, messageId: this.messageId };
    }

    setMessageInfo(channelId, messageId) {
        this._ensureInitialized();
        this.channelId = channelId;
        this.messageId = messageId;
    }

    _ensureInitialized() {
        if (!this._isInitialized) {
            throw new Error("EmbedDataService is not initialized. Call initialize() first.");
        }
    }

    async updateDiscordMessage(client, channel) {
        this._ensureInitialized();
        const currentInfo = this.getMessageInfo();

        if (currentInfo.messageId && currentInfo.channelId) {
            try {
                const oldChannel = await client.channels.fetch(currentInfo.channelId).catch(() => null);
                if (oldChannel) {
                    const oldMsg = await oldChannel.messages.fetch(currentInfo.messageId).catch(() => null);
                    if (oldMsg) {
                        await oldMsg.delete();
                        logger.info(`Old embed message (${currentInfo.messageId}) deleted from channel ${currentInfo.channelId}.`);
                    }
                } else {
                    logger.warn(`Old channel (${currentInfo.channelId}) for embeds not found.`);
                }
            } catch (err) {
                if (err.code !== 10008 && err.code !== 10003) {
                    logger.error(`Failed to delete old embed message: ${err.message}`, { code: err.code });
                }
            } finally {
                this.setMessageInfo(null, null);
            }
        }

        const embedsToSend = this.getEmbeds();
        if (embedsToSend.length === 0) {
            logger.info('No server info embeds to display.');
                await this.saveData();
            return null;
        }

        try {
            const newMsg = await channel.send({ embeds: embedsToSend });
            this.setMessageInfo(channel.id, newMsg.id);
            logger.info(`New embed message sent (${newMsg.id}) to channel ${channel.id}.`);
            await this.saveData();
            return newMsg;
        } catch (error) {
            logger.error(`❌ Error sending new embed message to channel ${channel.id}: ${error.message}`, { stack: error.stack });
            this.setMessageInfo(null, null);
            await this.saveData();
            throw new AppError(`Failed to send embed message: ${error.message}`);
        }
    }
}

const embedDataService = new EmbedDataService(config.paths.embedsDataFile);

module.exports = embedDataService;
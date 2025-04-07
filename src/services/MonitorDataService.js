const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger').child({ service: 'MonitorDataService' });
const config = require('../config');
const { AppError } = require('../errors/AppError');

let isSavingMonitors = false;
const saveMonitorsQueue = [];

class MonitorDataService {
    constructor(filePath) {
        this.filePath = filePath;
        this.monitorMessageInfo = { channelId: null, messageId: null };
        this.monitoredServers = [];
        this._isInitialized = false;
    }

    async initialize() {
        if (this._isInitialized) return;
        try {
            await fs.access(this.filePath);
            const raw = await fs.readFile(this.filePath, 'utf8');
            const data = JSON.parse(raw);

            this.monitorMessageInfo = (data.monitorMessageInfo && typeof data.monitorMessageInfo === 'object')
                ? { channelId: data.monitorMessageInfo.channelId || null, messageId: data.monitorMessageInfo.messageId || null }
                : { channelId: null, messageId: null };

            this.monitoredServers = Array.isArray(data.monitoredServers)
                ? data.monitoredServers
                    .filter(s => s && typeof s.id !== 'undefined' && s.id !== null)
                    .map(s => ({
                        id: String(s.id),
                        showDescription: s.showDescription === true,
                        color: (typeof s.color === 'string' && s.color.trim()) ? s.color.trim().toUpperCase() : null
                    }))
                : [];

            logger.info(`✅ ${this.monitoredServers.length} monitor targets loaded from ${path.basename(this.filePath)}.`);

        } catch (err) {
             if (err.code === 'ENOENT') {
                logger.warn(`File ${path.basename(this.filePath)} not found. Initializing with empty monitor data.`);
                this.monitorMessageInfo = { channelId: null, messageId: null };
                this.monitoredServers = [];
            } else {
                logger.error(`❌ Error loading monitor data from ${path.basename(this.filePath)}: ${err.message}`, { stack: err.stack });
                this.monitorMessageInfo = { channelId: null, messageId: null };
                this.monitoredServers = [];
                throw new AppError(`Failed to initialize MonitorDataService: ${err.message}`, 500, false);
            }
        } finally {
            this._isInitialized = true;
        }
    }

    async _saveDataInternal() {
        const data = {
            monitorMessageInfo: this.monitorMessageInfo,
            monitoredServers: this.monitoredServers
        };
        try {
            await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
            logger.debug(`Monitor data saved to ${path.basename(this.filePath)}.`);
        } catch (err) {
            logger.error(`❌ Error saving monitor data to ${path.basename(this.filePath)}: ${err.message}`, { stack: err.stack });
        }
    }

    async saveData() {
        return new Promise((resolve, reject) => {
            saveMonitorsQueue.push({ resolve, reject });
            this._processSaveQueue();
        });
    }

     async _processSaveQueue() {
        if (isSavingMonitors || saveMonitorsQueue.length === 0) {
            return;
        }
        isSavingMonitors = true;
        const { resolve, reject } = saveMonitorsQueue.shift();

        try {
            await this._saveDataInternal();
            resolve();
        } catch (error) {
            reject(error);
        } finally {
            isSavingMonitors = false;
            this._processSaveQueue();
        }
    }

    getMessageInfo() {
        this._ensureInitialized();
        return { ...this.monitorMessageInfo };
    }

    setMessageInfo(channelId, messageId) {
        this._ensureInitialized();
        this.monitorMessageInfo = { channelId, messageId };
    }

    getMonitoredServers() {
        this._ensureInitialized();
        return JSON.parse(JSON.stringify(this.monitoredServers));
    }

    addOrUpdateServer(serverData) {
        this._ensureInitialized();
        const serverIdStr = String(serverData.id);
        const index = this.monitoredServers.findIndex(s => s.id === serverIdStr);

        const cleanColor = (typeof serverData.color === 'string' && serverData.color.trim()) ? serverData.color.trim().toUpperCase() : null;

        const updatedData = {
            id: serverIdStr,
            showDescription: serverData.showDescription === true,
            color: cleanColor
        };

        let isNew = false;
        if (index !== -1) {
            this.monitoredServers[index] = { ...this.monitoredServers[index], ...updatedData };
            logger.info(`Updated monitor target: ID ${serverIdStr}`);
        } else {
            this.monitoredServers.push(updatedData);
            isNew = true;
            logger.info(`Added new monitor target: ID ${serverIdStr}`);
        }

        return isNew;
    }

    removeServerById(serverId) {
        this._ensureInitialized();
        const serverIdStr = String(serverId);
        const initialLength = this.monitoredServers.length;
        this.monitoredServers = this.monitoredServers.filter(s => s.id !== serverIdStr);
        const removed = this.monitoredServers.length < initialLength;
        if (removed) {
            logger.info(`Removed monitor target: ID ${serverIdStr}`);
        } else {
            logger.warn(`Attempted to remove non-existent monitor target: ID ${serverIdStr}`);
        }

        return removed;
    }

     _ensureInitialized() {
        if (!this._isInitialized) {
            throw new Error("MonitorDataService is not initialized. Call initialize() first.");
        }
    }
}

const monitorDataService = new MonitorDataService(config.paths.monitorDataFile);

module.exports = monitorDataService;
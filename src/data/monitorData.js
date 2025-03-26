const fs = require('fs');
const path = require('path');

const MONITORS_FILE = path.resolve(__dirname, '../../monitors_combined_v3.json');

const UPDATE_INTERVAL_MINUTES = 15;
const UPDATE_INTERVAL_MS = UPDATE_INTERVAL_MINUTES * 60 * 1000;

let monitorMessageInfo = { channelId: null, messageId: null };
let monitoredServers = [];

function loadMonitors() {
    try {
        if (!fs.existsSync(MONITORS_FILE)) {
            console.log(`[MonitorData] ${path.basename(MONITORS_FILE)} file not found. Initializing with empty data.`);
            monitorMessageInfo = { channelId: null, messageId: null };
            monitoredServers = [];
            return;
        }
        const raw = fs.readFileSync(MONITORS_FILE, 'utf8');
        const data = JSON.parse(raw);
        monitorMessageInfo = data.monitorMessageInfo && typeof data.monitorMessageInfo === 'object'
            ? data.monitorMessageInfo
            : { channelId: null, messageId: null };
        monitoredServers = Array.isArray(data.monitoredServers)
            ? data.monitoredServers
                .filter(s => s && s.id != null)
                .map(s => ({
                    id: String(s.id),
                    showDescription: s.showDescription === true,
                    color: typeof s.color === 'string' ? s.color : null
                }))
            : [];
        console.log(`[MonitorData] ✅ Loaded ${monitoredServers.length} servers for monitoring.`);
    } catch (err) {
        console.error(`[MonitorData] ❌ Error loading ${path.basename(MONITORS_FILE)}:`, err.message);
        monitorMessageInfo = { channelId: null, messageId: null };
        monitoredServers = [];
    }
}

function saveMonitors() {
    try {
        const data = { monitorMessageInfo, monitoredServers };
        fs.writeFileSync(MONITORS_FILE, JSON.stringify(data, null, 2), 'utf8');
        // console.log(`[MonitorData] ✅ Monitoring data (${monitoredServers.length} servers) saved.`);
    } catch (err) {
        console.error(`[MonitorData] ❌ Error saving ${path.basename(MONITORS_FILE)}:`, err.message);
    }
}

module.exports = {
    loadMonitors,
    saveMonitors,
    getMonitorInfo: () => monitorMessageInfo,
    setMonitorInfo: (channelId, messageId) => {
        monitorMessageInfo = { channelId, messageId };
    },
    getMonitoredServers: () => monitoredServers,
    addOrUpdateMonitoredServer: (serverData) => {
        const serverIdStr = String(serverData.id);
        const index = monitoredServers.findIndex(s => s.id === serverIdStr);
        const updatedData = {
            ...serverData,
            id: serverIdStr,
            showDescription: serverData.showDescription === true,
            color: typeof serverData.color === 'string' && serverData.color.trim() ? serverData.color.trim() : null
        };

        if (index !== -1) {
            monitoredServers[index] = { ...monitoredServers[index], ...updatedData };
        } else {
            monitoredServers.push(updatedData);
        }
        saveMonitors();
    },
    removeMonitoredServerById: (serverId) => {
        const serverIdStr = String(serverId);
        const initialLength = monitoredServers.length;
        monitoredServers = monitoredServers.filter(s => s.id !== serverIdStr);
        const removed = monitoredServers.length < initialLength;
        if (removed) {
            saveMonitors();
        }
        return removed;
    },
    getMonitorUpdateIntervalMs: () => UPDATE_INTERVAL_MS,
    getUpdateIntervalMinutes: () => UPDATE_INTERVAL_MINUTES,
};
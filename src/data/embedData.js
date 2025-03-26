const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const DATA_FILE = path.resolve(__dirname, '../../embedsData.json');

let storedEmbeds = [];
let storedEmbedsChannelId = null;
let storedEmbedsMessageId = null;

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.log('[EmbedData] embedsData.json file not found. Initializing with empty data.');
            storedEmbeds = [];
            storedEmbedsChannelId = null;
            storedEmbedsMessageId = null;
            return;
        }
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(raw);
        storedEmbeds = data.storedEmbeds ? data.storedEmbeds.map(d => new EmbedBuilder(d)) : [];
        storedEmbedsChannelId = data.storedEmbedsChannelId || null;
        storedEmbedsMessageId = data.storedEmbedsMessageId || null;
        console.log(`[EmbedData] ✅ ${storedEmbeds.length} Embeds loaded from file.`);
    } catch (err) {
        console.error('[EmbedData] ❌ Error loading embedsData.json:', err.message);
        storedEmbeds = [];
        storedEmbedsChannelId = null;
        storedEmbedsMessageId = null;
    }
}

function saveData() {
    try {
        const data = {
            storedEmbeds: storedEmbeds.map(e => e.toJSON()),
            storedEmbedsChannelId,
            storedEmbedsMessageId
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        // console.log(`[EmbedData] ✅ ${storedEmbeds.length} Embeds saved to file.`);
    } catch (err) {
        console.error('[EmbedData] ❌ Error saving embedsData.json:', err.message);
    }
}

async function updateEmbeds(interaction) {
    const channel = interaction.channel;
    if (storedEmbedsMessageId && storedEmbedsChannelId) {
        try {
            const oldChannel = await interaction.client.channels.fetch(storedEmbedsChannelId).catch(() => null);
            if (oldChannel) {
                const oldMsg = await oldChannel.messages.fetch(storedEmbedsMessageId).catch(() => null);
                if (oldMsg) {
                    await oldMsg.delete();
                    console.log(`[EmbedData] Old message (${storedEmbedsMessageId}) successfully deleted.`);
                }
            } else {
                console.log(`[EmbedData] Old channel (${storedEmbedsChannelId}) not found, resetting ID.`);
            }
        } catch (err) {
            if (err.code !== 10008 && err.code !== 10003) {
                console.error('[EmbedData] Failed to delete old message:', err.message);
            } else {
                 console.log('[EmbedData] Old message/channel no longer exists.');
            }
        } finally {
            storedEmbedsChannelId = null;
            storedEmbedsMessageId = null;
        }
    }

    if (storedEmbeds.length === 0) {
        console.log('[EmbedData] No stored Embeds to send.');
        saveData();
        return;
    }

    try {
        const newMsg = await channel.send({ embeds: storedEmbeds });
        storedEmbedsChannelId = channel.id;
        storedEmbedsMessageId = newMsg.id;
        console.log(`[EmbedData] New message with Embeds sent (${newMsg.id}).`);
        saveData();
    } catch (error) {
        console.error('[EmbedData] ❌ Error sending new message with Embeds:', error);
        storedEmbedsChannelId = null;
        storedEmbedsMessageId = null;
        saveData();
    }
}

module.exports = {
    loadData,
    saveData,
    updateEmbeds,
    getStoredEmbeds: () => storedEmbeds,
    setStoredEmbeds: (newEmbeds) => { storedEmbeds = newEmbeds; },
    addStoredEmbed: (embed) => { storedEmbeds.push(embed); },
    removeStoredEmbedByIndex: (index) => {
        if (index >= 0 && index < storedEmbeds.length) {
            storedEmbeds.splice(index, 1);
            return true;
        }
        return false;
    },
};
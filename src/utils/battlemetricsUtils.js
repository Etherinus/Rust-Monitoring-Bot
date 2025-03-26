const { EmbedBuilder } = require('discord.js');
const { formatDescription } = require('./textUtils');
const { getMonitorInfo, getMonitoredServers, setMonitorInfo, saveMonitors } = require('../data/monitorData');

const DEFAULT_ONLINE_COLOR = '#242429';
const DEFAULT_OFFLINE_COLOR = '#242429';

let isUpdating = false;

async function fetchServerStatusFromBattleMetrics(serverId) {
    const battlemetricsToken = process.env.BATTLEMETRICS_TOKEN;
    if (!battlemetricsToken) {
        console.error(`[BM API] Attempt to request without token for server ${serverId}`);
        return { serverId, online: false, currentPlayers: 0, maxPlayers: 0, connectString: 'Error: BM Token not configured', serverName: `Server ${serverId}`, description: null };
    }

    const fetch = (await import('node-fetch')).default;
    const url = `https://api.battlemetrics.com/servers/${serverId}?include=serverDescription`;
    const headers = { 'Authorization': `Bearer ${battlemetricsToken}` };

    try {
        const response = await fetch(url, { headers, timeout: 15000 });

        if (!response.ok) {
            let errorBody = `Status: ${response.status} ${response.statusText}`;
            try {
                if (response.headers.get('content-type')?.includes('application/json')) {
                    const errorJson = await response.json();
                    errorBody += `. Response: ${JSON.stringify(errorJson)}`;
                } else {
                    const errorText = await response.text();
                    errorBody += `. Response: ${errorText}`;
                }
            } catch (e) {
                errorBody += `. Could not read response body: ${e.message}`;
            }
            throw new Error(`HTTP error from BattleMetrics API. ${errorBody}`);
        }

        const json = await response.json();
        if (!json?.data?.attributes) {
            throw new Error('Invalid response structure from BattleMetrics API.');
        }

        const attributes = json.data.attributes;
        let rawDescription = null;
        if (json.included && Array.isArray(json.included)) {
            const descObject = json.included.find(item => item.type === 'serverDescription');
            rawDescription = descObject?.attributes?.description;
        }

        const description = formatDescription(rawDescription);

        const serverName = attributes.name || `Server ${serverId}`;
        const isOnline = attributes.status === 'online';
        const players = attributes.players ?? 0;
        const maxPlayers = attributes.maxPlayers ?? 0;
        const ip = attributes.ip;
        const port = attributes.port;
        const connect = ip && port ? `\`connect ${ip}:${port}\`` : 'No connection data';

        return {
            serverId,
            online: isOnline,
            currentPlayers: players,
            maxPlayers: maxPlayers,
            connectString: connect,
            serverName: serverName,
            description: description
        };

    } catch (err) {
        console.error(`[BM API] ❌ Error fetching status for server ${serverId}: ${err.message}`);
        return {
            serverId,
            online: false,
            currentPlayers: 0,
            maxPlayers: 0,
            connectString: 'API Error',
            serverName: `Server ${serverId} (error)`,
            description: null
        };
    }
}

function buildMonitorEmbed(status, serverInfo) {
    const embedColor = serverInfo.color || (status.online ? DEFAULT_ONLINE_COLOR : DEFAULT_OFFLINE_COLOR);

    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('📊 Server Monitoring')
        .addFields({ name: '<:server:YOUR_REAL_EMOJI_ID> **Server:**', value: `${status.serverName}` });

    if (status.online) {
        embed.addFields(
            {
                name: '<:serveronline:YOUR_REAL_EMOJI_ID> **Status:**',
                value: `Online - ${status.currentPlayers}/${status.maxPlayers}`,
                inline: false
            }
        );
        if (serverInfo.showDescription && status.description) {
            embed.addFields({ name: '📝 **Description:**', value: status.description, inline: false });
        }
        if (status.connectString && status.connectString !== 'No connection data') {
             embed.addFields({ name: '<:connect:YOUR_REAL_EMOJI_ID> **Connect:**', value: status.connectString, inline: false });
        }

    } else {
        const statusValue = status.connectString === 'API Error'
            ? 'Offline (API Error)'
            : 'Offline';
        embed.addFields({
            name: '<:servererror:YOUR_REAL_EMOJI_ID> **Status:**',
            value: statusValue,
            inline: false
        });
         if (status.connectString && status.connectString !== 'No connection data' && status.connectString !== 'API Error') {
            embed.addFields({ name: 'ℹ️ **Last Known Connection:**', value: status.connectString, inline: false });
        }
    }
    embed.setTimestamp(new Date());
    embed.setFooter({ text: `ID: ${status.serverId}` });

    return embed;
}

async function updateCombinedMonitorMessage(client, interaction = null) {
    if (isUpdating) {
        if (interaction && (interaction.deferred || interaction.replied === false)) {
             try {
                 const replyContent = '⏳ Monitoring is currently updating. Your changes will be applied automatically in the next cycle.';
                 if (interaction.deferred) {
                     await interaction.followUp({ content: replyContent, ephemeral: true });
                 } else {
                     await interaction.reply({ content: replyContent, ephemeral: true });
                 }
             } catch (e) {
                 if (e.code !== 10062 && e.code !== 'InteractionAlreadyReplied') {
                    console.error("[Monitor] Could not reply about monitoring being busy:", e);
                 }
            }
        }
        return;
    }

    isUpdating = true;

    try {
        const monitorInfo = getMonitorInfo();
        let monitoredServers = getMonitoredServers();

        const targetChannelId = monitorInfo.channelId || (interaction ? interaction.channelId : null);
        if (!targetChannelId) {
            // console.log('[Monitor] Channel ID for monitoring is unknown, update impossible.');
            return;
        }

        if (monitoredServers.length === 0) {
            console.log('[Monitor] No servers to monitor. Checking if old message needs deletion...');
            if (monitorInfo.messageId) {
                try {
                    const channel = await client.channels.fetch(targetChannelId).catch(() => null);
                    if (channel) {
                        const message = await channel.messages.fetch(monitorInfo.messageId).catch(() => null);
                        if (message) {
                            await message.delete();
                            console.log(`[Monitor] Monitoring message (${monitorInfo.messageId}) deleted.`);
                        }
                    }
                } catch (e) {
                    if (e.code !== 10008 && e.code !== 10003) {
                        console.error('[Monitor] Error deleting empty monitoring message:', e);
                    }
                } finally {
                    setMonitorInfo(null, null);
                    saveMonitors();
                }
            }
            return;
        }

        if (!process.env.BATTLEMETRICS_TOKEN) {
            console.warn('[Monitor] Monitoring update skipped: BattleMetrics token is missing.');
            if (monitorInfo.messageId) {
                try {
                const channel = await client.channels.fetch(targetChannelId).catch(() => null);
                if(channel) {
                    const message = await channel.messages.fetch(monitorInfo.messageId).catch(() => null);
                    if (message) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⚠️ Monitoring Error')
                            .setDescription('Failed to update server status.\n**Reason:** BattleMetrics token is missing in the bot configuration.')
                            .setTimestamp();
                        await message.edit({ embeds: [errorEmbed] });
                    }
                }
                } catch (e) {
                    console.error('[Monitor] Error displaying missing token message:', e);
                }
            }
            return;
        }

        const statuses = [];
        const delayBetweenRequestsMs = 600;

        for (let i = 0; i < monitoredServers.length; i++) {
            const serverInfo = monitoredServers[i];
            if (!serverInfo || !serverInfo.id) {
                console.warn(`[Monitor] Skipping server with invalid data at index ${i}`);
                continue;
            }
            try {
                const status = await fetchServerStatusFromBattleMetrics(serverInfo.id);
                statuses.push(status);

                if (i < monitoredServers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenRequestsMs));
                }
            } catch (error) {
                 console.error(`[Monitor] Unexpected error during FETCH CALL for server ${serverInfo.id}:`, error);
                 statuses.push({
                    serverId: serverInfo.id, online: false, currentPlayers: 0, maxPlayers: 0,
                    connectString: 'Critical Error', serverName: `Server ${serverInfo.id} (error)`, description: null
                });
                 if (i < monitoredServers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenRequestsMs));
                }
            }
        }

        const validStatuses = statuses.filter(s => s);
        if(validStatuses.length === 0 && monitoredServers.length > 0) {
            console.error('[Monitor] Failed to get status for any server.');
            return;
        }

        const embeds = validStatuses.map((status) => {
            const serverInfo = monitoredServers.find(s => s.id === status.serverId)
                             || { id: status.serverId, showDescription: false, color: null };
            return buildMonitorEmbed(status, serverInfo);
        });

        try {
            const channel = await client.channels.fetch(targetChannelId).catch(() => null);
            if (!channel) {
                console.error(`[Monitor] ❌ Target channel ${targetChannelId} not found! Resetting monitor data.`);
                setMonitorInfo(null, null);
                saveMonitors();
                return;
            }

            let message = null;
            if (monitorInfo.messageId) {
                message = await channel.messages.fetch(monitorInfo.messageId).catch(() => null);
            }

            if (message) {
                await message.edit({ embeds: embeds });
            } else {
                console.log('[Monitor] Monitoring message not found or ID unknown, creating a new one...');
                const targetChannelForSend = interaction?.channel ?? channel;
                if (!targetChannelForSend) {
                     console.error('[Monitor] ❌ Could not determine channel to send new monitoring message!');
                     return;
                }

                const perms = targetChannelForSend.permissionsFor(client.user);
                if (!perms || !perms.has(['SendMessages', 'EmbedLinks'])) {
                console.error(`[Monitor] ❌ Missing SendMessages or EmbedLinks permission in channel ${targetChannelForSend.id}`);
                if (interaction && (interaction.deferred || !interaction.replied)) {
                    const errorMessage = '❌ The bot lacks permission to send messages or embeds in this channel.';
                        try {
                        if (interaction.deferred) await interaction.followUp({ content: errorMessage, ephemeral: true });
                        else await interaction.reply({ content: errorMessage, ephemeral: true });
                        } catch { }
                }
                return;
                }

                const newMessage = await targetChannelForSend.send({ embeds: embeds });
                console.log(`[Monitor] ✅ New monitoring message created (${newMessage.id}) in channel ${targetChannelForSend.id}.`);
                setMonitorInfo(newMessage.channelId, newMessage.id);
                saveMonitors();
            }
        } catch (error) {
            console.error('[Monitor] ❌ Error updating/creating monitoring message:', error);
            if ([10003, 10008, 50001, 50013].includes(error.code)) {
                console.error('[Monitor] Resetting monitoring message info due to access error or missing object.');
                setMonitorInfo(null, null);
                saveMonitors();
            }
            if (interaction && (interaction.deferred || !interaction.replied)) {
                try {
                     const errorMsg = `❌ An error occurred while updating the message: ${error.message}`;
                      if(interaction.deferred) await interaction.followUp({ content: errorMsg, ephemeral: true });
                      else await interaction.reply({ content: errorMsg, ephemeral: true });
                } catch (e) { }
            }
        }

    } catch (error) {
         console.error('[Monitor] ❌ Unexpected critical error in updateCombinedMonitorMessage:', error);
         if (interaction && (interaction.deferred || !interaction.replied)) {
             try {
                const errorMsg = `❌ A critical error occurred: ${error.message}`;
                if(interaction.deferred) await interaction.followUp({ content: errorMsg, ephemeral: true });
                else await interaction.reply({ content: errorMsg, ephemeral: true });
             } catch(e) { }
         }
    } finally {
        isUpdating = false;
    }
}

module.exports = {
    fetchServerStatusFromBattleMetrics,
    buildMonitorEmbed,
    updateCombinedMonitorMessage,
    isMonitorUpdating: () => isUpdating
};
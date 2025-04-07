const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const logger = require('./logger');

function buildMonitorEmbed(serverStatus, serverConfig) {
    const isError = !!serverStatus.error;
    const isOnline = serverStatus.isOnline && !isError;

    const embedColor = serverConfig.color || (isOnline ? config.defaults.onlineColor : config.defaults.offlineColor);

    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('📊 Server Monitoring')
        .setFooter({ text: `ID: ${serverStatus.serverId}` })
        .setTimestamp(new Date(serverStatus.lastUpdate));

    embed.addFields({
        name: '<:server:1354278159423504559> Server:',
        value: serverStatus.serverName || 'N/A',
        inline: false
    });

    let statusValue;
    let statusName;

    if (isError) {
        statusName = '<:servererror:1354278131447496775> Status:';
        statusValue = `Offline (${serverStatus.error})`;
    } else if (isOnline) {
        statusName = '<:serveronline:1354278141333471302> Status:';
        statusValue = `Online - ${serverStatus.players}/${serverStatus.maxPlayers}`;
    } else {
        statusName = '<:servererror:1354278131447496775> Status:';
        statusValue = 'Offline';
    }
    embed.addFields({ name: statusName, value: statusValue, inline: false });

    if (serverStatus.connectString) {
        embed.addFields({
            name: '<:connect:1354278147448766574> Connect:',
            value: `\`${serverStatus.connectString}\``,
            inline: false
        });
    }

    if (!isError && serverConfig.showDescription && serverStatus.formattedDescription) {
        embed.addFields({ name: '📝 Description:', value: serverStatus.formattedDescription, inline: false });
    }

    return embed;
}

async function safeReply(interaction, options, ephemeral = true) {
    if (!interaction || !interaction.isRepliable()) {
        logger.warn(`Attempted to reply to non-repliable interaction: ${interaction?.id}`);
        return;
    }

    if (typeof options === 'string') {
        options = { content: options, ephemeral: ephemeral, fetchReply: true };
    } else {
        options.ephemeral = ephemeral;
        options.fetchReply = options.fetchReply ?? true;
    }

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(options);
        } else {
            await interaction.reply(options);
        }
    } catch (error) {
        if (error.code !== 10062 && error.code !== 40060) {
            logger.error(`Failed to reply/followUp interaction: ${error.message}`, { code: error.code, interactionId: interaction.id });
        }
    }
}

async function safeEditReply(interaction, options) {
     if (!interaction || !interaction.isRepliable()) {
        logger.warn(`Attempted to edit reply for non-repliable interaction: ${interaction?.id}`);
        return;
    }

    if (typeof options === 'string') {
        options = { content: options, embeds: [], components: [] };
    }

    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(options);
        } else {
            logger.warn(`Attempted to edit reply, but interaction was not replied/deferred: ${interaction.id}`);
        }
    } catch (error) {
         if (error.code !== 10062) {
            logger.error(`Failed to edit interaction reply: ${error.message}`, { code: error.code, interactionId: interaction.id });
        }
    }
}

module.exports = {
    buildMonitorEmbed,
    safeReply,
    safeEditReply,
};
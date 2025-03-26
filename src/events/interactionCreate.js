const { Events, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getNextWipeTimestamp, getNextDailyTimestamp } = require('../utils/timeUtils');
const { updateEmbeds, getStoredEmbeds, setStoredEmbeds, addStoredEmbed, removeStoredEmbedByIndex } = require('../data/embedData');
const { saveMonitors, addOrUpdateMonitoredServer, removeMonitoredServerById, getMonitoredServers } = require('../data/monitorData');
const { updateCombinedMonitorMessage, isMonitorUpdating } = require('../utils/battlemetricsUtils');

const DEFAULT_ICON = 'https://cdn-icons-png.flaticon.com/512/5968/5968866.png';

module.exports = async (interaction, client) => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild) {
        console.warn(`[Interaction] Command /${interaction.commandName} received outside a guild from ${interaction.user.tag}`);
        try { await interaction.reply({ content: 'This command is only available on a server.', ephemeral: true }); } catch {}
        return;
    }

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        console.log(`[Permissions] User ${interaction.user.tag} (${interaction.user.id}) tried to use admin command /${interaction.commandName} without permissions in ${interaction.guild.name} (${interaction.guildId}).`);
        try {
            await interaction.reply({
                content: '❌ You must have Administrator permissions to use this command.',
                ephemeral: true
            });
        } catch (err) {
            console.error(`[Permissions] Failed to send permission error reply for /${interaction.commandName}:`, err);
        }
        return;
    }

    const { commandName } = interaction;
    console.log(`[Interaction] Received ADMIN command /${commandName} from ${interaction.user.tag} in guild ${interaction.guild.name} (${interaction.guildId})`);

    if (commandName === 'setrustmonitor') {
        await interaction.deferReply({ ephemeral: true });

        if (!process.env.BATTLEMETRICS_TOKEN) {
            await interaction.editReply('❌ BattleMetrics token is not configured in the bot. Monitoring is unavailable.');
            return;
        }

        try {
            const serverId = interaction.options.getString('bmid');
            const colorInput = interaction.options.getString('color');
            let serverColor = null;

            if (colorInput) {
                if (/^[0-9A-Fa-f]{6}$/i.test(colorInput)) {
                    serverColor = `#${colorInput.toUpperCase()}`;
                } else {
                    await interaction.editReply('❌ Error: Invalid color format. Specify 6 HEX characters (0-9, A-F), e.g., `FF0000`.');
                    return;
                }
            }

            const serverData = { id: serverId, color: serverColor };
            addOrUpdateMonitoredServer(serverData);

            const currentMonitoredServers = getMonitoredServers();
            const isUpdate = currentMonitoredServers.some(s => s.id === serverId);
            const statusMsg = isUpdate ? 'updated' : 'added';
            const replyMessage = `✅ Monitoring settings for BMID \`${serverId}\` ${statusMsg}. Color: **${serverColor || 'Auto'}**. Status update initiated...`;
            console.log(`[/${commandName}] Configured BMID: ${serverId} (color: ${serverColor || 'Auto'})`);

            await interaction.editReply(replyMessage);
            await updateCombinedMonitorMessage(client, interaction);

        } catch (err) {
            console.error(`[/${commandName}] ❌ Error:`, err);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: `❌ An internal error occurred while configuring monitoring: ${err.message}`, ephemeral: true });
                } else if (!interaction.replied) {
                    await interaction.editReply(`❌ An internal error occurred while configuring monitoring: ${err.message}`);
                } else {
                    await interaction.followUp({ content: `❌ An internal error occurred after configuration: ${err.message}`, ephemeral: true });
                }
            } catch (e) {
                console.error(`[/${commandName}] Failed to send error message:`, e);
            }
        }
        return;
    }

    else if (commandName === 'stoprustmonitor') {
        await interaction.deferReply({ ephemeral: true });
        const serverIdToRemove = interaction.options.getString('bmid');

        try {
            const removed = removeMonitoredServerById(serverIdToRemove);

            if (!removed) {
                await interaction.editReply(`❌ Server with BMID \`${serverIdToRemove}\` not found in the monitoring list.`);
                return;
            }

            console.log(`[/${commandName}] Removed BMID: ${serverIdToRemove} from monitoring.`);
            await interaction.editReply(`✅ Server with BMID \`${serverIdToRemove}\` removed from monitoring. Status update initiated...`);
            await updateCombinedMonitorMessage(client, interaction);

        } catch (error) {
            console.error(`[/${commandName}] ❌ Error removing from monitoring:`, error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: `❌ An error occurred while removing from monitoring: ${error.message}`, ephemeral: true });
                } else if (!interaction.replied) {
                    await interaction.editReply(`❌ An error occurred while removing from monitoring: ${error.message}`);
                } else {
                    await interaction.followUp({ content: `❌ An error occurred after removal from monitoring: ${error.message}`, ephemeral: true });
                }
            } catch (e) {
                console.error(`[/${commandName}] Failed to send error message:`, e);
            }
        }
        return;
    }

    else if (commandName === 'setserverinfo' || commandName === 'addembed') {
        await interaction.deferReply({ ephemeral: true });
        try {
            const serverName = interaction.options.getString('servername');
            let color = interaction.options.getString('color');
            if (color && !color.startsWith('#')) color = `#${color}`;
            const iconURL = interaction.options.getString('iconurl') || DEFAULT_ICON;
            const ipAddress = interaction.options.getString('ipaddress');
            const wipeDay = interaction.options.getString('wipe_day');
            const wipeTimeStr = interaction.options.getString('wipe_time');
            const restartTimeStr = interaction.options.getString('restart_time');
            const mode = interaction.options.getString('mode');
            const teamLimit = interaction.options.getString('teamlimit');
            const map = interaction.options.getString('map');

            let wipeTs, restartTs;
            try {
                wipeTs = getNextWipeTimestamp(wipeDay, wipeTimeStr);
                restartTs = getNextDailyTimestamp(restartTimeStr);
            } catch (timeError) {
                await interaction.editReply(`❌ Error in time format: ${timeError.message}`);
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(color || (commandName === 'setserverinfo' ? '#FAA61A' : '#FFFFFF'))
                .setAuthor({ name: serverName, iconURL: iconURL })
                .addFields(
                    {
                        name: '',
                        value:
                            `**Address:** \`connect ${ipAddress}\`\n` +
                            `**Wipe:** Every ${wipeDay} at <t:${wipeTs}:t> (<t:${wipeTs}:R>)\n` +
                            `**Restart:** Daily at <t:${restartTs}:t> (<t:${restartTs}:R>)`
                    },
                    { name: 'Mode', value: mode, inline: true },
                    { name: 'Limit', value: teamLimit, inline: true },
                    { name: 'Map', value: map, inline: true }
                );

            if (commandName === 'setserverinfo') {
                setStoredEmbeds([embed]);
                await updateEmbeds(interaction);
                await interaction.editReply('✅ Main server Embed successfully created/updated!');
            } else {
                addStoredEmbed(embed);
                await updateEmbeds(interaction);
                const totalEmbeds = getStoredEmbeds().length;
                await interaction.editReply(`✅ Embed for server "${serverName}" added (Total: ${totalEmbeds})!`);
            }

        } catch (err) {
            console.error(`[/${commandName}] ❌ Error:`, err);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: `❌ Error during ${commandName === 'setserverinfo' ? 'creation/update' : 'addition'} of Embed: ${err.message}`, ephemeral: true });
                } else if (!interaction.replied) {
                    await interaction.editReply(`❌ Error during ${commandName === 'setserverinfo' ? 'creation/update' : 'addition'} of Embed: ${err.message}`);
                } else {
                    await interaction.followUp({ content: `❌ Error during ${commandName === 'setserverinfo' ? 'creation/update' : 'addition'} of Embed: ${err.message}`, ephemeral: true });
                }
            } catch (e) {console.error(`[/${commandName}] Failed to send error message:`, e);}
        }
        return;
    }

     else if (commandName === 'removeembed') {
        await interaction.deferReply({ ephemeral: true });
        try {
            const indexToRemove = interaction.options.getInteger('index');
            const currentEmbeds = getStoredEmbeds();
            const totalEmbeds = currentEmbeds.length;

            if (totalEmbeds === 0) {
                await interaction.editReply('❌ No Embeds to remove.');
                return;
            }
            if (indexToRemove < 1 || indexToRemove > totalEmbeds) {
                await interaction.editReply(`❌ Invalid Embed number. Specify a number between 1 and ${totalEmbeds}.`);
                return;
            }

            const removed = removeStoredEmbedByIndex(indexToRemove - 1);

            if (!removed) {
                await interaction.editReply(`❌ Failed to find or remove Embed number ${indexToRemove}.`);
                return;
            }

            console.log(`[/${commandName}] Removed Embed #${indexToRemove}. Remaining: ${getStoredEmbeds().length}.`);
            await updateEmbeds(interaction);
            await interaction.editReply(`✅ Embed #${indexToRemove} successfully removed!`);

        } catch (err) {
            console.error(`[/${commandName}] ❌ Error:`, err);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: `❌ Error removing Embed: ${err.message}`, ephemeral: true });
                } else if (!interaction.replied) {
                    await interaction.editReply(`❌ Error removing Embed: ${err.message}`);
                } else {
                    await interaction.followUp({ content: `❌ Error removing Embed: ${err.message}`, ephemeral: true});
                }
            } catch (e) {console.error(`[/${commandName}] Failed to send error message:`, e);}
        }
        return;
    }

    else {
        console.warn(`[Interaction] Received unknown or unhandled ADMIN command: /${commandName}`);
        try {
            await interaction.reply({ content: '🤔 Unknown command.', ephemeral: true });
        } catch (error) {
            if (error.code !== 10062 && error.code !== 40060) {
                console.error('[Interaction] Error responding to unknown command:', error);
            }
        }
    }
};
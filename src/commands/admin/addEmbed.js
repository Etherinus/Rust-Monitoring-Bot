const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { COMMANDS, OPTIONS, DAYS_OF_WEEK, RUST_MODES, RUST_TEAM_LIMITS, RUST_MAPS } = require('../../utils/constants');
const { getNextWipeTimestamp, getNextDailyTimestamp } = require('../../utils/timeUtils');
const { CommandError } = require('../../errors/AppError');
const config = require('../../config');
const logger = require('../../utils/logger').child({ service: `Cmd:${COMMANDS.ADD_EMBED}` });
const { safeEditReply } = require('../../utils/discordUtils');

function addServerInfoOptions(builder) {
    return builder
        .addStringOption(o => o.setName(OPTIONS.SERVER_NAME).setDescription('Server name').setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.COLOR).setDescription('Embed HEX color (e.g., FAA61A)').setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.IP_ADDRESS).setDescription('Server IP:PORT').setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.WIPE_DAY).setDescription('Day of the week for wipe').addChoices(...DAYS_OF_WEEK).setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.WIPE_TIME).setDescription('Wipe time (HH:MM format, e.g., 14:00)').setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.RESTART_TIME).setDescription('Daily restart time (HH:MM format)').setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.MODE).setDescription('Server mode').addChoices(...RUST_MODES).setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.TEAM_LIMIT).setDescription('Team size limit').addChoices(...RUST_TEAM_LIMITS).setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.MAP).setDescription('Server map').addChoices(...RUST_MAPS).setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.ICON_URL).setDescription('URL for the server icon (optional)').setRequired(false));
}

module.exports = {
    data: addServerInfoOptions(
        new SlashCommandBuilder()
            .setName(COMMANDS.ADD_EMBED)
            .setDescription('Add an additional server info embed')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
            .setDMPermission(false)
        ),

    async execute(interaction, { embedDataService }) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const options = interaction.options;
            const serverName = options.getString(OPTIONS.SERVER_NAME, true);
            let color = options.getString(OPTIONS.COLOR, true);
            const iconURL = options.getString(OPTIONS.ICON_URL) || config.defaults.embedIconUrl;
            const ipAddress = options.getString(OPTIONS.IP_ADDRESS, true);
            const wipeDay = options.getString(OPTIONS.WIPE_DAY, true);
            const wipeTimeStr = options.getString(OPTIONS.WIPE_TIME, true);
            const restartTimeStr = options.getString(OPTIONS.RESTART_TIME, true);
            const mode = options.getString(OPTIONS.MODE, true);
            const teamLimit = options.getString(OPTIONS.TEAM_LIMIT, true);
            const map = options.getString(OPTIONS.MAP, true);

            if (!/^[0-9A-Fa-f]{6}$/i.test(color)) {
                throw new CommandError('Invalid HEX color format. Please provide 6 characters (e.g., FAA61A).');
            }
            color = `#${color.toUpperCase()}`;

            let wipeTs, restartTs;
            try {
                wipeTs = getNextWipeTimestamp(wipeDay, wipeTimeStr);
                restartTs = getNextDailyTimestamp(restartTimeStr);
            } catch (timeError) {
                throw new CommandError(`Invalid time format: ${timeError.message}`);
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: serverName, iconURL: iconURL })
                .addFields(
                    {
                        name: '',
                        value:
                            `**Address:** \`connect ${ipAddress}\`\n` +
                            `**Wipe:** ${wipeDay} at <t:${wipeTs}:t> (<t:${wipeTs}:R>)\n` +
                            `**Restart:** Daily at <t:${restartTs}:t> (<t:${restartTs}:R>)`
                    },
                    { name: 'Mode', value: mode, inline: true },
                    { name: 'Limit', value: teamLimit, inline: true },
                    { name: 'Map', value: map, inline: true }
                )

            embedDataService.addEmbed(embed);
            await embedDataService.updateDiscordMessage(interaction.client, interaction.channel);

            const totalEmbeds = embedDataService.getEmbeds().length;
            logger.info(`Embed for server "${serverName}" added by ${interaction.user.tag}. Total: ${totalEmbeds}.`);
            await safeEditReply(interaction, `✅ Embed for server "${serverName}" added successfully! (Total: ${totalEmbeds})`);

        } catch (error) {
            logger.error(`Error executing /${COMMANDS.ADD_EMBED}: ${error.message}`, { userId: interaction.user.id, guildId: interaction.guildId, stack: error.stack });

            const userMessage = (error instanceof CommandError && error.isUserFacing)
                ? `❌ ${error.message}`
                : '❌ An internal error occurred while adding the embed.';

            await safeEditReply(interaction, userMessage);
        }
    }
};
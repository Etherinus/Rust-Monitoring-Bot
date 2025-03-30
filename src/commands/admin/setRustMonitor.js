const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { COMMANDS, OPTIONS } = require('../../utils/constants');
const { CommandError } = require('../../errors/AppError');
const config = require('../../config');
const logger = require('../../utils/logger').child({ service: `Cmd:${COMMANDS.SET_RUST_MONITOR}` });
const { safeEditReply } = require('../../utils/discordUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(COMMANDS.SET_RUST_MONITOR)
        .setDescription('Add or update a server in the BattleMetrics monitor')
        .addStringOption(o => o.setName(OPTIONS.BMID).setDescription('BattleMetrics Server ID').setRequired(true))
        .addStringOption(o => o.setName(OPTIONS.COLOR).setDescription('Embed HEX color (6 chars, e.g., FF0000). Leave empty for auto.').setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setDMPermission(false),

    async execute(interaction, { monitorDataService, monitoringService }) {
        await interaction.deferReply({ ephemeral: true });

        if (!config.battlemetrics.token) {
                await safeEditReply(interaction, '❌ BattleMetrics token is not configured. Monitoring is unavailable.');
            return;
        }

        try {
            const serverId = interaction.options.getString(OPTIONS.BMID, true);
            const colorInput = interaction.options.getString(OPTIONS.COLOR);
            let serverColor = null;

            if (colorInput) {
                if (/^[0-9A-Fa-f]{6}$/i.test(colorInput)) {
                    serverColor = `#${colorInput.toUpperCase()}`;
                } else {
                    throw new CommandError('Invalid HEX color format. Use 6 characters (0-9, A-F), e.g., `FF0000`.');
                }
            }

            const isNew = monitorDataService.addOrUpdateServer({ id: serverId, color: serverColor });
            await monitorDataService.saveData();

            const statusMsg = isNew ? 'added' : 'updated';
            const replyMessage = `✅ Monitoring settings for BMID \`${serverId}\` ${statusMsg}. Color: **${serverColor || 'Auto'}**. Triggering status update...`;
            logger.info(`Monitor target ${serverId} ${statusMsg} by ${interaction.user.tag}. Color: ${serverColor || 'Auto'}`);

            await safeEditReply(interaction, replyMessage);

            const currentInfo = monitorDataService.getMessageInfo();
            if (!currentInfo.channelId) {
                monitorDataService.setMessageInfo(interaction.channelId, null);
                await monitorDataService.saveData();
                logger.info(`Monitoring channel set to ${interaction.channelId} by first use of /${COMMANDS.SET_RUST_MONITOR}`);
            }

            await monitoringService.triggerUpdate();

        } catch (error) {
            logger.error(`Error executing /${COMMANDS.SET_RUST_MONITOR}: ${error.message}`, { userId: interaction.user.id, guildId: interaction.guildId, stack: error.stack });

            const userMessage = (error instanceof CommandError && error.isUserFacing)
                ? `❌ ${error.message}`
                : '❌ An internal error occurred while configuring monitoring.';

            await safeEditReply(interaction, userMessage);
        }
    }
};
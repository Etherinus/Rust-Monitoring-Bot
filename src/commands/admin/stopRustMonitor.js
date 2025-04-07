const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { COMMANDS, OPTIONS } = require('../../utils/constants');
const { CommandError } = require('../../errors/AppError');
const config = require('../../config');
const logger = require('../../utils/logger').child({ service: `Cmd:${COMMANDS.STOP_RUST_MONITOR}` });
const { safeEditReply } = require('../../utils/discordUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(COMMANDS.STOP_RUST_MONITOR)
        .setDescription('Remove a server from the BattleMetrics monitor')
        .addStringOption(o => o.setName(OPTIONS.BMID).setDescription('BattleMetrics Server ID to remove').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setDMPermission(false),

    async execute(interaction, { monitorDataService, monitoringService }) {
        await interaction.deferReply({ ephemeral: true });

        if (!config.battlemetrics.token) {}

        try {
            const serverIdToRemove = interaction.options.getString(OPTIONS.BMID, true);

            const removed = monitorDataService.removeServerById(serverIdToRemove);

            if (!removed) {
                throw new CommandError(`Server with BMID \`${serverIdToRemove}\` not found in the monitoring list.`);
            }

            await monitorDataService.saveData();

            logger.info(`Removed monitor target ${serverIdToRemove} by ${interaction.user.tag}.`);
            await safeEditReply(interaction, `✅ Server with BMID \`${serverIdToRemove}\` removed from monitoring. Triggering status update...`);

            await monitoringService.triggerUpdate();

        } catch (error) {
            logger.error(`Error executing /${COMMANDS.STOP_RUST_MONITOR}: ${error.message}`, { userId: interaction.user.id, guildId: interaction.guildId, stack: error.stack });

            const userMessage = (error instanceof CommandError && error.isUserFacing)
                ? `❌ ${error.message}`
                : '❌ An internal error occurred while removing the server from monitoring.';

            await safeEditReply(interaction, userMessage);
        }
    }
};
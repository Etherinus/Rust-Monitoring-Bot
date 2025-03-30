const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { COMMANDS, OPTIONS } = require('../../utils/constants');
const { CommandError } = require('../../errors/AppError');
const logger = require('../../utils/logger').child({ service: `Cmd:${COMMANDS.REMOVE_EMBED}` });
const { safeEditReply } = require('../../utils/discordUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(COMMANDS.REMOVE_EMBED)
        .setDescription('Remove a server info embed by its number')
        .addIntegerOption(o => o.setName(OPTIONS.EMBED_INDEX)
            .setDescription('The number of the embed to remove (starting from 1)')
            .setRequired(true)
            .setMinValue(1))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setDMPermission(false),

    async execute(interaction, { embedDataService }) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const indexToRemove = interaction.options.getInteger(OPTIONS.EMBED_INDEX, true);
            const currentEmbeds = embedDataService.getEmbeds();
            const totalEmbeds = currentEmbeds.length;

            if (totalEmbeds === 0) {
                throw new CommandError('There are no embeds to remove.');
            }

            if (indexToRemove > totalEmbeds) {
                throw new CommandError(`Invalid embed number. Please specify a number between 1 and ${totalEmbeds}.`);
            }

            const removed = embedDataService.removeEmbedByIndex(indexToRemove - 1);

            if (!removed) {
                throw new Error(`Failed to remove embed number ${indexToRemove}.`);
            }

            await embedDataService.updateDiscordMessage(interaction.client, interaction.channel);

            logger.info(`Embed #${indexToRemove} removed by ${interaction.user.tag}. Remaining: ${embedDataService.getEmbeds().length}.`);
            await safeEditReply(interaction, `✅ Embed #${indexToRemove} removed successfully!`);

        } catch (error) {
            logger.error(`Error executing /${COMMANDS.REMOVE_EMBED}: ${error.message}`, { userId: interaction.user.id, guildId: interaction.guildId, stack: error.stack });

            const userMessage = (error instanceof CommandError && error.isUserFacing)
                ? `❌ ${error.message}`
                : '❌ An internal error occurred while removing the embed.';

            await safeEditReply(interaction, userMessage);
        }
    }
};
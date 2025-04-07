const { Events, InteractionType, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger').child({ service: 'InteractionHandler' });
const { CommandError } = require('../errors/AppError');
const { safeReply } = require('../utils/discordUtils');

module.exports = {
    name: Events.InteractionCreate,
    
    async execute(interaction) {
        if (!interaction.inGuild()) {
             logger.warn(`Interaction ${interaction.id} received outside a guild from ${interaction.user?.tag}.`);
            if (interaction.isRepliable()) {
                await safeReply(interaction, 'This command can only be used within a server.', true);
            }
            return;
        }

        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) {
            return;
        }

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            logger.error(`No command matching '${interaction.commandName}' was found.`);
            await safeReply(interaction, `❌ Unknown command '${interaction.commandName}'.`, true);
            return;
        }

        if (command.permissions) {
            if (!interaction.member.permissions.has(command.permissions)) {
                logger.warn(`User ${interaction.user.tag} lacks permissions for /${interaction.commandName} in guild ${interaction.guildId}.`);
                await safeReply(interaction, '❌ You do not have permission to use this command.', true);
                return;
            }
        }

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            logger.warn(`User ${interaction.user.tag} (${interaction.user.id}) tried admin command /${interaction.commandName} without Administrator permissions in guild ${interaction.guildId}.`);
            await safeReply(interaction, '❌ You must have Administrator permissions to use this command.', true);
            return;
        }

        try {
            logger.info(`Executing command /${interaction.commandName} for ${interaction.user.tag} in guild ${interaction.guildId}`);
            await command.execute(interaction);
        } catch (error) {
            logger.error(`Error executing command /${interaction.commandName}: ${error.message}`, { userId: interaction.user.id, guildId: interaction.guildId, stack: error.stack });

            const userMessage = (error instanceof CommandError && error.isUserFacing)
                ? `❌ Error: ${error.message}`
                : '❌ An unexpected error occurred while executing this command. Please try again later or contact the administrator.';

            await safeReply(interaction, userMessage, true);
        }
    },
};
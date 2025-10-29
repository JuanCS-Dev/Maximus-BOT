import { Events, Interaction } from 'discord.js';
import { getService } from '../container';
import { TYPES, IIncidentResponseService } from '../types/container';
import { logger } from '../utils/logger';

/**
 * Interaction Create Event
 *
 * Fires when a user interacts with a bot component (button, select menu, modal).
 * This event enables interactive incident response workflows.
 *
 * Supported Interactions:
 * - Button interactions for threat alerts
 * - Slash commands (already handled separately)
 *
 * Button Actions:
 * - ban: Ban user + delete messages
 * - timeout: Timeout user + delete message
 * - delete: Delete message only
 * - ignore: Mark as false positive
 */
export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  try {
    // Handle button interactions
    if (interaction.isButton()) {
      logger.debug(
        `Button interaction: ${interaction.customId} by ${interaction.user.tag}`
      );

      // Check if this is a threat alert button
      if (
        interaction.customId.startsWith('ban:') ||
        interaction.customId.startsWith('timeout:') ||
        interaction.customId.startsWith('delete:') ||
        interaction.customId.startsWith('ignore:')
      ) {
        // Get IncidentResponseService from container
        const incidentResponseService =
          getService<IIncidentResponseService>(TYPES.IncidentResponseService);

        // Handle the interaction
        await incidentResponseService.handleInteractionResponse(interaction);
      }
    }

    // Handle slash command interactions
    if (interaction.isChatInputCommand()) {
      logger.debug(
        `Slash command: /${interaction.commandName} by ${interaction.user.tag}`
      );

      // Slash commands are handled by the command handler
      // This is a placeholder for future expansion
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      logger.debug(
        `Select menu: ${interaction.customId} by ${interaction.user.tag}`
      );

      // Select menus will be added in future phases
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      logger.debug(
        `Modal submit: ${interaction.customId} by ${interaction.user.tag}`
      );

      // Modals will be added in future phases
    }
  } catch (error: unknown) {
    logger.error(`Error in interactionCreate event:`, error);

    // Try to respond to user if interaction hasn't been responded to
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ An error occurred while processing your interaction',
          ephemeral: true,
        });
      } catch (replyError: unknown) {
        logger.error(`Failed to send error reply:`, replyError);
      }
    }
  }
}

// Export as default for automatic loading
export default {
  name,
  execute,
};

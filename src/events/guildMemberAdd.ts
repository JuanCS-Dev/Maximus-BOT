import { Events, GuildMember } from 'discord.js';
import { getService } from '../container';
import { TYPES, IAntiRaidService } from '../types/container';
import { logger } from '../utils/logger';

/**
 * Guild Member Add Event
 *
 * Fires when a new member joins a guild.
 * This event enables anti-raid detection and account validation.
 *
 * Defense Workflow:
 * 1. Track join rate (Redis sliding window)
 * 2. Validate account age
 * 3. Detect raid patterns
 * 4. Trigger auto-mitigation if raid detected
 *
 * Note: Requires GuildMembers privileged intent
 */
export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember): Promise<void> {
  try {
    logger.debug(
      `Member joined: ${member.user.tag} (${member.id}) in guild ${member.guild.name}`
    );

    // Get AntiRaidService from container
    const antiRaidService = getService<IAntiRaidService>(TYPES.AntiRaidService);

    // Check if anti-raid is enabled for this guild
    const antiRaidEnabled = await antiRaidService.isAntiRaidEnabled(member.guild.id);

    if (!antiRaidEnabled) {
      logger.debug(`Anti-raid disabled for guild ${member.guild.id}`);
      return;
    }

    // 1. Validate account age
    const meetsAgeRequirement = await antiRaidService.validateAccountAge(member);

    if (!meetsAgeRequirement) {
      logger.warn(
        `⚠️ Account age check failed: ${member.user.tag} (created: ${member.user.createdAt.toISOString()})`
      );

      // Optional: Kick user if account too new
      const autoKickNewAccounts = process.env.AUTO_KICK_NEW_ACCOUNTS === 'true';

      if (autoKickNewAccounts && member.kickable) {
        try {
          await member.kick('Account age below minimum requirement');
          logger.info(`Kicked new account: ${member.user.tag}`);
        } catch (error) {
          logger.error(`Failed to kick ${member.user.tag}:`, error);
        }
      }

      return;
    }

    // 2. Detect mass join (raid)
    const isRaid = await antiRaidService.detectMassJoin(member.guild.id);

    if (isRaid) {
      logger.warn(`🚨 RAID DETECTED in guild ${member.guild.name} (${member.guild.id})`);

      // 3. Trigger auto-mitigation
      await antiRaidService.triggerAutoMitigation(member);

      // Optionally kick the triggering member
      if (member.kickable) {
        try {
          await member.kick('Auto-mitigation: Raid detected');
          logger.info(`Kicked raid participant: ${member.user.tag}`);
        } catch (error) {
          logger.error(`Failed to kick ${member.user.tag}:`, error);
        }
      }
    }

    // 4. Log join for analytics
    logger.info(
      `Member join processed: ${member.user.tag} | Account age: ${((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24)).toFixed(1)}d | Raid: ${isRaid ? 'YES' : 'NO'}`
    );
  } catch (error) {
    logger.error(`Error in guildMemberAdd event:`, error);
  }
}

// Export as default for automatic loading
export default {
  name,
  execute,
};

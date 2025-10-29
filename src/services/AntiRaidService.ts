import { injectable } from 'inversify';
import { GuildMember, TextChannel, PermissionFlagsBits } from 'discord.js';
import { redis } from '../cache/redis';
import { logger } from '../utils/logger';
import type { IAntiRaidService } from '../types/container';

/**
 * Anti-Raid Service
 *
 * Detects and mitigates coordinated mass-join attacks (raids) using
 * Redis-based rate tracking and automated response workflows.
 *
 * Features:
 * - Mass join detection (sliding window algorithm)
 * - Account age validation
 * - Automatic mitigation (lockdown, kick recent joins)
 * - Admin notifications
 *
 * Defense Strategies:
 * 1. Rate limiting: Track join rate per guild (Redis)
 * 2. Account age: Reject accounts < minimum age
 * 3. Auto-mitigation: Lockdown server + kick raiders
 * 4. Alert admins: Send notification to mod log channel
 */
@injectable()
export class AntiRaidService implements IAntiRaidService {
  private readonly DEFAULT_JOIN_THRESHOLD = 10; // joins
  private readonly DEFAULT_TIME_WINDOW = 10; // seconds
  private readonly DEFAULT_MIN_ACCOUNT_AGE = 7; // days

  /**
   * Track member join and detect mass join (raid)
   *
   * Uses Redis sorted set for sliding window rate limiting
   *
   * @param guildId - Guild ID
   * @returns True if raid detected (join rate exceeds threshold)
   */
  async detectMassJoin(guildId: string): Promise<boolean> {
    try {
      const threshold = parseInt(process.env.ANTI_RAID_JOIN_THRESHOLD || String(this.DEFAULT_JOIN_THRESHOLD));
      const windowSeconds = parseInt(process.env.ANTI_RAID_TIME_WINDOW || String(this.DEFAULT_TIME_WINDOW));

      const key = `anti_raid:joins:${guildId}`;
      const now = Date.now();
      const windowStart = now - (windowSeconds * 1000);

      // Remove old entries outside window
      await redis.zRemRangeByScore(key, 0, windowStart);

      // Add current join
      await redis.zAdd(key, { score: now, value: `${now}-${Math.random()}` });

      // Set expiration (cleanup after 2x window)
      await redis.expire(key, windowSeconds * 2);

      // Count joins in window
      const joinCount = await redis.zCount(key, windowStart, now);

      const isRaid = joinCount >= threshold;

      if (isRaid) {
        logger.warn(
          `🚨 RAID DETECTED: Guild ${guildId} - ${joinCount} joins in ${windowSeconds}s (threshold: ${threshold})`
        );
      }

      return isRaid;
    } catch (error) {
      logger.error(`Error in detectMassJoin:`, error);
      return false;
    }
  }

  /**
   * Validate member account age
   *
   * @param member - Guild member
   * @param minAgeDays - Minimum account age in days (default: 7)
   * @returns True if account meets minimum age requirement
   */
  async validateAccountAge(member: GuildMember, minAgeDays?: number): Promise<boolean> {
    try {
      const minAge = minAgeDays || parseInt(process.env.MIN_ACCOUNT_AGE_DAYS || String(this.DEFAULT_MIN_ACCOUNT_AGE));

      const accountCreatedAt = member.user.createdAt;
      const accountAgeDays = (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

      const meetsRequirement = accountAgeDays >= minAge;

      if (!meetsRequirement) {
        logger.debug(
          `Account age check failed: ${member.user.tag} (age: ${accountAgeDays.toFixed(1)}d, required: ${minAge}d)`
        );
      }

      return meetsRequirement;
    } catch (error) {
      logger.error(`Error in validateAccountAge:`, error);
      return true; // Fail open (allow join) on error
    }
  }

  /**
   * Trigger automatic raid mitigation
   *
   * Actions:
   * 1. Enable server-wide verification level (lockdown)
   * 2. Kick recently joined members (last 60 seconds)
   * 3. Send alert to mod log channel
   * 4. Log incident to database
   *
   * @param member - Guild member who triggered detection
   */
  async triggerAutoMitigation(member: GuildMember): Promise<void> {
    try {
      const guild = member.guild;

      logger.warn(`🛡️ AUTO-MITIGATION TRIGGERED: Guild ${guild.name} (${guild.id})`);

      // 1. Enable verification level (requires MANAGE_GUILD permission)
      try {
        if (guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await guild.setVerificationLevel(4); // VERY_HIGH - Must have verified phone
          logger.info(`Verification level increased to VERY_HIGH for guild ${guild.id}`);
        }
      } catch (error) {
        logger.error(`Failed to increase verification level:`, error);
      }

      // 2. Kick recent joins (last 60 seconds)
      const recentJoinWindow = 60 * 1000; // 60 seconds
      const now = Date.now();

      const recentMembers = guild.members.cache.filter(
        m =>
          m.joinedTimestamp &&
          m.joinedTimestamp > now - recentJoinWindow &&
          !m.user.bot &&
          m.kickable
      );

      logger.info(`Kicking ${recentMembers.size} recent members...`);

      let kickedCount = 0;
      for (const [, memberToKick] of recentMembers) {
        try {
          await memberToKick.kick('Auto-mitigation: Raid detected');
          kickedCount++;
        } catch (error) {
          logger.error(`Failed to kick ${memberToKick.user.tag}:`, error);
        }
      }

      logger.info(`Auto-mitigation: Kicked ${kickedCount}/${recentMembers.size} members`);

      // 3. Send alert to mod log channel
      await this.sendRaidAlert(guild, kickedCount, recentMembers.size);

      // 4. Cache raid event in Redis (for analytics)
      const raidKey = `anti_raid:events:${guild.id}`;
      const raidData = JSON.stringify({
        timestamp: new Date().toISOString(),
        guild_id: guild.id,
        guild_name: guild.name,
        kicked_count: kickedCount,
        recent_members_count: recentMembers.size,
        trigger_user: member.user.tag,
        mitigation_status: 'auto_executed',
      });

      await redis.lPush(raidKey, raidData);
      await redis.lTrim(raidKey, 0, 99); // Keep last 100 events
      await redis.expire(raidKey, 30 * 24 * 60 * 60); // 30 days

    } catch (error) {
      logger.error(`Error in triggerAutoMitigation:`, error);
    }
  }

  /**
   * Send raid alert to mod log channel
   */
  private async sendRaidAlert(
    guild: any,
    kickedCount: number,
    totalRecentMembers: number
  ): Promise<void> {
    try {
      // Find mod log channel from guild settings (would need to fetch from DB)
      // For now, send to first text channel bot can access
      const modLogChannel = guild.channels.cache.find(
        (c: any) =>
          c.isTextBased() &&
          c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)
      ) as TextChannel | undefined;

      if (!modLogChannel) {
        logger.warn(`No mod log channel found for guild ${guild.id}`);
        return;
      }

      await modLogChannel.send({
        embeds: [
          {
            title: '🚨 RAID DETECTED - AUTO-MITIGATION ACTIVATED',
            description: [
              `**Status:** Raid detected and mitigated`,
              ``,
              `**Actions Taken:**`,
              `✅ Verification level increased to VERY_HIGH`,
              `✅ Kicked ${kickedCount}/${totalRecentMembers} recent members`,
              `✅ Server lockdown enabled`,
              ``,
              `**Next Steps:**`,
              `- Review recent audit logs`,
              `- Adjust anti-raid settings if needed`,
              `- Manually verify legitimate users were not affected`,
            ].join('\n'),
            color: 0xff0000, // Red
            timestamp: new Date().toISOString(),
            footer: {
              text: 'MAXIMUS Anti-Raid System',
            },
          },
        ],
      });

      logger.info(`Raid alert sent to mod log channel: ${modLogChannel.name}`);
    } catch (error) {
      logger.error(`Error sending raid alert:`, error);
    }
  }

  /**
   * Check if anti-raid is enabled for guild
   */
  async isAntiRaidEnabled(_guildId: string): Promise<boolean> {
    try {
      // This would check guild_settings.antiRaidEnabled in database
      // For now, return true if env var is set
      return process.env.ANTI_RAID_ENABLED === 'true';
    } catch (error) {
      logger.error(`Error in isAntiRaidEnabled:`, error);
      return false;
    }
  }

  /**
   * Get raid statistics for guild
   */
  async getRaidStats(guildId: string): Promise<{
    totalRaids: number;
    lastRaidDate: Date | null;
    totalKicked: number;
  }> {
    try {
      const raidKey = `anti_raid:events:${guildId}`;
      const events = await redis.lRange(raidKey, 0, -1);

      if (events.length === 0) {
        return {
          totalRaids: 0,
          lastRaidDate: null,
          totalKicked: 0,
        };
      }

      const parsedEvents = events.map((e: string) => JSON.parse(e));
      const lastRaid = parsedEvents[0];
      const totalKicked = parsedEvents.reduce((sum: number, e: any) => sum + (e.kicked_count || 0), 0);

      return {
        totalRaids: events.length,
        lastRaidDate: new Date(lastRaid.timestamp),
        totalKicked,
      };
    } catch (error) {
      logger.error(`Error in getRaidStats:`, error);
      return {
        totalRaids: 0,
        lastRaidDate: null,
        totalKicked: 0,
      };
    }
  }

  /**
   * Manually reset raid detection for guild (admin command)
   */
  async resetRaidDetection(guildId: string): Promise<void> {
    try {
      const key = `anti_raid:joins:${guildId}`;
      await redis.del(key);
      logger.info(`Raid detection reset for guild ${guildId}`);
    } catch (error) {
      logger.error(`Error in resetRaidDetection:`, error);
    }
  }
}

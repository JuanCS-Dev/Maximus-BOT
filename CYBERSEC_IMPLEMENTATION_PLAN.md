# ⚙️ MAXIMUS CYBERSEC IMPLEMENTATION PLAN

**Version:** 2.0
**Date:** 2025-10-28
**Status:** ⚠️ PLANNING ONLY - NO CODE IMPLEMENTED
**Adherence:** 100% DOUTRINA Vértice (Constitution v2.5)

> **⚠️ CRITICAL STATUS DISCLAIMER:**
> This document represents **PLANNING ONLY**. All code examples, file structures, and tasks
> are ASPIRATIONAL - nothing has been implemented. The project directory contains ONLY this
> planning document and two other markdown files. No package.json, no src/, no code exists.
> Phase 1 foundation must be built from scratch before any tasks below can be executed.

---

## 📋 Executive Summary

This implementation plan translates the **CYBERSEC_BLUEPRINT.md** and **CYBERSEC_ROADMAP.md** into **actionable, task-level instructions** with file paths, code structures, and TypeScript interfaces.

**Philosophy:** Simple, functional, lightweight. No overengineering. Every line of code serves a purpose.

**Method:** PPBPR (Prompt → Pesquisa → Blueprint → Plano → **Roadmap**)

**Reality Check:** 0% complete. All tasks below await Phase 1 initialization.

---

## 🎯 Implementation Principles (DOUTRINA)

**Artigo II (Padrão Pagani):**
- ❌ NO TODOs, placeholders, or mocks in production code
- ✅ Every commit is production-ready
- ✅ All tests pass before merge

**Artigo III (Confiança Zero):**
- ✅ Bot token in environment variables ONLY (never hardcoded)
- ✅ All user input sanitized
- ✅ Permission checks before every privileged action

**Artigo V (Legislação Prévia):**
- ✅ Security architecture designed BEFORE implementation
- ✅ Rate limiting and circuit breakers from day one

**Artigo I (Célula Híbrida):**
- Human (Juan): Vision, architecture, validation
- AI (Claude): Code generation, testing, documentation

---

## 📁 Project Structure (PLANNED - NOT CREATED)

> **⚠️ REALITY:** None of this structure exists yet. This is the target architecture after Phase 1.

```
discord-bot-vertice/
├── prisma/                        # NOT CREATED
│   └── schema.prisma              # Database schema (Phase 1 + extensions)
├── src/                           # NOT CREATED
│   ├── index.ts                   # Entry point + lifecycle (Phase 1)
│   ├── container.ts               # Inversify DI container (Phase 1 + new services)
│   ├── types/
│   │   ├── container.ts           # DI type definitions (Phase 1)
│   │   └── security.ts            # NEW: Security service interfaces
│   ├── services/                  # Business logic layer
│   │   ├── GuildService.ts        # Phase 1
│   │   ├── UserService.ts         # Phase 1
│   │   ├── WarningService.ts      # Phase 1
│   │   ├── ModerationService.ts   # Phase 1
│   │   ├── AuditLogService.ts     # Phase 1
│   │   ├── ThreatDetectionService.ts       # NEW: Phase 3.2
│   │   ├── ThreatIntelligenceService.ts    # NEW: Phase 3.1
│   │   ├── ForensicExportService.ts        # NEW: Phase 2.2
│   │   ├── IncidentResponseService.ts      # NEW: Phase 4.1
│   │   └── AntiRaidService.ts              # NEW: Phase 2.3
│   ├── commands/                  # Slash commands
│   │   ├── ban.ts                 # Phase 1
│   │   ├── kick.ts                # NEW: Phase 2.1
│   │   ├── mute.ts                # NEW: Phase 2.1
│   │   ├── unmute.ts              # NEW: Phase 2.1
│   │   ├── warn.ts                # NEW: Phase 2.1
│   │   ├── warnings.ts            # NEW: Phase 2.1
│   │   ├── clear-warnings.ts      # NEW: Phase 2.1
│   │   ├── purge.ts               # NEW: Phase 2.1
│   │   ├── slowmode.ts            # NEW: Phase 2.1
│   │   ├── lockdown.ts            # NEW: Phase 2.1
│   │   ├── unlock.ts              # NEW: Phase 2.1
│   │   ├── incident.ts            # NEW: Phase 4.2
│   │   └── privacy.ts             # NEW: Phase 2.2 (GDPR)
│   ├── events/                    # Discord event handlers
│   │   ├── ready.ts               # Phase 1
│   │   ├── messageCreate.ts       # NEW: Phase 3.2 (threat detection)
│   │   ├── messageDelete.ts       # NEW: Phase 2.2 (forensic logging)
│   │   ├── guildMemberAdd.ts      # NEW: Phase 2.3 (anti-raid)
│   │   ├── guildMemberUpdate.ts   # NEW: Phase 3.2 (anomaly detection)
│   │   ├── guildAuditLogEntryCreate.ts  # NEW: Phase 2.2 (SIEM export)
│   │   └── interactionCreate.ts   # NEW: Phase 4.1 (button handling)
│   ├── utils/                     # Shared utilities
│   │   ├── logger.ts              # Phase 1
│   │   ├── registerCommands.ts    # Phase 1
│   │   ├── loadEvents.ts          # Phase 1
│   │   └── chainOfCustody.ts      # NEW: Phase 2.2 (forensic hashing)
│   ├── database/                  # Prisma client (Phase 1)
│   │   ├── client.ts
│   │   └── utils.ts
│   └── cache/                     # Redis client (Phase 1)
│       ├── redis.ts
│       └── rateLimiter.ts
├── docker-compose.yml             # Phase 1 (PostgreSQL + Redis + Bot)
├── Dockerfile                     # Phase 1
├── tsconfig.json                  # Phase 1
├── package.json                   # Phase 1 + new dependencies
├── .env.example                   # Phase 1 + security extensions
├── .gitignore                     # Phase 1
├── README.md                      # Phase 1 (update with cybersec features)
├── CYBERSEC_BLUEPRINT.md          # This document's parent
├── CYBERSEC_ROADMAP.md            # Timeline
└── CYBERSEC_IMPLEMENTATION_PLAN.md # This document
```

---

## 🏗️ PHASE 1: ENTERPRISE FOUNDATION (NOT STARTED)

> **⚠️ CRITICAL:** This phase MUST be completed first. Currently 0% complete.
> All tasks below are BLOCKED until Phase 1 is finished.

**Goal:** Initialize project from scratch with TypeScript, Discord.js, PostgreSQL, Redis, Inversify

**Status:** ⚪ NOT STARTED - All tasks are planning only

**Key Tasks:**
1. ⚪ Initialize npm project (package.json, tsconfig.json)
2. ⚪ Install dependencies (discord.js, @prisma/client, ioredis, inversify, etc.)
3. ⚪ Create project directory structure (src/, prisma/, docker-compose.yml)
4. ⚪ Setup PostgreSQL database with Prisma schema
5. ⚪ Setup Redis cache and rate limiter
6. ⚪ Create Discord bot client and Gateway connection
7. ⚪ Implement Inversify DI container
8. ⚪ Create 5 base services: GuildService, UserService, WarningService, ModerationService, AuditLogService
9. ⚪ Define 7 Prisma models: guilds, guild_settings, users, warnings, custom_commands, reaction_roles, audit_logs
10. ⚪ Verify bot connects to Discord and database

**Estimated Duration:** 2 weeks

---

## 🔧 PHASE 2: CORE SECURITY OPERATIONS (BLOCKED)

> **⚠️ STATUS:** All Phase 2 tasks are BLOCKED until Phase 1 completes.
> All code examples below are PLANNING ONLY - no files exist yet.

### Phase 2.1: Basic Moderation Commands (Week 1)

#### Task 2.1.1: `/kick` Command ⚪ NOT STARTED
**File:** `src/commands/kick.ts` (DOES NOT EXIST YET)
**Dependencies:** `ModerationService`, `AuditLogService` (NOT IMPLEMENTED YET)

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getService } from '../container';
import { TYPES, IModerationService, IAuditLogService } from '../types/container';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a user from the server')
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to kick')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for the kick')
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const modService = getService<IModerationService>(TYPES.ModerationService);
  const auditService = getService<IAuditLogService>(TYPES.AuditLogService);

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  // Permission check: bot's role must be higher than target
  const member = await interaction.guild!.members.fetch(user.id);
  const botMember = await interaction.guild!.members.fetch(interaction.client.user!.id);

  if (member.roles.highest.position >= botMember.roles.highest.position) {
    return interaction.reply({ content: 'Cannot kick this user (role hierarchy).', ephemeral: true });
  }

  // Execute kick
  await modService.kickUser(user.id, interaction.guildId!, reason, interaction.user.id);

  // Log to audit
  await auditService.logAction({
    guildId: interaction.guildId!,
    action: 'MEMBER_KICK',
    moderatorId: interaction.user.id,
    moderatorTag: interaction.user.tag,
    targetUserId: user.id,
    targetUserTag: user.tag,
    reason
  });

  await interaction.reply({ content: `✅ Kicked ${user.tag}. Reason: ${reason}` });
}
```

**Acceptance Criteria:**
- ✅ Role hierarchy check prevents privilege escalation
- ✅ Action logged to `audit_logs` table
- ✅ Error handling for API failures (404, 403, 429)

#### Task 2.1.2: `/mute` Command
**File:** `src/commands/mute.ts`

```typescript
export const data = new SlashCommandBuilder()
  .setName('mute')
  .setDescription('Timeout a user')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to mute')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('duration')
      .setDescription('Duration in minutes (max 40320 = 28 days)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(40320))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for the mute')
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  const duration = interaction.options.getInteger('duration', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  const member = await interaction.guild!.members.fetch(user.id);
  const timeoutMs = duration * 60 * 1000;

  // Discord timeout (native feature)
  await member.timeout(timeoutMs, reason);

  // Log to audit
  await auditService.logAction({
    guildId: interaction.guildId!,
    action: 'MEMBER_TIMEOUT',
    moderatorId: interaction.user.id,
    moderatorTag: interaction.user.tag,
    targetUserId: user.id,
    targetUserTag: user.tag,
    reason,
    metadata: { duration_minutes: duration }
  });

  await interaction.reply({ content: `✅ Muted ${user.tag} for ${duration} minutes.` });
}
```

#### Task 2.1.3: `/warn` Command with Auto-Escalation
**File:** `src/commands/warn.ts`

```typescript
export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  const warningService = getService<IWarningService>(TYPES.WarningService);

  // Issue warning
  await warningService.addWarning(user.id, interaction.guildId!, reason, interaction.user.id, interaction.user.tag);

  // Get total active warnings
  const warnings = await warningService.getWarnings(user.id, interaction.guildId!);
  const activeCount = warnings.filter(w => w.active).length;

  // Auto-escalation logic
  if (activeCount >= 5) {
    await modService.kickUser(user.id, interaction.guildId!, 'Exceeded warning limit (5)', interaction.client.user!.id);
    await interaction.reply({ content: `⚠️ Warning issued. User kicked for exceeding limit (${activeCount}/5).` });
  } else if (activeCount >= 3) {
    const member = await interaction.guild!.members.fetch(user.id);
    await member.timeout(24 * 60 * 60 * 1000, 'Auto-mute: 3+ warnings'); // 24h timeout
    await interaction.reply({ content: `⚠️ Warning issued. User muted for 24h (${activeCount}/5 warnings).` });
  } else {
    await interaction.reply({ content: `⚠️ Warning issued to ${user.tag}. (${activeCount}/5 warnings)` });
  }
}
```

#### Task 2.1.4: `/purge` Command
**File:** `src/commands/purge.ts`

```typescript
export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Bulk delete messages')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption(option =>
    option.setName('count')
      .setDescription('Number of messages to delete (1-100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100));

export async function execute(interaction: ChatInputCommandInteraction) {
  const count = interaction.options.getInteger('count', true);

  // Fetch messages
  const messages = await interaction.channel!.messages.fetch({ limit: count });

  // Bulk delete (Discord API limitation: messages must be <14 days old)
  const deleted = await interaction.channel!.bulkDelete(messages, true);

  await auditService.logAction({
    guildId: interaction.guildId!,
    action: 'MESSAGE_BULK_DELETE',
    moderatorId: interaction.user.id,
    moderatorTag: interaction.user.tag,
    metadata: { messages_deleted: deleted.size }
  });

  await interaction.reply({ content: `🗑️ Deleted ${deleted.size} messages.`, ephemeral: true });
}
```

**Remaining Commands (Week 1):**
- `/unmute` - Remove timeout
- `/warnings` - View user warnings (paginated embed)
- `/clear-warnings` - Admin-only, clear all warnings for user
- `/slowmode` - Set channel slowmode (0-21600 seconds)
- `/lockdown` - Deny SEND_MESSAGES for @everyone
- `/unlock` - Restore channel permissions

**Total Files:** 10 new command files

---

### Phase 2.2: Forensic Export & SIEM Integration (Week 2)

#### Task 2.2.1: Database Schema Extension
**File:** `prisma/schema.prisma`

Add new models:

```prisma
model ArchivedAuditLog {
  id                String   @id @default(cuid())
  guildId           String
  guild             Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  discordAuditLogId String   @unique
  actionType        String   // MEMBER_BAN_ADD, ROLE_UPDATE, etc.

  actorId           String?
  actorTag          String?

  targetId          String?
  targetTag         String?

  reason            String?
  changes           Json?    // Before/after state

  chainOfCustodyHash String  @unique

  exportedToSIEM    Boolean  @default(false)
  siemExportDate    DateTime?

  createdAt         DateTime

  @@index([guildId, actionType, createdAt])
  @@index([chainOfCustodyHash])
}

model ThreatDetection {
  id             String   @id @default(cuid())
  guildId        String
  guild          Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  messageId      String?
  userId         String
  username       String

  threatType     String   // phishing_url, malware_attachment, toxicity, raid
  threatScore    Int      // 0-100
  ioc            String?  // Indicator of compromise

  mispEventId    String?
  openCTIId      String?

  actionTaken    String   // delete_message, ban_user, timeout_user, alert_only, none

  metadata       Json?

  createdAt      DateTime @default(now())

  @@index([guildId, createdAt])
  @@index([threatType, threatScore])
}

model IncidentCase {
  id              String   @id @default(cuid())
  guildId         String
  guild           Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  incidentType    String
  severity        String   // low, medium, high, critical
  status          String   // open, investigating, resolved, closed

  channelId       String

  assignedAnalyst String?

  relatedThreats  String[] // Array of ThreatDetection IDs

  timeline        Json     // Array of timestamped events

  externalTicketId String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  closedAt        DateTime?

  @@index([guildId, status, severity])
}
```

**Run migration:**
```bash
npm run prisma:migrate dev --name add_security_models
```

#### Task 2.2.2: Chain of Custody Utility
**File:** `src/utils/chainOfCustody.ts`

```typescript
import crypto from 'crypto';
import { AuditLogEntry } from 'discord.js';

/**
 * Generates SHA-256 hash for forensic chain of custody
 * Ensures integrity of audit log data for legal admissibility
 */
export function generateChainOfCustody(entry: AuditLogEntry): string {
  const data = JSON.stringify({
    id: entry.id,
    action: entry.actionType,
    timestamp: entry.createdAt.toISOString(),
    executor: entry.executorId,
    target: entry.targetId,
    changes: entry.changes
  }, null, 0); // No whitespace for deterministic hash

  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verifies integrity of archived audit log
 * @returns true if hash matches, false if tampered
 */
export function verifyChainOfCustody(entry: any, storedHash: string): boolean {
  const recomputedHash = crypto.createHash('sha256')
    .update(JSON.stringify(entry, null, 0))
    .digest('hex');

  return recomputedHash === storedHash;
}
```

#### Task 2.2.3: ForensicExportService
**File:** `src/services/ForensicExportService.ts`

```typescript
import { injectable } from 'inversify';
import { AuditLogEntry } from 'discord.js';
import { prisma } from '../database/client';
import { generateChainOfCustody } from '../utils/chainOfCustody';
import axios from 'axios';

@injectable()
export class ForensicExportService implements IForensicExportService {
  async exportToSIEM(entry: AuditLogEntry): Promise<void> {
    const hash = generateChainOfCustody(entry);

    // Cache locally first (transaction ensures atomicity)
    await this.cacheAuditLog(entry, hash);

    // Determine SIEM type from guild settings
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: entry.guild!.id }
    });

    if (!settings?.siemEnabled) return;

    if (settings.siemType === 'splunk') {
      await this.exportToSplunk(entry, hash, settings.siemURL!, settings.siemAPIKey!);
    } else if (settings.siemType === 'elasticsearch') {
      await this.exportToElasticsearch(entry, hash, settings.siemURL!, settings.siemAPIKey!);
    }

    // Mark as exported
    await prisma.archivedAuditLog.update({
      where: { discordAuditLogId: entry.id },
      data: {
        exportedToSIEM: true,
        siemExportDate: new Date()
      }
    });
  }

  async cacheAuditLog(entry: AuditLogEntry, hash: string): Promise<void> {
    await prisma.archivedAuditLog.create({
      data: {
        guildId: entry.guild!.id,
        discordAuditLogId: entry.id,
        actionType: entry.actionType.toString(),
        actorId: entry.executorId || undefined,
        actorTag: entry.executor?.tag || undefined,
        targetId: entry.targetId || undefined,
        targetTag: entry.target?.tag || undefined,
        reason: entry.reason || undefined,
        changes: entry.changes as any,
        chainOfCustodyHash: hash,
        createdAt: entry.createdAt
      }
    });
  }

  private async exportToSplunk(entry: AuditLogEntry, hash: string, url: string, token: string): Promise<void> {
    const payload = {
      event: {
        timestamp: entry.createdAt.toISOString(),
        source: 'maximus_bot',
        sourcetype: 'discord:audit_log',
        event: {
          guild_id: entry.guild!.id,
          event_type: entry.actionType,
          actor: {
            user_id: entry.executorId,
            username: entry.executor?.tag
          },
          target: {
            user_id: entry.targetId,
            username: entry.target?.tag
          },
          reason: entry.reason,
          chain_of_custody_hash: hash
        }
      }
    };

    await axios.post(url, payload, {
      headers: {
        'Authorization': `Splunk ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async exportToElasticsearch(entry: AuditLogEntry, hash: string, url: string, apiKey: string): Promise<void> {
    const payload = {
      '@timestamp': entry.createdAt.toISOString(),
      source: 'maximus_bot',
      guild_id: entry.guild!.id,
      event_type: entry.actionType,
      actor_id: entry.executorId,
      target_id: entry.targetId,
      chain_of_custody_hash: hash
    };

    await axios.post(`${url}/discord-audit-logs/_doc`, payload, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  generateChainOfCustody(entry: AuditLogEntry): string {
    return generateChainOfCustody(entry);
  }

  async batchExportAuditLogs(guildId: string, startDate: Date, endDate: Date): Promise<void> {
    // Fetch from Discord API (limited to last 45 days)
    const guild = await client.guilds.fetch(guildId);
    const auditLogs = await guild.fetchAuditLogs({
      limit: 100 // Max per request
    });

    for (const entry of auditLogs.entries.values()) {
      if (entry.createdAt >= startDate && entry.createdAt <= endDate) {
        await this.exportToSIEM(entry);
      }
    }
  }
}
```

#### Task 2.2.4: Event Handler - Real-Time SIEM Export
**File:** `src/events/guildAuditLogEntryCreate.ts`

```typescript
import { Client, AuditLogEntry } from 'discord.js';
import { getService } from '../container';
import { TYPES, IForensicExportService } from '../types/container';

export const name = 'guildAuditLogEntryCreate';

export async function execute(auditLogEntry: AuditLogEntry, guild: Guild) {
  const forensicService = getService<IForensicExportService>(TYPES.ForensicExportService);

  // Export to SIEM in real-time
  await forensicService.exportToSIEM(auditLogEntry);

  console.log(`[FORENSIC] Exported audit log entry: ${auditLogEntry.actionType} by ${auditLogEntry.executor?.tag}`);
}
```

**Acceptance Criteria:**
- ✅ All audit log entries archived to PostgreSQL
- ✅ SHA-256 hash generated for chain of custody
- ✅ Real-time export to SIEM within 1 second
- ✅ Batch export job functional

---

### Phase 2.3: Anti-Raid System (Week 3)

#### Task 2.3.1: AntiRaidService
**File:** `src/services/AntiRaidService.ts`

```typescript
import { injectable } from 'inversify';
import { Snowflake, GuildMember, Guild } from 'discord.js';
import { redis } from '../cache/redis';
import { randomUUID } from 'crypto';

@injectable()
export class AntiRaidService implements IAntiRaidService {
  async detectMassJoin(guildId: Snowflake): Promise<boolean> {
    const key = `antiraid:joins:${guildId}`;
    const now = Date.now();
    const windowMs = 10000; // 10 seconds

    // Add current join to sorted set
    await redis.zadd(key, now, `${now}:${randomUUID()}`);

    // Remove joins outside the window
    await redis.zremrangebyscore(key, 0, now - windowMs);

    // Set expiry on key (cleanup)
    await redis.expire(key, 60);

    // Count joins in window
    const joinCount = await redis.zcard(key);

    // Get threshold from guild settings
    const threshold = await this.getJoinRateThreshold(guildId);

    return joinCount > threshold;
  }

  async enforceCAPTCHA(member: GuildMember): Promise<void> {
    // Discord native verification level (CAPTCHA equivalent)
    const guild = member.guild;
    await guild.setVerificationLevel(4); // HIGHEST - requires phone verification
  }

  async triggerAutoMitigation(guildId: Snowflake): Promise<void> {
    const guild = await client.guilds.fetch(guildId);

    // 1. Pause invites
    const invites = await guild.invites.fetch();
    for (const invite of invites.values()) {
      await invite.delete('Anti-raid mitigation');
    }

    // 2. Set verification to HIGHEST
    await guild.setVerificationLevel(4);

    // 3. Kick recent joins (last 60 seconds)
    const recentJoins = await this.getRecentJoins(guildId, 60000);
    for (const memberId of recentJoins) {
      try {
        await guild.members.kick(memberId, 'Anti-raid auto-mitigation');
      } catch (error) {
        console.error(`Failed to kick ${memberId}:`, error);
      }
    }

    // 4. Alert admins
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId }
    });

    if (settings?.socAlertsChannelId) {
      const channel = await guild.channels.fetch(settings.socAlertsChannelId);
      if (channel?.isTextBased()) {
        await channel.send(`🚨 **RAID DETECTED** - Auto-mitigation triggered. ${recentJoins.length} recent joins kicked.`);
      }
    }

    // 5. Log incident
    await prisma.incidentCase.create({
      data: {
        guildId,
        incidentType: 'raid',
        severity: 'high',
        status: 'open',
        channelId: settings?.socAlertsChannelId || '',
        timeline: [
          {
            timestamp: new Date().toISOString(),
            event: 'Raid detected',
            joins_kicked: recentJoins.length
          }
        ]
      }
    });
  }

  async validateAccountAge(member: GuildMember, minAgeDays: number): Promise<boolean> {
    const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
    return accountAgeDays >= minAgeDays;
  }

  private async getJoinRateThreshold(guildId: Snowflake): Promise<number> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId }
    });
    return settings?.joinRateThreshold || 10;
  }

  private async getRecentJoins(guildId: Snowflake, windowMs: number): Promise<string[]> {
    const key = `antiraid:recent:${guildId}`;
    const now = Date.now();

    const members = await redis.zrangebyscore(key, now - windowMs, now);
    return members.map(m => m.split(':')[1]); // Extract member ID from "timestamp:memberID"
  }
}
```

#### Task 2.3.2: Event Handler - Anti-Raid Detection
**File:** `src/events/guildMemberAdd.ts`

```typescript
import { GuildMember } from 'discord.js';
import { getService } from '../container';
import { TYPES, IAntiRaidService } from '../types/container';

export const name = 'guildMemberAdd';

export async function execute(member: GuildMember) {
  const antiRaidService = getService<IAntiRaidService>(TYPES.AntiRaidService);

  // Track join in Redis
  const key = `antiraid:recent:${member.guild.id}`;
  await redis.zadd(key, Date.now(), `${Date.now()}:${member.id}`);
  await redis.expire(key, 300); // 5 min TTL

  // Check account age
  const minAge = 7; // 7 days
  const isValidAge = await antiRaidService.validateAccountAge(member, minAge);

  if (!isValidAge) {
    await member.kick('Account too new - anti-raid protection');
    console.log(`[ANTI-RAID] Kicked ${member.user.tag} (account age < ${minAge} days)`);
    return;
  }

  // Check for raid
  const isRaid = await antiRaidService.detectMassJoin(member.guild.id);

  if (isRaid) {
    console.log(`[ANTI-RAID] RAID DETECTED on ${member.guild.name}`);
    await antiRaidService.triggerAutoMitigation(member.guild.id);
  }
}
```

**Acceptance Criteria:**
- ✅ Detects >10 joins/10 seconds
- ✅ Account age validation prevents bot accounts
- ✅ Auto-mitigation within 2 seconds
- ✅ Admin alert sent to #soc-alerts

---

## 🔍 PHASE 3: THREAT INTELLIGENCE INTEGRATION

### Phase 3.1: MISP Integration (Week 5)

#### Task 3.1.1: ThreatIntelligenceService - MISP Module
**File:** `src/services/ThreatIntelligenceService.ts`

```typescript
import { injectable } from 'inversify';
import axios, { AxiosInstance } from 'axios';

interface MISPAttribute {
  id: string;
  event_id: string;
  type: string;
  value: string;
  category: string;
  to_ids: boolean;
}

interface MISPEvent {
  id: string;
  info: string;
  threat_level_id: number;
  Attribute: MISPAttribute[];
}

@injectable()
export class ThreatIntelligenceService implements IThreatIntelligenceService {
  private mispClient: AxiosInstance;

  constructor() {
    this.mispClient = axios.create({
      baseURL: process.env.MISP_URL,
      headers: {
        'Authorization': process.env.MISP_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async queryMISP(ioc: string, iocType: IOCType): Promise<MISPEvent | null> {
    try {
      const response = await this.mispClient.post('/attributes/restSearch', {
        value: ioc,
        type: iocType,
        to_ids: true,
        enforceWarninglist: true
      });

      const attributes = response.data.response?.Attribute || [];
      if (attributes.length === 0) return null;

      // Return the event associated with the first matching attribute
      const eventId = attributes[0].event_id;
      const eventResponse = await this.mispClient.get(`/events/view/${eventId}`);

      return eventResponse.data.Event;
    } catch (error) {
      console.error('[MISP] Query failed:', error);
      return null;
    }
  }

  async reportSighting(ioc: string, guildId: string): Promise<void> {
    try {
      await this.mispClient.post('/sightings/add', {
        value: ioc,
        source: `discord:${guildId}`,
        type: 0 // Sighting (not false positive)
      });

      console.log(`[MISP] Reported sighting: ${ioc}`);
    } catch (error) {
      console.error('[MISP] Failed to report sighting:', error);
    }
  }

  async createMISPEvent(threat: ThreatData, guildId: string): Promise<MISPEvent> {
    const event = {
      info: `Discord Threat: ${threat.type}`,
      threat_level_id: 2, // Medium
      analysis: 0, // Initial
      distribution: 1, // Community only
      Attribute: [
        {
          type: threat.iocType,
          value: threat.ioc,
          category: 'Network activity',
          to_ids: true,
          comment: `Detected on Discord guild ${guildId} at ${new Date().toISOString()}`
        }
      ],
      Tag: [
        { name: 'tlp:white' },
        { name: 'source:discord' },
        { name: `guild:${guildId}` }
      ]
    };

    const response = await this.mispClient.post('/events/add', event);
    console.log(`[MISP] Created event: ${response.data.Event.id}`);

    return response.data.Event;
  }

  // OpenCTI and Vértice methods to be implemented in Phase 3.3
  async queryOpenCTI(indicator: string): Promise<OpenCTIIndicator | null> {
    throw new Error('Not implemented yet');
  }

  async forwardToVerticeMaximus(threat: ThreatData): Promise<void> {
    throw new Error('Not implemented yet');
  }
}
```

#### Task 3.1.2: Environment Configuration
**File:** `.env.example` (update)

```bash
# Phase 1 (existing)
BOT_TOKEN=your_discord_bot_token
DATABASE_URL=postgresql://user:password@localhost:5432/maximus
REDIS_URL=redis://localhost:6379

# Phase 3.1 - MISP Integration
MISP_URL=https://misp.example.com
MISP_API_KEY=your_misp_api_key

# Phase 3.3 - OpenCTI Integration
OPENCTI_URL=https://opencti.example.com
OPENCTI_API_KEY=your_opencti_api_key

# Phase 3.3 - Vértice-MAXIMUS Integration
VERTICE_MAXIMUS_API_URL=https://vertice.example.com/api
VERTICE_API_KEY=your_vertice_api_key

# Phase 2.2 - SIEM Integration
SIEM_TYPE=splunk # or elasticsearch
SIEM_URL=https://splunk.example.com:8088/services/collector
SIEM_API_KEY=your_siem_hec_token
```

**Acceptance Criteria:**
- ✅ Successfully query MISP for known IOCs
- ✅ Report sightings back to MISP
- ✅ Create new MISP events for novel threats
- ✅ Error handling for MISP downtime (graceful degradation)

---

### Phase 3.2: Real-Time Threat Detection Pipeline (Week 6)

#### Task 3.2.1: ThreatDetectionService
**File:** `src/services/ThreatDetectionService.ts`

```typescript
import { injectable } from 'inversify';
import { Message } from 'discord.js';
import axios from 'axios';
import crypto from 'crypto';

@injectable()
export class ThreatDetectionService implements IThreatDetectionService {
  async analyzeMessage(message: Message): Promise<ThreatAnalysisResult> {
    const results: Partial<ThreatAnalysisResult> = {
      threatScore: 0,
      threatType: 'none',
      ioc: null,
      metadata: {}
    };

    // 1. URL extraction and reputation check
    const urls = this.extractURLs(message.content);
    if (urls.length > 0) {
      const urlResult = await this.checkURLReputation(urls[0]);
      if (urlResult.malicious) {
        results.threatScore = 90;
        results.threatType = 'phishing_url';
        results.ioc = urls[0];
        results.iocType = 'url';
        results.metadata!.url_reputation = urlResult;
      }
    }

    // 2. Attachment scanning
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first()!;
      const hash = await this.calculateFileHash(attachment.url);
      const scanResult = await this.scanFileAttachment(attachment.url, hash);

      if (scanResult.malicious) {
        results.threatScore = Math.max(results.threatScore, scanResult.score);
        results.threatType = 'malware_attachment';
        results.ioc = hash;
        results.iocType = 'sha256';
        results.metadata!.virustotal = scanResult;
      }
    }

    // 3. NLP toxicity scoring (TODO: Phase 4.3 - implement LLM model)
    // For now, simple keyword matching
    const toxicKeywords = ['[REDACTED]']; // Placeholder
    const containsToxic = toxicKeywords.some(k => message.content.toLowerCase().includes(k));
    if (containsToxic) {
      results.threatScore = Math.max(results.threatScore, 70);
      results.threatType = 'toxicity';
    }

    return results as ThreatAnalysisResult;
  }

  async checkURLReputation(url: string): Promise<URLReputationResult> {
    // Google Safe Browsing API (simplified)
    try {
      const response = await axios.post(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_KEY}`,
        {
          client: {
            clientId: 'maximus-bot',
            clientVersion: '2.0'
          },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }]
          }
        }
      );

      const malicious = response.data.matches && response.data.matches.length > 0;

      return {
        malicious,
        score: malicious ? 95 : 0,
        source: 'google_safe_browsing',
        details: response.data.matches || []
      };
    } catch (error) {
      console.error('[THREAT DETECTION] URL check failed:', error);
      return { malicious: false, score: 0, source: 'error' };
    }
  }

  async scanFileAttachment(fileUrl: string, hash: string): Promise<MalwareScanResult> {
    // VirusTotal API
    try {
      const response = await axios.get(
        `https://www.virustotal.com/api/v3/files/${hash}`,
        {
          headers: {
            'x-apikey': process.env.VIRUSTOTAL_API_KEY
          }
        }
      );

      const stats = response.data.data.attributes.last_analysis_stats;
      const detectionRatio = stats.malicious / (stats.malicious + stats.undetected);

      return {
        malicious: stats.malicious > 0,
        score: Math.floor(detectionRatio * 100),
        detectionRatio: `${stats.malicious}/${stats.malicious + stats.undetected}`,
        virusTotalLink: `https://www.virustotal.com/gui/file/${hash}`
      };
    } catch (error) {
      console.error('[THREAT DETECTION] VirusTotal scan failed:', error);
      return { malicious: false, score: 0 };
    }
  }

  async detectBehavioralAnomaly(userId: string, action: AuditAction): Promise<AnomalyResult> {
    // Placeholder for Phase 3.2 advanced implementation
    // Track user action rate in Redis, detect spikes
    const key = `anomaly:${userId}:${action}`;
    const count = await redis.incr(key);
    await redis.expire(key, 60); // 1 minute window

    const threshold = 5; // 5 actions per minute
    const isAnomaly = count > threshold;

    return {
      isAnomaly,
      severity: isAnomaly ? 'high' : 'low',
      actionCount: count,
      threshold
    };
  }

  private extractURLs(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    return text.match(urlRegex) || [];
  }

  private async calculateFileHash(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return crypto.createHash('sha256').update(Buffer.from(response.data)).digest('hex');
  }
}
```

#### Task 3.2.2: Event Handler - Message Analysis
**File:** `src/events/messageCreate.ts`

```typescript
import { Message } from 'discord.js';
import { getService } from '../container';
import { TYPES, IThreatDetectionService, IThreatIntelligenceService, IForensicExportService, IIncidentResponseService } from '../types/container';

export const name = 'messageCreate';

export async function execute(message: Message) {
  if (message.author.bot) return;
  if (!message.guild) return; // DMs not monitored

  const threatDetectionService = getService<IThreatDetectionService>(TYPES.ThreatDetectionService);
  const threatIntelService = getService<IThreatIntelligenceService>(TYPES.ThreatIntelligenceService);
  const forensicService = getService<IForensicExportService>(TYPES.ForensicExportService);
  const incidentService = getService<IIncidentResponseService>(TYPES.IncidentResponseService);

  // 1. Analyze message
  const result = await threatDetectionService.analyzeMessage(message);

  // 2. Enrich with MISP if IOC detected
  if (result.ioc && result.threatScore > 50) {
    const mispData = await threatIntelService.queryMISP(result.ioc, result.iocType!);
    result.mispEventId = mispData?.id;
  }

  // 3. Take action based on severity
  if (result.threatScore >= 80) {
    // HIGH SEVERITY - Auto-action
    await message.delete();
    await message.member!.ban({ reason: `Threat detected: ${result.threatType}` });

    // Report sighting to MISP
    if (result.ioc) {
      await threatIntelService.reportSighting(result.ioc, message.guildId!);
    }

    // Log to database
    await prisma.threatDetection.create({
      data: {
        guildId: message.guildId!,
        messageId: message.id,
        userId: message.author.id,
        username: message.author.tag,
        threatType: result.threatType,
        threatScore: result.threatScore,
        ioc: result.ioc,
        mispEventId: result.mispEventId,
        actionTaken: 'ban_user',
        metadata: result.metadata
      }
    });

    // Export to SIEM
    await forensicService.exportToSIEM({
      event_type: 'THREAT_DETECTED',
      severity: 'HIGH',
      ...result
    } as any);

    // Create interactive alert (Phase 4.1)
    await incidentService.createInteractiveAlert(result, message);

    console.log(`[THREAT] HIGH severity detected: ${result.threatType} by ${message.author.tag}`);
  } else if (result.threatScore >= 50) {
    // MEDIUM - Alert only
    await incidentService.createInteractiveAlert(result, message);

    console.log(`[THREAT] MEDIUM severity detected: ${result.threatType} by ${message.author.tag}`);
  } else {
    // LOW - Log only
    console.log(`[THREAT] Low score (${result.threatScore}): ${message.author.tag}`);
  }
}
```

**Acceptance Criteria:**
- ✅ Detects phishing URLs with 95%+ accuracy (Google Safe Browsing)
- ✅ Scans file attachments within 2 seconds (VirusTotal)
- ✅ Automated response within 3 seconds of detection
- ✅ All detections logged to database + SIEM

---

## 💬 PHASE 4: CHATOPS & INTERACTIVE RESPONSE

### Phase 4.1: Interactive Alert System (Week 8)

#### Task 4.1.1: IncidentResponseService
**File:** `src/services/IncidentResponseService.ts`

```typescript
import { injectable } from 'inversify';
import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction } from 'discord.js';

@injectable()
export class IncidentResponseService implements IIncidentResponseService {
  async createInteractiveAlert(threat: ThreatAnalysisResult, message: Message): Promise<void> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guildId! }
    });

    if (!settings?.socAlertsChannelId) return;

    const socChannel = await message.guild!.channels.fetch(settings.socAlertsChannelId);
    if (!socChannel?.isTextBased()) return;

    const color = threat.threatScore >= 80 ? 0xFF0000 : 0xFFA500; // Red or orange

    const embed = new EmbedBuilder()
      .setTitle(`${threat.threatScore >= 80 ? '🚨' : '⚠️'} Threat Detected`)
      .setColor(color)
      .addFields(
        { name: 'Severity', value: threat.threatScore >= 80 ? 'HIGH' : 'MEDIUM', inline: true },
        { name: 'Threat Type', value: threat.threatType, inline: true },
        { name: 'Threat Score', value: `${threat.threatScore}/100`, inline: true },
        { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: false },
        { name: 'IOC', value: threat.ioc || 'N/A', inline: false },
        { name: 'MISP Event', value: threat.mispEventId ? `[View](${process.env.MISP_URL}/events/view/${threat.mispEventId})` : 'Not in MISP', inline: false },
        { name: 'Message Link', value: message.url, inline: false }
      )
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ban:${message.author.id}:${message.id}`)
          .setLabel('Ban User')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`timeout:${message.author.id}:${message.id}`)
          .setLabel('Timeout 24h')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`delete:${message.id}`)
          .setLabel('Delete Message')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ignore:${message.id}`)
          .setLabel('Ignore')
          .setStyle(ButtonStyle.Secondary)
      );

    await socChannel.send({ embeds: [embed], components: [row] });
  }

  async handleInteractionResponse(interaction: ButtonInteraction): Promise<void> {
    const [action, targetId, messageId] = interaction.customId.split(':');

    try {
      if (action === 'ban') {
        await interaction.guild!.members.ban(targetId, { reason: `Analyst action: ${interaction.user.tag}` });
        await this.updateAlertStatus(interaction.message.id, 'User Banned', interaction.user.tag);
        await interaction.reply({ content: '✅ User banned.', ephemeral: true });
      } else if (action === 'timeout') {
        const member = await interaction.guild!.members.fetch(targetId);
        await member.timeout(24 * 60 * 60 * 1000, `Analyst action: ${interaction.user.tag}`);
        await this.updateAlertStatus(interaction.message.id, 'User Timed Out (24h)', interaction.user.tag);
        await interaction.reply({ content: '✅ User timed out for 24 hours.', ephemeral: true });
      } else if (action === 'delete') {
        const message = await interaction.channel!.messages.fetch(messageId);
        await message.delete();
        await this.updateAlertStatus(interaction.message.id, 'Message Deleted', interaction.user.tag);
        await interaction.reply({ content: '✅ Message deleted.', ephemeral: true });
      } else if (action === 'ignore') {
        await this.updateAlertStatus(interaction.message.id, 'Ignored', interaction.user.tag);
        await interaction.reply({ content: '✅ Alert ignored.', ephemeral: true });
      }
    } catch (error) {
      console.error('[INCIDENT RESPONSE] Action failed:', error);
      await interaction.reply({ content: '❌ Action failed. Check logs.', ephemeral: true });
    }
  }

  async updateAlertStatus(messageId: string, action: string, analyst: string): Promise<void> {
    const channel = await client.channels.fetch(process.env.SOC_ALERTS_CHANNEL_ID!);
    if (!channel?.isTextBased()) return;

    const message = await channel.messages.fetch(messageId);
    const embed = message.embeds[0];

    const updatedEmbed = EmbedBuilder.from(embed)
      .addFields({ name: '✅ Action Taken', value: `${action} by ${analyst}` });

    await message.edit({ embeds: [updatedEmbed], components: [] }); // Remove buttons
  }

  async startIncidentPlaybook(incidentType: string, guildId: string): Promise<void> {
    // Implemented in Phase 4.2
    throw new Error('Not implemented yet');
  }
}
```

#### Task 4.1.2: Event Handler - Button Interactions
**File:** `src/events/interactionCreate.ts`

```typescript
import { Interaction } from 'discord.js';
import { getService } from '../container';
import { TYPES, IIncidentResponseService } from '../types/container';

export const name = 'interactionCreate';

export async function execute(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    // Existing slash command handling
    const command = client.commands.get(interaction.commandName);
    if (command) {
      await command.execute(interaction);
    }
  } else if (interaction.isButton()) {
    // NEW: Button interaction handling
    const incidentService = getService<IIncidentResponseService>(TYPES.IncidentResponseService);
    await incidentService.handleInteractionResponse(interaction);
  }
}
```

**Acceptance Criteria:**
- ✅ Alerts posted to #soc-alerts within 1 second
- ✅ Buttons functional and responsive
- ✅ Alert message updated with action taken
- ✅ Audit trail includes analyst name

---

## 🌐 PHASE 5: ENTERPRISE SCALING (Optional)

### Phase 5.1: Discord Hybrid Sharding (Week 11)

**File:** `src/sharding.ts` (new)

```typescript
import { ShardingManager } from 'discord.js';

const manager = new ShardingManager('./dist/index.js', {
  token: process.env.BOT_TOKEN!,
  totalShards: 'auto', // Discord calculates optimal count
  respawn: true
});

manager.on('shardCreate', shard => {
  console.log(`[SHARDING] Launched shard ${shard.id}`);
});

manager.spawn();
```

**Update `package.json`:**
```json
{
  "scripts": {
    "start:sharded": "node dist/sharding.js"
  }
}
```

**Acceptance Criteria:**
- ✅ Bot successfully shards at 2,500 guilds
- ✅ Events processed across all shards
- ✅ No event loss during shard handoff

---

## 🧪 Testing Strategy

### Unit Tests
**Framework:** Jest + ts-jest

```typescript
// src/services/__tests__/ThreatDetectionService.test.ts
import { ThreatDetectionService } from '../ThreatDetectionService';

describe('ThreatDetectionService', () => {
  let service: ThreatDetectionService;

  beforeEach(() => {
    service = new ThreatDetectionService();
  });

  test('should detect phishing URL', async () => {
    const message = {
      content: 'Check out this link: https://malicious-phishing-site.com',
      attachments: new Map()
    } as any;

    const result = await service.analyzeMessage(message);

    expect(result.threatScore).toBeGreaterThan(80);
    expect(result.threatType).toBe('phishing_url');
    expect(result.ioc).toBe('https://malicious-phishing-site.com');
  });

  test('should not flag legitimate URLs', async () => {
    const message = {
      content: 'Visit https://github.com for more info',
      attachments: new Map()
    } as any;

    const result = await service.analyzeMessage(message);

    expect(result.threatScore).toBeLessThan(50);
  });
});
```

### Integration Tests
**Framework:** Supertest + Discord.js test environment

```typescript
// src/__tests__/integration/antiraid.test.ts
describe('Anti-Raid System Integration', () => {
  test('should detect mass join and trigger mitigation', async () => {
    const guildId = 'test-guild-123';

    // Simulate 15 joins in 5 seconds
    for (let i = 0; i < 15; i++) {
      await antiRaidService.detectMassJoin(guildId);
    }

    const isRaid = await antiRaidService.detectMassJoin(guildId);
    expect(isRaid).toBe(true);

    // Verify mitigation was triggered
    const incidents = await prisma.incidentCase.findMany({
      where: { guildId, incidentType: 'raid' }
    });

    expect(incidents.length).toBeGreaterThan(0);
  });
});
```

---

## 📦 Dependencies

**New `package.json` dependencies:**

```json
{
  "dependencies": {
    "@prisma/client": "^5.7.1",
    "discord.js": "^14.14.1",
    "inversify": "^6.0.2",
    "redis": "^4.6.12",
    "reflect-metadata": "^0.2.1",
    "winston": "^3.11.0",
    "axios": "^1.6.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "prisma": "^5.7.1",
    "ts-node": "^10.9.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11"
  }
}
```

---

## 🎯 Success Criteria - DOUTRINA Compliance

**Artigo II (Padrão Pagani):**
- ✅ Zero TODOs in production code (all placeholders resolved)
- ✅ All tests passing (100% pass rate)
- ✅ Every commit is production-ready

**Artigo III (Confiança Zero):**
- ✅ Bot token in `.env` only (never hardcoded)
- ✅ Input sanitization on all user-facing commands
- ✅ Permission checks before every privileged action

**Artigo V (Legislação Prévia):**
- ✅ Security architecture designed BEFORE implementation
- ✅ Rate limiting and circuit breakers from Phase 2 start
- ✅ GDPR compliance built-in (not bolted-on)

**Artigo IV (Antifragilidade):**
- ✅ System strengthens under attack (threat intel feedback loop)
- ✅ Chaos engineering tests (simulated raids, API failures)

---

## 📅 Execution Timeline

> **⚠️ REALITY CHECK:** All tasks below are BLOCKED. Phase 1 must be completed first.

| Week | Phase | Tasks | Files Created | Status |
|------|-------|-------|---------------|--------|
| 1-2 | **1** | **Project initialization** | **package.json, src/, prisma/, docker-compose.yml** | **⚪ NOT STARTED** |
| 3 | 2.1 | Moderation commands | 10 command files | ⚪ BLOCKED (needs Phase 1) |
| 4 | 2.2 | Forensic export + SIEM | ForensicExportService, event handlers | ⚪ BLOCKED (needs Phase 1) |
| 5 | 2.3 | Anti-raid system | AntiRaidService, guildMemberAdd handler | ⚪ BLOCKED (needs Phase 1) |
| 6 | 2.4 | Privileged intents application | Documentation, degraded mode | ⚪ BLOCKED (needs Phase 1) |
| 7 | 3.1 | MISP integration | ThreatIntelligenceService (MISP module) | ⚪ BLOCKED (needs Phase 2) |
| 8 | 3.2 | Threat detection pipeline | ThreatDetectionService, messageCreate handler | ⚪ BLOCKED (needs Phase 2) |
| 9 | 3.3 | OpenCTI + Vértice | ThreatIntelligenceService extensions | ⚪ BLOCKED (needs Phase 2) |
| 10 | 4.1 | Interactive alerts | IncidentResponseService, interactionCreate handler | ⚪ BLOCKED (needs Phase 3) |
| 11 | 4.2 | IR playbooks | `/incident` command, ServiceNow integration | ⚪ BLOCKED (needs Phase 3) |
| 12 | 4.3 | LLM threat analysis | Python microservice, model fine-tuning | ⚪ BLOCKED (needs Phase 3) |
| 13 | 5.1 | Sharding | sharding.ts | ⚪ BLOCKED (needs Phase 4) |
| 14 | 5.2 | Adversarial ML defense | Ensemble detection, adversarial training | ⚪ BLOCKED (needs Phase 4) |

**Current Reality:** Week 0 - Project not initialized. First step is Phase 1 foundation.

---

## ✅ Implementation Plan Documentation Complete

**Planning Status:** ✅ DOCUMENTATION COMPLETE - Planning phase finished
**Implementation Status:** ⚪ 0% COMPLETE - No code written yet

**Deliverables:**
1. ✅ CYBERSEC_BLUEPRINT.md - Technical architecture (PLANNING ONLY)
2. ✅ CYBERSEC_ROADMAP.md - Timeline with milestones (PLANNING ONLY)
3. ✅ CYBERSEC_IMPLEMENTATION_PLAN.md - Task-level execution plan (this document)

**Next Steps (ACTUAL - from zero):**
1. ⚪ **Phase 1 MUST be completed first** - Initialize project from scratch
2. ⚪ Create package.json, tsconfig.json, directory structure
3. ⚪ Setup PostgreSQL, Redis, Discord.js bot client
4. ⚪ Implement base services and Prisma models
5. ⚪ After Phase 1 completes, THEN start Phase 2.1

**Total Files to Create:** ~50 files (commands, services, event handlers, tests) - NONE CREATED YET
**Total Lines of Code:** ~5,000-7,000 lines (estimated) - CURRENTLY 0 LINES

**Author:** Juan Carlos de Souza (Arquiteto-Chefe)
**Co-Architect:** Claude-Code (Antropic)
**Reviewed By:** DOUTRINA Vértice v2.5
**Date:** 2025-10-28

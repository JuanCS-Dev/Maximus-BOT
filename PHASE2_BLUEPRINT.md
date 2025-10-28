# PHASE 2 BLUEPRINT - COMPLETE COMMAND SET

**Status**: 🚧 IN PROGRESS
**Governance**: Under Constituição Vértice v2.5
**Method**: PPBP (Prompt → Paper → Blueprint → Planejamento)

---

## I. PAPER - Strategic Analysis

### Objective
Implement 15+ production-ready slash commands across 3 categories (Moderation, Admin, Utility), fully integrated with Phase 1 enterprise infrastructure (PostgreSQL, Redis, Services, Audit Logs).

### Doctrine Compliance Check

**✅ Artigo II (Padrão Pagani)**:
- All commands will be PRODUCTION-READY on commit
- Zero mocks, placeholders, or TODOs in main branch
- All tests must pass before merge

**✅ Artigo V (Legislação Prévia)**:
- Governance BEFORE power:
  - Every moderation command → audit log entry
  - Every action → permission check
  - Every user interaction → rate limiting
  - Role hierarchy validation BEFORE execution

**✅ Artigo I, Cláusula 3.2 (Visão Sistêmica)**:
- All commands integrate with GuildService, UserService, WarningService
- All moderation actions logged via AuditLogService
- All commands respect guild settings from database
- All commands use Redis caching where applicable

### Success Criteria
1. All 15+ commands implemented and functional
2. 100% integration with Phase 1 services
3. Audit log entry for every moderation action
4. Permission checks on all commands
5. Error handling with user-friendly messages
6. Portuguese language support (BR locale)

---

## II. BLUEPRINT - Technical Architecture

### A. Command Categories

#### 1. MODERATION (8 commands)
High-priority, high-impact commands requiring strict governance.

| Command | Description | Database | Audit Log | Service Integration |
|---------|-------------|----------|-----------|---------------------|
| `/kick` | Expel member from server | User | KICK | ModerationService |
| `/mute` | Timeout user (Discord native) | User | MUTE | ModerationService |
| `/unmute` | Remove timeout | User | UNMUTE | ModerationService |
| `/warn` | Add warning to user | Warning | WARN | WarningService |
| `/warnings` | List user warnings | Warning | - | WarningService |
| `/clear-warnings` | Clear user warnings | Warning | CLEAR_WARNINGS | WarningService |
| `/purge` | Bulk delete messages | - | PURGE | - |
| `/slowmode` | Set channel slowmode | GuildSettings | TIMEOUT | GuildService |

#### 2. ADMIN (4 commands)
Server management commands for administrators.

| Command | Description | Database | Audit Log | Service Integration |
|---------|-------------|----------|-----------|---------------------|
| `/lockdown` | Lock channel | GuildSettings | LOCKDOWN | GuildService |
| `/unlock` | Unlock channel | GuildSettings | UNLOCK | GuildService |
| `/role` | Add/remove role | - | ROLE_ADD/REMOVE | - |
| `/nick` | Change nickname | - | NICK_CHANGE | - |

#### 3. UTILITY (5 commands)
Information and interaction commands.

| Command | Description | Database | Audit Log | Service Integration |
|---------|-------------|----------|-----------|---------------------|
| `/serverinfo` | Server information | Guild | - | GuildService |
| `/userinfo` | User information | User | - | UserService |
| `/avatar` | Display user avatar | User | - | UserService |
| `/poll` | Create a poll | - | - | - |
| `/announce` | Send announcement | - | - | - |

### B. Command Implementation Pattern

Every command must follow this structure:

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService } from '../types/container';
import { AuditAction } from '@prisma/client';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('command-name')
    .setDescription('Command description')
    .addUserOption(/* ... */)
    .setDefaultMemberPermissions(PermissionFlagsBits.PERMISSION),

  async execute(interaction: ChatInputCommandInteraction) {
    // 1. VALIDATION: Guild check
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Este comando só funciona em servidores!', ephemeral: true });
    }

    // 2. VALIDATION: Permission & hierarchy checks
    // Check user permissions
    // Check bot permissions
    // Check role hierarchy

    // 3. SERVICE INTEGRATION: Get required services
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    // ... other services

    // 4. EXECUTION: Perform action
    try {
      // Database operations via services
      // Discord API operations

      // 5. AUDIT LOG: Record action
      await auditLogService.logAction(
        interaction.guild.id,
        targetUserId,
        AuditAction.ACTION_TYPE,
        interaction.user.id,
        interaction.user.tag,
        reason,
        metadata
      );

      // 6. RESPONSE: User feedback
      await interaction.reply({ content: '✅ Ação concluída!' });

      logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`Error in ${interaction.commandName}:`, error);
      await interaction.reply({ content: '❌ Erro ao executar comando!', ephemeral: true });
    }
  },
};

export default command;
```

### C. Integration with Phase 1 Services

#### Database Integration
```typescript
// Every command that modifies data uses services
const guildService = getService<IGuildService>(TYPES.GuildService);
const userService = getService<IUserService>(TYPES.UserService);
const warningService = getService<IWarningService>(TYPES.WarningService);

// Ensure guild/user exists in database
await guildService.getOrCreateGuild(guildId, guildName, iconUrl);
await userService.getOrCreateUser(userId, username, discriminator, avatarUrl);
```

#### Audit Log Integration
```typescript
// MANDATORY for all moderation/admin commands
const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);

await auditLogService.logAction(
  guildId,
  targetUserId,
  AuditAction.KICK, // or BAN, MUTE, WARN, etc.
  moderatorId,
  moderatorTag,
  reason,
  { additionalData: 'if needed' } // metadata
);
```

#### Cache Integration
```typescript
// Use caching for frequently accessed data
import { getCached, setCached, CacheKeys, CacheTTL } from '../cache/redis';

// Example: Cache guild settings
const cacheKey = CacheKeys.GUILD_SETTINGS(guildId);
let settings = await getCached<GuildSettings>(cacheKey);

if (!settings) {
  settings = await guildService.getGuildSettings(guildId);
  await setCached(cacheKey, settings, CacheTTL.GUILD_SETTINGS);
}
```

#### Rate Limiting
```typescript
// Apply rate limiting to prevent abuse
import { RateLimiters } from '../cache/rateLimiter';

const rateLimit = await RateLimiters.COMMAND.checkLimit(userId);

if (!rateLimit.allowed) {
  return interaction.reply({
    content: `⏱️ Você está sendo limitado. Tente novamente em ${rateLimit.resetIn}s.`,
    ephemeral: true,
  });
}
```

### D. Governance Implementation (Artigo V)

#### Permission Validation Pattern
```typescript
// 1. Check if user has permission
const member = interaction.member as GuildMember;
if (!member.permissions.has(PermissionFlagsBits.KICK_MEMBERS)) {
  return interaction.reply({ content: '❌ Você não tem permissão!', ephemeral: true });
}

// 2. Check role hierarchy (user vs target)
const targetMember = await interaction.guild.members.fetch(targetUserId);
if (targetMember.roles.highest.position >= member.roles.highest.position) {
  return interaction.reply({
    content: '❌ Você não pode executar esta ação em alguém com cargo igual ou superior!',
    ephemeral: true
  });
}

// 3. Check role hierarchy (bot vs target)
const botMember = await interaction.guild.members.fetchMe();
if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
  return interaction.reply({
    content: '❌ Não posso executar esta ação em alguém com cargo igual ou superior ao meu!',
    ephemeral: true
  });
}
```

---

## III. PLANEJAMENTO - Implementation Order

### Sprint 1: Moderation Core (Highest Priority)
**Duration**: ~3-4 hours
**Doctrine**: Artigo V - Governance BEFORE power

1. ✅ `/ban` (already implemented - reference)
2. 🔨 `/kick` - Similar to ban, simpler
3. 🔨 `/warn` - Uses WarningService
4. 🔨 `/warnings` - Read-only, safer
5. 🔨 `/clear-warnings` - Admin tool

**Why this order**: Build from safest to most powerful. Warn system is foundation for auto-moderation (Phase 3).

### Sprint 2: Moderation Advanced
**Duration**: ~2-3 hours

6. 🔨 `/mute` - Discord native timeout (new API)
7. 🔨 `/unmute` - Reverse of mute
8. 🔨 `/purge` - Bulk operations, needs careful limits
9. 🔨 `/slowmode` - Channel modification

### Sprint 3: Admin Commands
**Duration**: ~2 hours

10. 🔨 `/lockdown` - Channel permissions
11. 🔨 `/unlock` - Reverse of lockdown
12. 🔨 `/role` - Role management
13. 🔨 `/nick` - Nickname management

### Sprint 4: Utility Commands
**Duration**: ~2 hours
**Doctrine**: Artigo II - Production-ready embeds

14. 🔨 `/serverinfo` - Rich embed with guild data
15. 🔨 `/userinfo` - Rich embed with user data
16. 🔨 `/avatar` - Display avatar with options
17. 🔨 `/poll` - Interactive poll with reactions
18. 🔨 `/announce` - Formatted announcement

---

## IV. VALIDATION TRIPLA (Cláusula 3.3)

After each sprint:

### 1. Análise Estática
```bash
npm run lint
npm run build
```
- Zero TypeScript errors
- Zero ESLint warnings

### 2. Execução de Testes
```bash
# Test database integration
npm run test:services

# Test command execution
npm run test:commands

# Test permission checks
npm run test:permissions
```

### 3. Validação de Conformidade
- [ ] All commands have audit log entries (Artigo V)
- [ ] No TODOs, mocks, or placeholders (Artigo II)
- [ ] All commands integrated with services (Cláusula 3.2)
- [ ] Permission checks implemented (Artigo V)
- [ ] Error handling is user-friendly
- [ ] Portuguese language (BR locale)

---

## V. RISK ANALYSIS (Co-Arquiteto Cético)

### Identified Risks

**1. Discord.js v14 Timeout API**
- **Risk**: Mute command uses new timeout API - syntax may differ
- **Mitigation**: Reference Discord.js v14 docs, test in dev guild first

**2. Bulk Message Delete Limits**
- **Risk**: `/purge` limited to messages <14 days old (Discord API)
- **Mitigation**: Implement 14-day check, inform user of limitation

**3. Permission Escalation**
- **Risk**: Commands could be used to elevate privileges
- **Mitigation**: Strict role hierarchy checks (already in blueprint)

**4. Database Consistency**
- **Risk**: Discord action succeeds but database write fails
- **Mitigation**: Try-catch with rollback logic, audit log in finally block

**5. Rate Limit Bypass**
- **Risk**: Rate limiting can be circumvented by multiple accounts
- **Mitigation**: Phase 3 (auto-mod) will add IP/fingerprint tracking

---

## VI. DELIVERABLES

### Code Artifacts
- [ ] 17 command files in `src/commands/` (kick.ts, warn.ts, etc.)
- [ ] Updated `src/types/index.ts` with new types if needed
- [ ] Integration tests for each command category
- [ ] Updated README.md with command documentation

### Documentation
- [ ] `PHASE2_COMPLETE.md` - Summary and metrics
- [ ] Command reference guide (for users)
- [ ] Developer notes on extending commands

### Git Commits
Each sprint = 1 atomic commit:
1. `feat(phase2): Implement moderation core commands (kick, warn, warnings, clear-warnings)`
2. `feat(phase2): Implement advanced moderation (mute, unmute, purge, slowmode)`
3. `feat(phase2): Implement admin commands (lockdown, unlock, role, nick)`
4. `feat(phase2): Implement utility commands (serverinfo, userinfo, avatar, poll, announce)`

---

## VII. POST-IMPLEMENTATION

### Testing Checklist (Artigo IV - Antifragilidade)
Test in controlled chaos:
- [ ] Execute each command as non-admin (should fail gracefully)
- [ ] Execute each command on bot itself (should fail)
- [ ] Execute each command on server owner (should fail for non-owner)
- [ ] Spam commands rapidly (rate limiter should engage)
- [ ] Disconnect database mid-command (should handle gracefully)

### Phase 3 Preparation
After Phase 2 completion, prepare for:
- Auto-moderation (anti-spam using warning system)
- Content filtering (profanity, links, invites)
- Auto-actions (auto-role, auto-kick raids)

---

**Blueprint Status**: ✅ APPROVED - Ready for execution
**Next Action**: Begin Sprint 1 - Moderation Core
**Executor**: Claude Code (Executor Tático)
**Oversight**: Juan Carlos (Arquiteto-Chefe)

🤖 Generated under Constituição Vértice v2.5

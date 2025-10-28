import { Client, Collection, SlashCommandBuilder, ChatInputCommandInteraction, PermissionResolvable } from 'discord.js';

// Estender tipo Client para incluir comandos
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, CommandType>;
  }
}

// Tipo de comando
export interface CommandType {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  permissions?: PermissionResolvable[];
  cooldown?: number;
}

// Configurações de moderação
export interface ModerationConfig {
  maxWarnsBeforeBan: number;
  spamThreshold: number;
  spamInterval: number;
  bannedWords: string[];
}

// Dados de warn de usuário
export interface UserWarn {
  userId: string;
  guildId: string;
  warnings: Warning[];
  totalWarnings: number;
}

export interface Warning {
  id: string;
  reason: string;
  moderatorId: string;
  timestamp: Date;
}

// Configuração de reaction role
export interface ReactionRole {
  messageId: string;
  channelId: string;
  roleId: string;
  emoji: string;
}

// Tipo de log de moderação
export enum ModerationLogType {
  BAN = 'BAN',
  KICK = 'KICK',
  MUTE = 'MUTE',
  UNMUTE = 'UNMUTE',
  WARN = 'WARN',
  MESSAGE_DELETE = 'MESSAGE_DELETE',
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
}

export interface ModerationLog {
  type: ModerationLogType;
  userId: string;
  moderatorId?: string;
  reason?: string;
  timestamp: Date;
  guildId: string;
}

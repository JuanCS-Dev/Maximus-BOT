import { Client, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { CommandType } from '../types';

export async function registerCommands(client: Client): Promise<void> {
  const commands: any[] = [];
  const commandsPath = join(__dirname, '../commands');

  try {
    const commandFiles = readdirSync(commandsPath).filter(file =>
      file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command: CommandType = require(filePath).default;

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        logger.debug(`Comando carregado: ${command.data.name}`);
      } else {
        logger.warn(`Comando em ${file} está faltando "data" ou "execute"`);
      }
    }

    // Registrar comandos no Discord
    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
    const clientId = process.env.CLIENT_ID!;
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      // Registrar apenas no servidor específico (mais rápido para desenvolvimento)
      logger.info(`Registrando ${commands.length} comandos no servidor ${guildId}...`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      logger.info('✅ Comandos registrados no servidor!');
    } else {
      // Registrar globalmente (pode levar até 1 hora para propagar)
      logger.info(`Registrando ${commands.length} comandos globalmente...`);
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      logger.info('✅ Comandos registrados globalmente!');
    }
  } catch (error) {
    logger.error('Erro ao registrar comandos:', error);
    throw error;
  }
}

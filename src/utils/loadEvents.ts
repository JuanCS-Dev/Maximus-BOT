import { Client } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = join(__dirname, '../events');

  try {
    const eventFiles = readdirSync(eventsPath).filter(file =>
      file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const event = require(filePath).default;

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }

      logger.debug(`Evento carregado: ${event.name}`);
    }
  } catch (error) {
    logger.error('Erro ao carregar eventos:', error);
    throw error;
  }
}

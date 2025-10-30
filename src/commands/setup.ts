import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  CategoryChannel,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import { CommandType } from '../types';

interface CategoryConfig {
  name: string;
  channels: string[];
}

interface RoleConfig {
  name: string;
  color: number;
  permissions: bigint[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    name: '📢 WELCOME',
    channels: ['announcements', 'rules', 'get-roles'],
  },
  {
    name: '💬 COMMUNITY',
    channels: ['general', 'showcase', 'ideas', 'off-topic'],
  },
  {
    name: '💻 DEVELOPMENT',
    channels: ['dev-chat', 'bug-reports', 'documentation', 'github-feed'],
  },
  {
    name: '🔒 SECURITY',
    channels: ['threat-intel', 'incident-response', 'research', 'cve-alerts'],
  },
  {
    name: '🆘 SUPPORT',
    channels: ['help', 'bot-commands', 'faq'],
  },
  {
    name: '🎙️ VOICE',
    channels: [], // Voice channels criados depois
  },
];

const ROLES: RoleConfig[] = [
  {
    name: '🔴 Admin',
    color: 0xe74c3c,
    permissions: [PermissionFlagsBits.Administrator],
  },
  {
    name: '🟠 Moderator',
    color: 0xe67e22,
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ModerateMembers,
    ],
  },
  {
    name: '🟡 Developer',
    color: 0xf1c40f,
    permissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
  },
  {
    name: '🟢 Security Researcher',
    color: 0x2ecc71,
    permissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
  },
  {
    name: '🔵 Contributor',
    color: 0x3498db,
    permissions: [PermissionFlagsBits.SendMessages],
  },
  {
    name: '⚪ Member',
    color: 0x95a5a6,
    permissions: [PermissionFlagsBits.SendMessages],
  },
];

const VOICE_CHANNELS = [
  'General Voice',
  'Development',
  'Security Discussion',
  'AFK',
];

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('🚀 Configure o servidor Discord do Vértice-MAXIMUS automaticamente')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const { guild } = interaction;
    if (!guild) {
      await interaction.editReply('❌ Este comando só pode ser usado em servidores.');
      return;
    }

    const progressEmbed = new EmbedBuilder()
      .setTitle('🚀 Configurando Servidor Vértice-MAXIMUS')
      .setDescription('Aguarde enquanto configuro tudo...')
      .setColor(0x3498db)
      .setTimestamp();

    await interaction.editReply({ embeds: [progressEmbed] });

    try {
      const results: string[] = [];

      // 1. Criar Roles
      results.push('**📋 Criando Roles...**');
      const createdRoles = new Map<string, string>();

      for (const roleConfig of ROLES) {
        try {
          const existingRole = guild.roles.cache.find((r) => r.name === roleConfig.name);
          if (existingRole) {
            results.push(`✅ Role já existe: ${roleConfig.name}`);
            createdRoles.set(roleConfig.name, existingRole.id);
            continue;
          }

          const role = await guild.roles.create({
            name: roleConfig.name,
            color: roleConfig.color,
            permissions: roleConfig.permissions,
            reason: 'Setup automático Vértice-MAXIMUS',
          });
          createdRoles.set(roleConfig.name, role.id);
          results.push(`✅ Role criada: ${roleConfig.name}`);
        } catch (error) {
          results.push(`❌ Erro ao criar role ${roleConfig.name}: ${error}`);
        }
      }

      // 2. Criar Categorias e Canais
      results.push('\n**📂 Criando Categorias e Canais...**');

      for (const category of CATEGORIES) {
        try {
          // Criar categoria
          const existingCategory = guild.channels.cache.find(
            (c) => c.type === ChannelType.GuildCategory && c.name === category.name
          );

          let categoryChannel: CategoryChannel;
          if (existingCategory && existingCategory.type === ChannelType.GuildCategory) {
            categoryChannel = existingCategory;
            results.push(`✅ Categoria já existe: ${category.name}`);
          } else {
            categoryChannel = await guild.channels.create({
              name: category.name,
              type: ChannelType.GuildCategory,
              reason: 'Setup automático Vértice-MAXIMUS',
            });
            results.push(`✅ Categoria criada: ${category.name}`);
          }

          // Criar canais de texto na categoria
          for (const channelName of category.channels) {
            const existingChannel = guild.channels.cache.find(
              (c) =>
                c.type === ChannelType.GuildText &&
                c.name === channelName &&
                c.parentId === categoryChannel.id
            );

            if (existingChannel) {
              results.push(`  ✅ Canal já existe: #${channelName}`);
              continue;
            }

            await guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: categoryChannel.id,
              reason: 'Setup automático Vértice-MAXIMUS',
            });
            results.push(`  ✅ Canal criado: #${channelName}`);
          }

          // Criar canais de voz se for categoria VOICE
          if (category.name.includes('VOICE')) {
            for (const voiceName of VOICE_CHANNELS) {
              const existingVoice = guild.channels.cache.find(
                (c) =>
                  c.type === ChannelType.GuildVoice &&
                  c.name === voiceName &&
                  c.parentId === categoryChannel.id
              );

              if (existingVoice) {
                results.push(`  ✅ Canal de voz já existe: 🔊 ${voiceName}`);
                continue;
              }

              await guild.channels.create({
                name: voiceName,
                type: ChannelType.GuildVoice,
                parent: categoryChannel.id,
                reason: 'Setup automático Vértice-MAXIMUS',
              });
              results.push(`  ✅ Canal de voz criado: 🔊 ${voiceName}`);
            }
          }
        } catch (error) {
          results.push(`❌ Erro na categoria ${category.name}: ${error}`);
        }
      }

      // 3. Configurar permissões especiais
      results.push('\n**🔒 Configurando Permissões...**');

      // Announcements - somente leitura
      const announcementsChannel = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === 'announcements'
      ) as TextChannel | undefined;

      if (announcementsChannel) {
        await announcementsChannel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false,
          AddReactions: true,
        });
        results.push('  ✅ #announcements configurado (somente leitura)');
      }

      // Rules - somente leitura
      const rulesChannel = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === 'rules'
      ) as TextChannel | undefined;

      if (rulesChannel) {
        await rulesChannel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false,
          AddReactions: false,
        });
        results.push('  ✅ #rules configurado (somente leitura)');
      }

      // Security channels - acesso restrito
      const securityChannels = ['incident-response', 'cve-alerts'];
      for (const channelName of securityChannels) {
        const channel = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === channelName
        ) as TextChannel | undefined;

        if (channel) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            ViewChannel: false,
          });

          const securityRole = guild.roles.cache.find((r) => r.name === '🟢 Security Researcher');
          if (securityRole) {
            await channel.permissionOverwrites.edit(securityRole, {
              ViewChannel: true,
              SendMessages: true,
            });
          }
          results.push(`  ✅ #${channelName} configurado (acesso restrito)`);
        }
      }

      // 4. Criar mensagem de boas-vindas
      const generalChannel = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === 'general'
      ) as TextChannel | undefined;

      if (generalChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🧬 Bem-vindo ao Vértice-MAXIMUS Community!')
          .setDescription(
            `**A Living Cybersecurity Organism That Learns, Adapts, and Evolves**\n\n` +
              `Este servidor é o hub da comunidade Vértice-MAXIMUS, um ecossistema de segurança ` +
              `cibernética inspirado no sistema imunológico humano.\n\n` +
              `**📢 Comece aqui:**\n` +
              `• <#${guild.channels.cache.find((c) => c.name === 'rules')?.id}> - Leia as regras\n` +
              `• <#${guild.channels.cache.find((c) => c.name === 'get-roles')?.id}> - Pegue seus roles\n` +
              `• <#${guild.channels.cache.find((c) => c.name === 'announcements')?.id}> - Fique atualizado\n\n` +
              `**💻 Links Úteis:**\n` +
              `• [GitHub](https://github.com/JuanCS-Dev/V-rtice)\n` +
              `• [Documentação](https://vertice-maximus.web.app)\n` +
              `• [Contribuir](https://github.com/JuanCS-Dev/V-rtice/blob/main/CONTRIBUTING.md)\n\n` +
              `**Divirta-se e seja bem-vindo! 🚀**`
          )
          .setColor(0x3498db)
          .setThumbnail(guild.iconURL() || '')
          .setTimestamp();

        await generalChannel.send({ embeds: [welcomeEmbed] });
        results.push('\n✅ Mensagem de boas-vindas enviada em #general');
      }

      // Resultado final
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Servidor Configurado com Sucesso!')
        .setDescription(results.join('\n'))
        .setColor(0x2ecc71)
        .setFooter({ text: 'Vértice-MAXIMUS Setup' })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Erro no Setup')
        .setDescription(`Ocorreu um erro durante a configuração:\n\`\`\`${error}\`\`\``)
        .setColor(0xe74c3c)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};

export default command;

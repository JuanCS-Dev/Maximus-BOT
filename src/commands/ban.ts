import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um membro do servidor')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário a ser banido')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo do ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('deletar_mensagens')
        .setDescription('Deletar mensagens dos últimos X dias (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('razao') || 'Sem motivo especificado';
    const deleteMessageDays = interaction.options.getInteger('deletar_mensagens') || 0;

    // Verificar se o bot tem permissão
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Este comando só pode ser usado em servidores!', ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ Usuário não encontrado no servidor!', ephemeral: true });
    }

    // Verificar hierarquia de cargos
    const executor = interaction.member as any;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      return interaction.reply({
        content: '❌ Você não pode banir este usuário (cargo igual ou superior ao seu)!',
        ephemeral: true,
      });
    }

    // Verificar se o bot pode banir
    const botMember = await interaction.guild.members.fetchMe();
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: '❌ Não posso banir este usuário (cargo igual ou superior ao meu)!',
        ephemeral: true,
      });
    }

    // Tentar enviar DM ao usuário antes de banir
    try {
      await targetUser.send(
        `🔨 Você foi **banido** do servidor **${interaction.guild.name}**\n` +
        `**Motivo:** ${reason}\n` +
        `**Moderador:** ${interaction.user.tag}`
      );
    } catch (error) {
      logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
    }

    // Banir usuário
    try {
      await member.ban({
        reason: `${reason} | Banido por: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
      });

      logger.info(`${targetUser.tag} foi banido por ${interaction.user.tag} | Motivo: ${reason}`);

      await interaction.reply({
        content:
          `✅ **${targetUser.tag}** foi banido com sucesso!\n` +
          `**Motivo:** ${reason}\n` +
          `**Mensagens deletadas:** ${deleteMessageDays} dias`,
      });
    } catch (error) {
      logger.error('Erro ao banir usuário:', error);
      await interaction.reply({
        content: '❌ Erro ao banir o usuário. Verifique minhas permissões!',
        ephemeral: true,
      });
    }
  },
};

export default command;

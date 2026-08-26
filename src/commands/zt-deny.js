import { SlashCommandBuilder } from 'discord.js';
import { denyRequest, getRequest } from '../zt/flow.js';
import { sendDm, isAdmin } from './_utils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('zt-deny')
    .setDescription('[Admin] Từ chối yêu cầu ZeroTier')
    .addStringOption(opt =>
      opt.setName('request-id')
        .setDescription('ID của request')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Lý do từ chối (sẽ gửi cho user)')
        .setRequired(false)),

  async execute(interaction) {
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Bạn không có quyền dùng command này.',
        ephemeral: true,
      });
    }

    const requestId = interaction.options.getString('request-id').trim();
    const reason = interaction.options.getString('reason') || '';
    const req = getRequest(requestId);

    if (!req) {
      return interaction.reply({
        content: `❌ Không tìm thấy request với ID: \`${requestId}\``,
        ephemeral: true,
      });
    }

    const result = denyRequest(requestId, interaction.user.id, reason);

    if (!result.ok) {
      return interaction.reply({
        content: result.error === 'already_resolved'
          ? `⚠️ Request này đã được xử lý (status: ${req.status}).`
          : `❌ Lỗi: ${result.error}`,
        ephemeral: true,
      });
    }

    // DM user about denial
    const denyMessage = {
      title: '❌ Yêu cầu bị từ chối',
      color: 0xff0000,
      description:
        `Chào <@${req.discordUserId}>,\n\n` +
        `Yêu cầu join ZeroTier của bạn đã bị admin từ chối.`,
    };
    if (reason) {
      denyMessage.fields = [{ name: '📝 Lý do', value: reason }];
    }

    await sendDm(interaction.client, req.discordUserId, denyMessage);

    await interaction.reply({
      content: `✅ Đã từ chối <@${req.discordUserId}> (${req.mcUsername}).`,
      ephemeral: true,
    });
  },
};

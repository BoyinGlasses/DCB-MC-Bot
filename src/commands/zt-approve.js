import { SlashCommandBuilder } from 'discord.js';
import { approveRequest, getRequest } from '../zt/flow.js';
import { config } from '../config.js';
import { sendDm, isAdmin } from './_utils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('zt-approve')
    .setDescription('[Admin] Duyệt yêu cầu ZeroTier')
    .addStringOption(opt =>
      opt.setName('request-id')
        .setDescription('ID của request (xem trong DM từ bot)')
        .setRequired(true)),

  async execute(interaction) {
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Bạn không có quyền dùng command này.',
        ephemeral: true,
      });
    }

    const requestId = interaction.options.getString('request-id').trim();
    const req = getRequest(requestId);

    if (!req) {
      return interaction.reply({
        content: `❌ Không tìm thấy request với ID: \`${requestId}\``,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await approveRequest(requestId, interaction.user.id);

    if (!result.ok) {
      const errorMessages = {
        'not_found': '❌ Request không tồn tại.',
        'already_resolved': `⚠️ Request này đã được xử lý (status: ${req.status}).`,
        'zt_api_failed': '❌ Không thể authorize qua ZeroTier API. Kiểm tra API token và network ID.',
      };
      return interaction.editReply({
        content: errorMessages[result.error] || `❌ Lỗi: ${result.error}`,
      });
    }

    // DM user with connection info
    const address = `${config.minecraft.publicHost}:${config.minecraft.port}`;
    await sendDm(interaction.client, req.discordUserId, {
      title: '✅ Bạn đã được duyệt!',
      color: 0x00ff00,
      description:
        `Chào mừng <@${req.discordUserId}>!\n\n` +
        `Yêu cầu join ZeroTier đã được admin duyệt.\n\n` +
        `**🔌 Địa chỉ Minecraft:**\n` +
        `\`\`\`${address}\`\`\`\n` +
        `Mở Minecraft → Multiplayer → Add Server → paste địa chỉ trên.\n\n` +
        `Nếu ZeroTier của bạn vẫn chưa online, đợi 1-2 phút để handshake xong.`,
    });

    await interaction.editReply({
      content:
        `✅ Đã duyệt <@${req.discordUserId}> (${req.mcUsername}).\n` +
        `Bot đã gửi IP qua DM cho họ.`,
    });
  },
};

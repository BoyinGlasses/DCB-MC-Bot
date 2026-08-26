import { SlashCommandBuilder } from 'discord.js';
import { getLatestRequestForUser } from '../zt/flow.js';
import { config } from '../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('zt-myinfo')
    .setDescription('Xem trạng thái yêu cầu ZeroTier và địa chỉ server của bạn'),

  async execute(interaction) {
    if (!config.zerotier.enabled) {
      return interaction.reply({
        content: 'ℹ️ ZeroTier không được bật trên server này.',
        ephemeral: true,
      });
    }

    const req = getLatestRequestForUser(interaction.user.id);

    if (!req) {
      return interaction.reply({
        content:
          '❓ Bạn chưa gửi yêu cầu ZeroTier nào.\n\n' +
          'Dùng `/zt-request` để tạo yêu cầu mới.',
        ephemeral: true,
      });
    }

    const statusEmoji = {
      pending: '⏳',
      approved: '✅',
      denied: '❌',
    }[req.status] || '❓';

    const statusText = {
      pending: 'Đang chờ admin duyệt',
      approved: 'Đã được duyệt',
      denied: 'Đã bị từ chối',
    }[req.status] || 'Unknown';

    const fields = [
      { name: '📊 Trạng thái', value: `${statusEmoji} ${statusText}`, inline: true },
      { name: '🎮 MC Username', value: req.mcUsername, inline: true },
      { name: '🌐 ZT Node ID', value: `\`${req.ztMemberId}\``, inline: false },
      { name: '📅 Gửi lúc', value: `<t:${Math.floor(new Date(req.createdAt).getTime() / 1000)}:R>`, inline: true },
    ];

    if (req.status === 'approved') {
      const address = `${config.minecraft.publicHost}:${config.minecraft.port}`;
      fields.push({
        name: '🔌 Minecraft Address',
        value: `\`\`\`${address}\`\`\``,
        inline: false,
      });
    }

    if (req.status === 'denied' && req.denyReason) {
      fields.push({
        name: '📝 Lý do từ chối',
        value: req.denyReason,
        inline: false,
      });
    }

    await interaction.reply({
      embeds: [{
        title: '🎮 Thông tin ZeroTier của bạn',
        color: req.status === 'approved' ? 0x00ff00 : req.status === 'denied' ? 0xff0000 : 0xffaa00,
        fields,
        footer: { text: `Request ID: ${req.id}` },
      }],
      ephemeral: true,
    });
  },
};

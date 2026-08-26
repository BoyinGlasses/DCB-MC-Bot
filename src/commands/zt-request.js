import { SlashCommandBuilder } from 'discord.js';
import { createRequest, isValidZtId, normalizeZtId } from '../zt/flow.js';
import { config } from '../config.js';
import { sendDm, isAdmin } from './_utils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('zt-request')
    .setDescription('Gửi yêu cầu join ZeroTier network')
    .addStringOption(opt =>
      opt.setName('zt-id')
        .setDescription('ZeroTier Node ID của bạn (16 ký tự hex)')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('mc-username')
        .setDescription('Tên Minecraft của bạn')
        .setRequired(true)),

  async execute(interaction) {
    if (!config.zerotier.enabled) {
      return interaction.reply({
        content: '❌ ZeroTier không được bật trên server này.',
        ephemeral: true,
      });
    }

    if (config.minecraft.exposureMode !== 'private') {
      return interaction.reply({
        content: 'ℹ️ Server này ở chế độ Public, bạn không cần ZeroTier. Dùng `/ip` để lấy địa chỉ.',
        ephemeral: true,
      });
    }

    const ztId = interaction.options.getString('zt-id');
    const mcName = interaction.options.getString('mc-username');

    if (!isValidZtId(ztId)) {
      return interaction.reply({
        content: '❌ ZeroTier ID không đúng format.\n\nCần đúng **10 ký tự hex** (0-9, a-f). VD: `a1b2c3d4e5`',
        ephemeral: true,
      });
    }

    if (mcName.length < 3 || mcName.length > 32) {
      return interaction.reply({
        content: '❌ Tên Minecraft phải từ 3-32 ký tự.',
        ephemeral: true,
      });
    }

    const result = createRequest(interaction.user.id, ztId, mcName);

    if (!result.ok) {
      const errorMessages = {
        'already_pending': '⏳ Bạn đã có yêu cầu đang chờ duyệt. Vui lòng đợi admin xử lý.',
        'zt_id_in_use': '⚠️ ZeroTier ID này đã được dùng cho yêu cầu khác đang chờ.',
        'invalid_zt_id': '❌ ZeroTier ID không hợp lệ.',
        'missing_fields': '❌ Thiếu thông tin.',
      };
      return interaction.reply({
        content: errorMessages[result.error] || `❌ Lỗi: ${result.error}`,
        ephemeral: true,
      });
    }

    // Notify all admins via DM
    const req = result.request;
    const adminMessage = {
      title: '🆕 ZeroTier Join Request',
      color: 0xffaa00,
      description:
        `**User:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
        `**MC Username:** ${mcName}\n` +
        `**ZT Node ID:** \`${ztId}\`\n` +
        `**Request ID:** \`${req.id}\``,
      fields: [
        {
          name: '✅ Approve',
          value: `\`/zt-approve request-id:${req.id}\``,
          inline: false,
        },
        {
          name: '❌ Deny',
          value: `\`/zt-deny request-id:${req.id} reason:<lý do>\``,
          inline: false,
        },
      ],
    };

    let dmCount = 0;
    for (const adminId of config.admin.discordIds) {
      const sent = await sendDm(interaction.client, adminId, adminMessage);
      if (sent) dmCount++;
    }

    await interaction.reply({
      content:
        `✅ Đã gửi yêu cầu join!\n\n` +
        `**Request ID:** \`${req.id}\`\n` +
        `**Admins đã nhận:** ${dmCount}/${config.admin.discordIds.length}\n\n` +
        `Admin sẽ duyệt trong thời gian sớm nhất. Bot sẽ DM cho bạn IP khi được duyệt.`,
      ephemeral: true,
    });
  },
};

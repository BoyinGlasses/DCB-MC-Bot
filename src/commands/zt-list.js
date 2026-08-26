import { SlashCommandBuilder } from 'discord.js';
import { getPendingRequests } from '../zt/flow.js';
import { isAdmin } from './_utils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('zt-list')
    .setDescription('[Admin] Xem danh sách yêu cầu ZeroTier đang chờ'),

  async execute(interaction) {
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Bạn không có quyền dùng command này.',
        ephemeral: true,
      });
    }

    const pending = getPendingRequests();

    if (pending.length === 0) {
      return interaction.reply({
        embeds: [{
          title: '📋 ZeroTier Requests',
          description: '✅ Không có yêu cầu nào đang chờ.',
          color: 0x808080,
        }],
        ephemeral: true,
      });
    }

    const lines = pending.map((r, i) =>
      `**${i + 1}.** <@${r.discordUserId}> (${r.mcUsername})\n` +
      `   ZT ID: \`${r.ztMemberId}\`\n` +
      `   Request: \`${r.id}\`\n` +
      `   Created: <t:${Math.floor(new Date(r.createdAt).getTime() / 1000)}:R>`
    );

    await interaction.reply({
      embeds: [{
        title: `📋 ZeroTier Pending (${pending.length})`,
        description: lines.join('\n\n'),
        color: 0xffaa00,
        footer: { text: 'Dùng /zt-approve hoặc /zt-deny' },
      }],
      ephemeral: true,
    });
  },
};

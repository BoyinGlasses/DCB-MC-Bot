import { SlashCommandBuilder } from 'discord.js';
import { serverChecker } from '../serverChecker.js';
import { formatUptime } from './_utils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Hiển thị thời gian server đã chạy liên tục'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const { online, info } = await serverChecker.checkServer();

      if (!online || !info) {
        await interaction.editReply({
          embeds: [{
            title: '🔴 Server OFFLINE',
            description: 'Server hiện không online nên không có uptime.',
            color: 0xff0000,
          }],
        });
        return;
      }

      const uptimeMs = serverChecker.getUptime();
      const lastOnline = serverChecker.getLastOnlineTime
        ? serverChecker.getLastOnlineTime()
        : null;

      const embed = {
        title: '⏱️ Server Uptime',
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: '⏳ Đã chạy được',
            value: formatUptime(uptimeMs),
            inline: true,
          },
          {
            name: '🕐 Lần online gần nhất',
            value: lastOnline ? `<t:${Math.floor(lastOnline.getTime() / 1000)}:R>` : 'Không rõ',
            inline: true,
          },
        ],
        footer: { text: 'Minecraft Server Monitor' },
      };

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Bot] Error in /uptime:', error.message);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi lấy thông tin uptime.',
      });
    }
  },
};

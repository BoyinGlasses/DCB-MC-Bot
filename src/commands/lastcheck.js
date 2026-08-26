import { SlashCommandBuilder } from 'discord.js';
import { serverChecker } from '../serverChecker.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lastcheck')
    .setDescription('Hiển thị thời điểm bot kiểm tra server lần gần nhất'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const lastCheck = serverChecker.getLastCheckTime();
      const lastInfo = serverChecker.getLastServerInfo();
      const currentState = serverChecker.getCurrentState();

      if (!lastCheck) {
        await interaction.editReply({
          embeds: [{
            title: '❓ Chưa có dữ liệu',
            description: 'Bot chưa thực hiện poll nào. Vui lòng đợi một chút.',
            color: 0x808080,
          }],
        });
        return;
      }

      const stateLabel = currentState === 'online'
        ? '🟢 Online'
        : currentState === 'offline'
          ? '🔴 Offline'
          : '⚪ Unknown';
      const lastInfoStatus = lastInfo ? '🟢 Online' : '🔴 Offline';

      const unix = Math.floor(lastCheck.getTime() / 1000);
      const embed = {
        title: '🕐 Lần kiểm tra gần nhất',
        color: lastInfo ? 0x00ff00 : 0xff0000,
        fields: [
          {
            name: '⏰ Thời điểm',
            value: `<t:${unix}:F>\n(<t:${unix}:R>)`,
            inline: false,
          },
          {
            name: '📊 Kết quả lúc đó',
            value: lastInfoStatus,
            inline: true,
          },
          {
            name: '📡 State hiện tại',
            value: stateLabel,
            inline: true,
          },
        ],
        footer: { text: 'Minecraft Server Monitor' },
        timestamp: new Date().toISOString(),
      };

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Bot] Error in /lastcheck:', error.message);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi lấy thông tin lần kiểm tra.',
      });
    }
  },
};

import { SlashCommandBuilder } from 'discord.js';
import { serverChecker } from '../serverChecker.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra ping/latency hiện tại tới Minecraft server'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const { online, info } = await serverChecker.checkServer();

      if (!online || !info) {
        await interaction.editReply({
          embeds: [{
            title: '🔴 Server OFFLINE',
            description: 'Không thể đo ping vì server đang offline.',
            color: 0xff0000,
          }],
        });
        return;
      }

      const latency = info.latency ?? 0;
      let quality;
      let color;
      if (latency < 80) {
        quality = '🟢 Tuyệt vời';
        color = 0x00ff00;
      } else if (latency < 150) {
        quality = '🟡 Tốt';
        color = 0xffaa00;
      } else if (latency < 300) {
        quality = '🟠 Tệ';
        color = 0xff8800;
      } else {
        quality = '🔴 Rất tệ';
        color = 0xff0000;
      }

      const embed = {
        title: '📡 Ping tới Minecraft Server',
        color,
        fields: [
          {
            name: '⏱️ Latency',
            value: `${latency}ms`,
            inline: true,
          },
          {
            name: '📊 Chất lượng',
            value: quality,
            inline: true,
          },
        ],
        footer: { text: 'Minecraft Server Monitor' },
        timestamp: new Date().toISOString(),
      };

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Bot] Error in /ping:', error.message);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi đo ping.',
      });
    }
  },
};

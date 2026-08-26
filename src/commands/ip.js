import { SlashCommandBuilder } from 'discord.js';
import { serverChecker } from '../serverChecker.js';
import { config } from '../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Lấy địa chỉ Minecraft server để kết nối nhanh'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const { online } = await serverChecker.checkServer();
      const address = `${config.minecraft.host}:${config.minecraft.port}`;

      const embed = {
        title: '🌐 Địa chỉ Minecraft Server',
        color: online ? 0x00ff00 : 0xffaa00,
        description:
          'Copy địa chỉ bên dưới rồi dán vào **Multiplayer → Add Server** trong Minecraft.',
        fields: [
          {
            name: '📋 Address',
            value: `\`\`\`${address}\`\`\``,
            inline: false,
          },
          {
            name: '🟢 Trạng thái',
            value: online ? 'Server đang **online**' : 'Server đang **offline** — vẫn copy được nhé',
            inline: true,
          },
        ],
        footer: { text: 'Minecraft Server Monitor' },
      };

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Bot] Error in /ip:', error.message);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi lấy địa chỉ server.',
      });
    }
  },
};

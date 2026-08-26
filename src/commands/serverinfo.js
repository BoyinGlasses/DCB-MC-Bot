import { SlashCommandBuilder } from 'discord.js';
import { serverChecker } from '../serverChecker.js';
import { buildServerInfoEmbed } from '../embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Hiển thị thông tin chi tiết về Minecraft server (version, MOTD, sample players)'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const { online, info } = await serverChecker.checkServer();

      if (!online || !info) {
        await interaction.editReply({
          embeds: [{
            title: '🔴 Server OFFLINE',
            description: 'Không thể lấy thông tin chi tiết vì server đang offline.',
            color: 0xff0000,
          }],
        });
        return;
      }

      const embed = buildServerInfoEmbed(info);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Bot] Error in /serverinfo:', error.message);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi lấy thông tin server.',
      });
    }
  },
};

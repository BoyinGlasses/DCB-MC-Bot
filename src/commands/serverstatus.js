import { SlashCommandBuilder } from 'discord.js';
import { serverChecker } from '../serverChecker.js';
import { buildOnlineEmbed, buildOfflineEmbed } from '../embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverstatus')
    .setDescription('Kiểm tra trạng thái hiện tại của Minecraft server'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const { online, info } = await serverChecker.checkServer();

      if (online && info) {
        const uptime = serverChecker.getUptime();
        await interaction.editReply({ embeds: [buildOnlineEmbed(info, uptime)] });
      } else {
        await interaction.editReply({ embeds: [buildOfflineEmbed(new Date())] });
      }
    } catch (error) {
      console.error('[Bot] Error in /serverstatus:', error.message);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi lấy thông tin server.',
      });
    }
  },
};

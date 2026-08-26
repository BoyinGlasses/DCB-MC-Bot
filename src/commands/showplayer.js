import { SlashCommandBuilder } from 'discord.js';
import { serverChecker } from '../serverChecker.js';
import { buildPlayerListEmbed } from '../embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('showplayer')
    .setDescription('Hiển thị danh sách người chơi đang online trên server')
    .setDescriptionLocalizations({ vi: 'Hiển thị danh sách người chơi đang online trên server' }),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const { online, info } = await serverChecker.checkServer();

      if (!online || !info) {
        await interaction.editReply({
          embeds: [{
            title: '🔴 Server OFFLINE',
            description: 'Server hiện không online.',
            color: 0xff0000,
          }],
        });
        return;
      }

      const embed = buildPlayerListEmbed(info);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Bot] Error in /showplayer:', error.message);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi lấy thông tin server.',
      });
    }
  },
};

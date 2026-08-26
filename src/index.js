import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config, validateConfig } from './config.js';
import { serverChecker } from './serverChecker.js';
import { buildOnlineEmbed, buildOfflineEmbed, buildStatusEmbed, buildPlayerListEmbed, formatUptime } from './embedBuilder.js';

/**
 * Discord bot client
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

/**
 * REST API for slash commands
 */
const rest = new REST({ version: '10' }).setToken(config.discord.token);

/**
 * Register slash commands
 */
async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('showplayer')
      .setDescription('Hiển thị danh sách người chơi đang online trên server')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('serverstatus')
      .setDescription('Kiểm tra trạng thái hiện tại của Minecraft server')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('uptime')
      .setDescription('Hiển thị thời gian server đã chạy liên tục')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('ip')
      .setDescription('Lấy địa chỉ Minecraft server để kết nối nhanh')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Kiểm tra ping/latency hiện tại tới Minecraft server')
      .toJSON(),
  ];

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('[Discord] Slash commands registered successfully');
  } catch (error) {
    console.error('[Discord] Failed to register slash commands:', error.message);
  }
}

/**
 * Handle slash command interactions
 */
async function handleSlashCommand(interaction) {
  const { commandName } = interaction;

  if (commandName === 'showplayer') {
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
  }

  if (commandName === 'serverstatus') {
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
  }

  if (commandName === 'uptime') {
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
  }

  if (commandName === 'ip') {
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
  }

  if (commandName === 'ping') {
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
  }
}

/**
 * Discord channel reference
 */
let targetChannel = null;

/**
 * Polling interval reference
 */
let pollingInterval = null;

/**
 * Send embed to Discord channel
 * @param {Object} embed - Discord embed object
 */
async function sendEmbed(embed) {
  if (!targetChannel) {
    console.error('[Discord] Target channel not found');
    return;
  }

  try {
    await targetChannel.send({ embeds: [embed] });
    console.log('[Discord] Embed sent successfully');
  } catch (error) {
    console.error('[Discord] Failed to send embed:', error.message);
  }
}

/**
 * Main polling loop - check server and handle state changes
 */
async function pollServer() {
  try {
    // Check server status
    const { online, info } = await serverChecker.checkServer();
    
    // Evaluate state change
    const { shouldNotify, newState } = serverChecker.evaluateState(online);
    
    // Update state
    serverChecker.updateState(newState);

    // Send notification if state changed
    if (shouldNotify) {
      if (online && info) {
        const uptime = serverChecker.getUptime();
        const embed = buildOnlineEmbed(info, uptime);
        console.log('[Server] Server is ONLINE - sending notification');
        await sendEmbed(embed);
      } else {
        const lastChecked = serverChecker.getLastCheckTime() || new Date();
        const embed = buildOfflineEmbed(lastChecked);
        console.log('[Server] Server is OFFLINE - sending notification');
        await sendEmbed(embed);
      }
    } else {
      // Log current status (useful for debugging)
      const state = serverChecker.getCurrentState();
      console.log(`[Server] Status: ${state} (no state change)`);
    }
  } catch (error) {
    console.error('[Server] Error during polling:', error.message);
  }
}

/**
 * Start polling mechanism
 */
function startPolling() {
  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  // Initial check
  pollServer();

  // Set up interval
  pollingInterval = setInterval(pollServer, config.polling.intervalMs);
  console.log(`[Bot] Polling started - interval: ${config.polling.intervalMs}ms`);
}

/**
 * Stop polling mechanism
 */
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[Bot] Polling stopped');
  }
}

/**
 * Bot ready event handler
 */
client.on('ready', async () => {
  console.log(`[Discord] Bot logged in as ${client.user.tag}`);

  // Register slash commands
  await registerSlashCommands();

  // Find target channel
  const channel = client.channels.cache.get(config.discord.channelId);
  
  if (!channel) {
    console.error(`[Discord] Channel ${config.discord.channelId} not found`);
    return;
  }

  if (!channel.isTextBased()) {
    console.error(`[Discord] Channel ${config.discord.channelId} is not a text channel`);
    return;
  }

  targetChannel = channel;
  console.log(`[Discord] Target channel: ${channel.name}`);

  // Send ready message
  const readyEmbed = buildStatusEmbed('ready');
  readyEmbed.description = `Monitoring server: \`${config.minecraft.host}:${config.minecraft.port}\``;
  await sendEmbed(readyEmbed);

  // Start polling
  startPolling();
});

/**
 * Handle bot errors
 */
client.on('error', (error) => {
  console.error('[Discord] Bot error:', error.message);
});

/**
 * Handle slash command interactions
 */
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleSlashCommand(interaction);
});

/**
 * Handle disconnection
 */
client.on('disconnect', () => {
  console.log('[Discord] Bot disconnected');
  stopPolling();
});

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('\n[Bot] Shutting down...');
  stopPolling();
  
  if (client.isReady()) {
    client.destroy();
  }
  
  process.exit(0);
}

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Main entry point
 */
async function main() {
  console.log('=== Minecraft Server Discord Bot ===\n');

  // Validate configuration
  if (!validateConfig()) {
    console.error('\n[Bot] Configuration validation failed. Please fix .env file.');
    process.exit(1);
  }

  console.log('[Config] Configuration validated successfully');
  console.log(`[Config] Server: ${config.minecraft.host}:${config.minecraft.port}`);
  console.log(`[Config] Polling interval: ${config.polling.intervalMs}ms`);

  // Login to Discord
  console.log('[Bot] Logging in to Discord...');
  client.login(config.discord.token).catch((error) => {
    console.error('[Discord] Login failed:', error.message);
    process.exit(1);
  });
}

// Run the bot
main();

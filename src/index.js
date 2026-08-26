import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { config, validateConfig } from './config.js';
import { serverChecker } from './serverChecker.js';
import { buildOnlineEmbed, buildOfflineEmbed, buildStatusEmbed } from './embedBuilder.js';
import { loadCommands } from './commands/index.js';
import { startWebServer } from './web/server.js';
import './web/routes/index.js'; // register HTTP routes (side-effect import)
import { startPoller as startZtPoller, stopPoller as stopZtPoller } from './zt/poller.js';

/**
 * Discord bot client
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
});

/**
 * REST API for slash commands
 */
let rest = null;
let commandMap = new Map();

/**
 * Register slash commands with Discord
 */
async function registerSlashCommands() {
  if (!rest) {
    rest = new REST({ version: '10' }).setToken(config.discord.token);
  }

  const commandsData = Array.from(commandMap.values()).map(cmd => cmd.data.toJSON());

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandsData }
    );
    console.log(`[Discord] Registered ${commandsData.length} slash commands`);
  } catch (error) {
    console.error('[Discord] Failed to register slash commands:', error.message);
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
    const { online, info } = await serverChecker.checkServer();
    const { shouldNotify, newState } = serverChecker.evaluateState(online);
    serverChecker.updateState(newState);

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
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  pollServer();
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
  readyEmbed.description =
    `Monitoring server: \`${config.minecraft.host}:${config.minecraft.port}\`\n` +
    `Exposure: \`${config.minecraft.exposureMode}\`\n` +
    (config.web.enabled ? `Web: http://${config.web.host}:${config.web.port}` : '');
  await sendEmbed(readyEmbed);

  // Start MC server polling
  startPolling();

  // Start web dashboard
  if (config.web.enabled) {
    startWebServer();
  } else {
    console.log('[Web] Disabled by config');
  }

  // Start ZeroTier poller
  if (config.zerotier.enabled) {
    startZtPoller(client);
  }
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

  const cmd = commandMap.get(interaction.commandName);
  if (!cmd) {
    console.warn(`[Bot] Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await cmd.execute(interaction);
  } catch (error) {
    console.error(`[Bot] Error executing /${interaction.commandName}:`, error.message);
    const reply = {
      content: 'Đã xảy ra lỗi khi xử lý command.',
      ephemeral: true,
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

/**
 * Handle disconnection
 */
client.on('disconnect', () => {
  console.log('[Discord] Bot disconnected');
  stopPolling();
  stopZtPoller();
});

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('\n[Bot] Shutting down...');
  stopPolling();
  stopZtPoller();

  if (client.isReady()) {
    client.destroy();
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Main entry point
 */
async function main() {
  console.log('=== Minecraft Server Discord Bot ===\n');

  const configValid = validateConfig();

  if (!configValid) {
    console.error('\n[Bot] Configuration incomplete. Starting in SETUP-ONLY mode.');
    console.error('[Bot] Open http://127.0.0.1:3000/setup to configure, then restart.');
    // Force web enabled in setup mode — user needs the wizard.
    config.web.enabled = true;
    startWebServer();
    // Keep the process alive (otherwise Node would exit after main() returns).
    process.stdin.resume();
    return; // Do NOT login Discord, do NOT start polling.
  }

  console.log('[Config] Configuration validated successfully');
  console.log(`[Config] Server: ${config.minecraft.host}:${config.minecraft.port}`);
  console.log(`[Config] Polling interval: ${config.polling.intervalMs}ms`);

  // Load all slash commands
  console.log('[Bot] Loading slash commands...');
  commandMap = await loadCommands();
  console.log(`[Bot] Loaded ${commandMap.size} slash commands\n`);

  // Login to Discord
  console.log('[Bot] Logging in to Discord...');
  client.login(config.discord.token).catch((error) => {
    console.error('[Discord] Login failed:', error.message);
    process.exit(1);
  });
}

main();

import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config.js';
import { serverChecker } from './serverChecker.js';
import { buildOnlineEmbed, buildOfflineEmbed, buildStatusEmbed } from './embedBuilder.js';

/**
 * Discord bot client
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

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

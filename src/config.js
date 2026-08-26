import 'dotenv/config';

/**
 * Load configuration from environment variables
 * All sensitive data is loaded from .env file
 */
export const config = {
  // Discord configuration
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
  },

  // Minecraft server configuration
  minecraft: {
    host: process.env.MC_SERVER_HOST,
    port: parseInt(process.env.MC_SERVER_PORT, 10) || 25565,
  },

  // Bot behavior
  polling: {
    intervalMs: parseInt(process.env.POLLING_INTERVAL_MS, 10) || 30000,
    timeoutMs: parseInt(process.env.POLLING_TIMEOUT_MS, 10) || 5000,
  },
};

/**
 * Validate required configuration
 * @returns {boolean} true if all required config is present
 */
export function validateConfig() {
  const errors = [];

  if (!config.discord.token) {
    errors.push('DISCORD_BOT_TOKEN is required');
  }

  if (!config.discord.channelId) {
    errors.push('DISCORD_CHANNEL_ID is required');
  }

  if (!config.minecraft.host) {
    errors.push('MC_SERVER_HOST is required');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nPlease check your .env file and .env.example for reference.');
    return false;
  }

  return true;
}

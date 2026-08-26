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

  // Admin Discord user IDs (comma-separated)
  admin: {
    discordIds: (process.env.ADMIN_DISCORD_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  },

  // Minecraft server configuration
  minecraft: {
    host: process.env.MC_SERVER_HOST,
    port: parseInt(process.env.MC_SERVER_PORT, 10) || 25565,
    // 'public' = server accessible from internet, 'private' = needs ZeroTier
    exposureMode: process.env.MC_EXPOSURE_MODE || 'public',
    // Public hostname/IP (cho public mode)
    publicHost: process.env.MC_PUBLIC_HOST || process.env.MC_SERVER_HOST,
  },

  // ZeroTier configuration (only when MC_EXPOSURE_MODE=private)
  zerotier: {
    enabled: process.env.ZT_ENABLED === 'true',
    apiToken: process.env.ZT_API_TOKEN || '',
    networkId: process.env.ZT_NETWORK_ID || '',
    pollIntervalMs: parseInt(process.env.ZT_POLL_INTERVAL_MS, 10) || 60000,
  },

  // Web dashboard configuration
  web: {
    enabled: process.env.WEB_ENABLED === 'true',
    port: parseInt(process.env.WEB_PORT, 10) || 3000,
    host: process.env.WEB_HOST || '127.0.0.1',  // localhost only by default
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

  // ZeroTier validation (only if mode is private)
  if (config.minecraft.exposureMode === 'private') {
    if (!config.zerotier.enabled) {
      errors.push('ZT_ENABLED must be true when MC_EXPOSURE_MODE=private');
    }
    if (!config.zerotier.apiToken) {
      errors.push('ZT_API_TOKEN is required for ZeroTier integration');
    }
    if (!config.zerotier.networkId) {
      errors.push('ZT_NETWORK_ID is required for ZeroTier integration');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nPlease check your .env file and .env.example for reference.');
    return false;
  }

  return true;
}

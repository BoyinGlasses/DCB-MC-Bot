import { config } from './config.js';

// Embed colors
const COLORS = {
  ONLINE: 0x00ff00,   // Green
  OFFLINE: 0xff0000,  // Red
  UNKNOWN: 0x808080,  // Gray
};

/**
 * Format player names into a readable string
 * @param {Array} players - Array of player objects with name property
 * @returns {string} Formatted player list
 */
function formatPlayerList(players) {
  if (!players || players.length === 0) {
    return 'No players online';
  }

  const names = players.map(p => p.name || p).slice(0, 10); // Limit to 10 players
  
  if (names.length <= 5) {
    return names.join(', ');
  }
  
  // For many players, show first 5 and count remaining
  const shown = names.slice(0, 5).join(', ');
  const remaining = names.length - 5;
  return `${shown} +${remaining} more`;
}

/**
 * Format uptime from milliseconds to human readable
 * @param {number} uptimeMs - Uptime in milliseconds
 * @returns {string} Formatted uptime string
 */
export function formatUptime(uptimeMs) {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Clean MOTD text - remove color codes and formatting
 * @param {string} motd - Raw MOTD text
 * @returns {string} Cleaned text
 */
function cleanMotd(motd) {
  if (!motd) return 'Unknown Server';
  
  // Handle object format from minecraft-server-util
  if (typeof motd === 'object') {
    motd = motd.text || motd.extra?.map(e => e.text).join('') || JSON.stringify(motd);
  }
  
  // Remove Minecraft color codes (§) and formatting
  return motd
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/\n/g, ' ')
    .trim() || 'Unknown Server';
}

/**
 * Build rich embed for server ONLINE status
 * @param {Object} serverInfo - Server information from minecraft-server-util
 * @param {number} uptimeMs - Server uptime in milliseconds
 * @returns {Object} Discord embed object
 */
export function buildOnlineEmbed(serverInfo, uptimeMs) {
  const embed = {
    title: '🟢 Server is ONLINE!',
    color: COLORS.ONLINE,
    timestamp: new Date().toISOString(),
    fields: [],
    footer: {
      text: 'Minecraft Server Monitor',
    },
  };

  // Server Name / MOTD
  const serverName = cleanMotd(serverInfo.description);
  embed.fields.push({
    name: '📌 Server Name',
    value: serverName,
    inline: true,
  });

  // Minecraft Version
  const version = serverInfo.version?.name || 'Unknown';
  embed.fields.push({
    name: '🎮 Version',
    value: version,
    inline: true,
  });

  // Player Count
  const online = serverInfo.players?.online ?? 0;
  const max = serverInfo.players?.max ?? 0;
  embed.fields.push({
    name: '👥 Players',
    value: `${online} / ${max}`,
    inline: true,
  });

  // Player List (if any players online)
  if (serverInfo.players?.sample && serverInfo.players.sample.length > 0) {
    const playerList = formatPlayerList(serverInfo.players.sample);
    embed.fields.push({
      name: '   Players Online',
      value: playerList,
      inline: false,
    });
  }

  // Latency / Ping
  const latency = serverInfo.latency ?? 0;
  embed.fields.push({
    name: '📡 Ping',
    value: `${latency}ms`,
    inline: true,
  });

  // Server Address
  const address = `${config.minecraft.host}:${config.minecraft.port}`;
  embed.fields.push({
    name: '🌐 Address',
    value: `\`${address}\``,
    inline: true,
  });

  // Uptime
  const uptimeStr = formatUptime(uptimeMs);
  embed.fields.push({
    name: '⏱️ Uptime',
    value: uptimeStr,
    inline: true,
  });

  return embed;
}

/**
 * Build rich embed for server OFFLINE status
 * @param {Date} lastChecked - Last time server was checked
 * @returns {Object} Discord embed object
 */
export function buildOfflineEmbed(lastChecked) {
  return {
    title: '🔴 Server is OFFLINE',
    color: COLORS.OFFLINE,
    description: 'Server has stopped or is unreachable.',
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: '⏰ Last Checked',
        value: lastChecked.toLocaleTimeString(),
        inline: true,
      },
    ],
    footer: {
      text: 'Minecraft Server Monitor',
    },
  };
}

/**
 * Build initial/status embed
 * @param {string} status - Current status
 * @returns {Object} Discord embed object
 */
export function buildStatusEmbed(status) {
  const colors = {
    connecting: COLORS.UNKNOWN,
    ready: COLORS.ONLINE,
    error: COLORS.OFFLINE,
  };

  const titles = {
    connecting: '⚙️ Connecting...',
    ready: '✅ Bot Ready',
    error: '❌ Error',
  };

  return {
    title: titles[status] || 'Unknown Status',
    color: colors[status] || COLORS.UNKNOWN,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Minecraft Server Monitor',
    },
  };
}

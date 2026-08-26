/**
 * Shared utilities for slash commands
 */

/**
 * Send a DM to a Discord user
 * @param {Client} client - Discord.js client
 * @param {string} userId - Discord user ID
 * @param {Object} payload - { title, description, color, fields }
 * @returns {Promise<boolean>} true if sent successfully
 */
export async function sendDm(client, userId, payload) {
  try {
    const user = await client.users.fetch(userId);
    if (!user) {
      console.error(`[DM] User ${userId} not found`);
      return false;
    }

    const dm = await user.createDM();
    const embed = {
      title: payload.title,
      description: payload.description,
      color: payload.color ?? 0x5865f2,
      timestamp: new Date().toISOString(),
      footer: { text: 'Minecraft Server Bot' },
    };

    if (payload.fields && Array.isArray(payload.fields)) {
      embed.fields = payload.fields;
    }

    await dm.send({ embeds: [embed] });
    console.log(`[DM] Sent to user ${userId}: ${payload.title}`);
    return true;
  } catch (err) {
    console.error(`[DM] Failed to send to ${userId}:`, err.message);
    return false;
  }
}

/**
 * Check if a user is an admin
 * @param {string} userId
 * @returns {boolean}
 */
export function isAdmin(userId) {
  return (process.env.ADMIN_DISCORD_IDS || '').split(',').map(s => s.trim()).filter(Boolean).includes(userId);
}

/**
 * Format milliseconds into a human-readable uptime string
 * @param {number} ms
 * @returns {string}
 */
export function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

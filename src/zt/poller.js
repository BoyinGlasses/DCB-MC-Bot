/**
 * ZeroTier poller
 * Periodically checks pending requests to see if admin has authorized
 * members directly in ZeroTier Central UI (without using /zt-approve)
 */
import { getMember } from './api.js';
import { getPendingRequests, markAutoApproved } from './flow.js';
import { config } from '../config.js';
import { sendDm } from '../commands/_utils.js';
import { appendToArray } from '../storage/store.js';

let intervalId = null;
let client = null;

/**
 * Start the poller
 * @param {Client} discordClient
 */
export function startPoller(discordClient) {
  if (intervalId) return;  // Already running
  if (!config.zerotier.enabled) {
    console.log('[ZT-Poller] Skipped (ZeroTier disabled)');
    return;
  }

  client = discordClient;
  const intervalMs = config.zerotier.pollIntervalMs;

  // Run immediately, then on interval
  pollOnce().catch(err => console.error('[ZT-Poller] Error:', err.message));
  intervalId = setInterval(() => {
    pollOnce().catch(err => console.error('[ZT-Poller] Error:', err.message));
  }, intervalMs);

  console.log(`[ZT-Poller] Started - interval: ${intervalMs}ms`);
}

/**
 * Stop the poller
 */
export function stopPoller() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[ZT-Poller] Stopped');
  }
}

/**
 * Run one polling cycle
 * Check all pending requests, send IP to any newly authorized members
 */
async function pollOnce() {
  if (!client) return;

  const pending = getPendingRequests();
  if (pending.length === 0) return;

  console.log(`[ZT-Poller] Checking ${pending.length} pending request(s)...`);

  for (const req of pending) {
    try {
      const member = await getMember(req.ztMemberId);
      if (!member) continue;

      // User was authorized in Central UI (without using /zt-approve)
      if (member.authorized) {
        console.log(`[ZT-Poller] Auto-detected authorization for ${req.mcUsername} (${req.ztMemberId})`);

        // Send IP to user
        const address = `${config.minecraft.publicHost}:${config.minecraft.port}`;
        await sendDm(client, req.discordUserId, {
          title: '✅ Bạn đã được duyệt!',
          color: 0x00ff00,
          description:
            `Chào <@${req.discordUserId}>!\n\n` +
            `Admin đã duyệt bạn trong ZeroTier Central.\n\n` +
            `**🔌 Địa chỉ Minecraft:**\n` +
            `\`\`\`${address}\`\`\`\n` +
            `Mở Minecraft → Multiplayer → Add Server → paste địa chỉ trên.`,
        });

        // Mark as approved
        markAutoApproved(req.id);
        appendToArray('zt-audit.json', {
          action: 'auto_approved_via_poller',
          requestId: req.id,
          discordUserId: req.discordUserId,
        });
      }
    } catch (err) {
      console.error(`[ZT-Poller] Error processing ${req.id}:`, err.message);
    }
  }
}

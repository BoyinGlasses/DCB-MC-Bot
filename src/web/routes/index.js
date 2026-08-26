/**
 * Web route definitions
 * Routes are registered on import
 */
import { route, render, sendJson, sendHtml, readBody } from '../server.js';
import { config } from '../../config.js';
import { serverChecker } from '../../serverChecker.js';
import { readJson, writeJson, appendToArray, appendLog } from '../../storage/store.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const PROJECT_ROOT = resolve(process.cwd());

// =============================================================================
// Home / Dashboard
// =============================================================================

route('GET', '/', async (req, res) => {
  // For now redirect to setup or dashboard depending on .env existence
  const envPath = join(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) {
    res.writeHead(302, { Location: '/setup' });
    return res.end();
  }
  const html = render('dashboard.html', {
    exposureMode: config.minecraft.exposureMode,
    publicHost: config.minecraft.publicHost,
    serverPort: config.minecraft.port,
  });
  sendHtml(res, 200, html);
});

// =============================================================================
// Setup Wizard
// =============================================================================

route('GET', '/setup', async (req, res) => {
  const html = render('setup.html', {
    currentDiscordToken: config.discord.token || '',
    currentChannelId: config.discord.channelId || '',
    currentAdminIds: config.admin.discordIds.join(','),
    currentMcHost: config.minecraft.host || '',
    currentMcPort: config.minecraft.port,
    currentExposureMode: config.minecraft.exposureMode,
    isPublicMode: config.minecraft.exposureMode === 'public' ? 'selected' : '',
    isPrivateMode: config.minecraft.exposureMode === 'private' ? 'selected' : '',
    currentPublicHost: config.minecraft.publicHost || '',
    isZtEnabledChecked: config.zerotier.enabled ? 'checked' : '',
    currentZtToken: config.zerotier.apiToken || '',
    currentZtNetworkId: config.zerotier.networkId || '',
    isWebEnabledChecked: config.web.enabled ? 'checked' : '',
    currentWebHost: config.web.host,
    currentWebPort: config.web.port,
  });
  sendHtml(res, 200, html);
});

route('POST', '/api/setup/save', async (req, res) => {
  const body = await readBody(req);
  const params = new URLSearchParams(body);

  const envLines = [
    '# Discord Bot Configuration',
    `DISCORD_BOT_TOKEN=${params.get('discord_token') || ''}`,
    `DISCORD_CHANNEL_ID=${params.get('discord_channel_id') || ''}`,
    '',
    '# Admin Discord User IDs (comma-separated)',
    `ADMIN_DISCORD_IDS=${params.get('admin_ids') || ''}`,
    '',
    '# Minecraft Server Configuration',
    `MC_SERVER_HOST=${params.get('mc_host') || ''}`,
    `MC_SERVER_PORT=${params.get('mc_port') || '25565'}`,
    `MC_EXPOSURE_MODE=${params.get('exposure_mode') || 'public'}`,
    `MC_PUBLIC_HOST=${params.get('public_host') || params.get('mc_host') || ''}`,
    '',
    '# ZeroTier Configuration',
    `ZT_ENABLED=${params.get('zt_enabled') === 'true' ? 'true' : 'false'}`,
    `ZT_API_TOKEN=${params.get('zt_token') || ''}`,
    `ZT_NETWORK_ID=${params.get('zt_network_id') || ''}`,
    `ZT_POLL_INTERVAL_MS=60000`,
    '',
    '# Web Dashboard Configuration',
    `WEB_ENABLED=${params.get('web_enabled') === 'true' ? 'true' : 'false'}`,
    `WEB_HOST=${params.get('web_host') || '127.0.0.1'}`,
    `WEB_PORT=${params.get('web_port') || '3000'}`,
    '',
    '# Polling Configuration',
    `POLLING_INTERVAL_MS=30000`,
    `POLLING_TIMEOUT_MS=5000`,
  ];

  const envContent = envLines.join('\n') + '\n';
  const envPath = join(PROJECT_ROOT, '.env');

  // Backup existing
  if (existsSync(envPath)) {
    const backupPath = join(PROJECT_ROOT, `.env.backup.${Date.now()}`);
    try {
      writeFileSync(backupPath, readFileSync(envPath));
      appendLog('setup.log', `Backed up .env to ${backupPath}`);
    } catch (err) {
      appendLog('setup.log', `Backup failed: ${err.message}`);
    }
  }

  try {
    writeFileSync(envPath, envContent, 'utf-8');
    appendLog('setup.log', 'Wrote new .env');
    sendJson(res, 200, {
      ok: true,
      message: 'Đã lưu .env! Khởi động lại bot để áp dụng.',
      restart: 'Chạy lại: Ctrl+C rồi npm start',
    });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
});

// =============================================================================
// API: Status (polled by dashboard, returns HTML fragment for HTMX)
// =============================================================================

function formatUptime(ms) {
  if (!ms || ms < 0) return '—';
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

route('GET', '/api/status', async (req, res, ctx) => {
  try {
    const { online, info } = await serverChecker.checkServer();
    const state = serverChecker.getCurrentState();
    const lastCheck = serverChecker.getLastCheckTime();
    const lastOnline = serverChecker.getLastOnlineTime
      ? serverChecker.getLastOnlineTime()
      : null;

    const lastCheckText = lastCheck ? lastCheck.toLocaleString() : '—';
    const lastOnlineText = lastOnline ? lastOnline.toLocaleString() : '—';

    let stateLabel, stateClass, stateText;
    if (online) {
      stateLabel = '🟢 ONLINE';
      stateClass = 'status-online';
      stateText = 'Server đang chạy';
    } else if (state === 'offline') {
      stateLabel = '🔴 OFFLINE';
      stateClass = 'status-offline';
      stateText = 'Server đã tắt';
    } else {
      stateLabel = '⚪ UNKNOWN';
      stateClass = 'status-pending';
      stateText = 'Đang kiểm tra...';
    }

    const playersOnline = online && info?.players ? info.players.online : 0;
    const playersMax = online && info?.players ? info.players.max : 0;
    const latency = online && info ? (info.latency ?? 0) : 0;
    const uptimeText = online ? formatUptime(serverChecker.getUptime()) : '—';
    const version = online && info ? (info.version || '—') : '—';
    const motd = online && info
      ? (typeof info.motd === 'string' ? info.motd : (info.motd?.clean || ''))
      : '';
    const exposureModeText = config.minecraft.exposureMode === 'private' ? '🔒 Private (ZeroTier)' : '🌐 Public';

    const motdLine = motd
      ? `<li><strong>MOTD:</strong> <code>${motd.replace(/[<>&]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c]))}</code></li>`
      : '';

    const html = `
<article>
  <header>
    <h2>${stateLabel} <span class="status-pill ${stateClass}">${stateText}</span></h2>
  </header>

  <div class="grid-metrics">
    <div class="metric-card">
      <div class="label">Players</div>
      <div class="value ${online ? 'online' : 'offline'}">${playersOnline} / ${playersMax}</div>
    </div>
    <div class="metric-card">
      <div class="label">Ping</div>
      <div class="value">${latency}ms</div>
    </div>
    <div class="metric-card">
      <div class="label">Uptime</div>
      <div class="value" style="font-size: 1.25rem;">${uptimeText}</div>
    </div>
    <div class="metric-card">
      <div class="label">Mode</div>
      <div class="value" style="font-size: 1rem;">${exposureModeText}</div>
    </div>
  </div>

  <article>
    <header><h4>🔌 Server Info</h4></header>
    <ul>
      <li><strong>Address:</strong> <code>${config.minecraft.publicHost}:${config.minecraft.port}</code></li>
      <li><strong>Version:</strong> ${version}</li>
      ${motdLine}
      <li><strong>Player Guide:</strong> <a href="/guide" target="_blank">/guide</a></li>
    </ul>
  </article>

  <footer>
    <small>Last check: ${lastCheckText} · Last online: ${lastOnlineText}</small>
  </footer>
</article>
    `;

    sendHtml(res, 200, html);
  } catch (err) {
    sendHtml(res, 500, `<article><strong>Error:</strong> ${err.message}</article>`);
  }
});

// =============================================================================
// Guide (public page for players)
// =============================================================================

route('GET', '/guide', async (req, res) => {
  if (config.minecraft.exposureMode === 'private' && config.zerotier.enabled) {
    const html = render('guide-zerotier.html', {
      serverName: 'Minecraft Server',
      publicHost: config.minecraft.publicHost,
      serverPort: config.minecraft.port,
      ztNetworkId: config.zerotier.networkId,
    });
    return sendHtml(res, 200, html);
  }

  const html = render('guide-public.html', {
    serverName: 'Minecraft Server',
    publicHost: config.minecraft.publicHost,
    serverPort: config.minecraft.port,
  });
  sendHtml(res, 200, html);
});

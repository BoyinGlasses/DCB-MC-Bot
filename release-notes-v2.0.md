# v2.0 — Web Dashboard + ZeroTier Flow

Breaking-ish: file `.env` mở rộng với nhiều keys mới. Bot v1 vẫn chạy với `.env` cũ (chỉ thiếu ZT/web).

## 🌟 Tính năng mới

### Web Dashboard (localhost)
- **Setup Wizard** tại `http://127.0.0.1:3000/setup` — điền config trên form thay vì edit `.env` tay
- **Dashboard** tại `http://127.0.0.1:3000/` — live status, auto-refresh 10s
- **Player Guide** tại `http://127.0.0.1:3000/guide` — auto-detect public/private mode, copy IP/network ID
- Built với **Pico CSS + HTMX** (vendored, no build step, no CDN)

### ZeroTier flow (cho private servers)
- **5 slash commands mới**:
  - `/zt-request <zt-id> <mc-username>` — User gửi yêu cầu join
  - `/zt-approve <request-id>` — Admin duyệt, auto-authorize qua ZT API + DM IP
  - `/zt-deny <request-id> [reason]` — Admin từ chối + DM lý do
  - `/zt-list` — Xem pending requests
  - `/zt-myinfo` — User check trạng thái yêu cầu của mình
- **Auto-polling** mỗi 60s — bot check ZT API, nếu user được authorize (bằng Central UI hoặc command) thì tự DM IP
- **Audit log** trong `data/zt-audit.json` (auto-bounded 1000 entries)

### Cấu trúc
- Tách `src/commands/` — mỗi command 1 file, auto-load qua `src/commands/index.js`
- `src/zt/` — module ZeroTier (api.js + flow.js + poller.js)
- `src/storage/` — JSON file storage helper
- `src/web/` — HTTP server (built-in `node:http`, không cần framework)

## 🔧 Cấu hình mới

Thêm vào `.env`:
```bash
# Admin Discord user IDs (comma-separated)
ADMIN_DISCORD_IDS=your_user_id

# Exposure mode: 'public' hoặc 'private'
MC_EXPOSURE_MODE=public
MC_PUBLIC_HOST=your.server.com

# ZeroTier (chỉ cần khi private)
ZT_ENABLED=false
ZT_API_TOKEN=
ZT_NETWORK_ID=
ZT_POLL_INTERVAL_MS=60000

# Web Dashboard
WEB_ENABLED=true
WEB_HOST=127.0.0.1
WEB_PORT=3000
```

## 📋 Tổng danh sách slash command

| Lệnh | Mô tả | Quyền |
|------|-------|-------|
| `/serverstatus` | Trạng thái on/off + uptime | Mọi người |
| `/serverinfo` | Thông tin chi tiết server | Mọi người |
| `/showplayer` | Danh sách người chơi đang online | Mọi người |
| `/uptime` | Thời gian chạy liên tục | Mọi người |
| `/ip` | Địa chỉ kết nối (ephemeral) | Mọi người |
| `/ping` | Latency hiện tại | Mọi người |
| `/lastcheck` | Lần kiểm tra gần nhất | Mọi người |
| `/zt-request` | Gửi yêu cầu join ZeroTier | Mọi người |
| `/zt-myinfo` | Xem status yêu cầu ZeroTier của mình | Mọi người |
| `/zt-list` | List pending ZeroTier requests | Admin |
| `/zt-approve` | Duyệt yêu cầu ZeroTier | Admin |
| `/zt-deny` | Từ chối yêu cầu | Admin |

## 🚀 Migration từ v1

1. `git pull` (hoặc copy file mới)
2. `npm install` (thêm `undici`)
3. Chạy `npm start` → mở `http://127.0.0.1:3000/setup` để điền config mới
4. Hoặc copy các key mới từ `.env.example` vào `.env` cũ

Không có breaking change cho core bot — tất cả command cũ vẫn hoạt động bình thường.

## 📁 Cấu trúc file mới

```
src/
├── index.js              # Entry (gọn hơn, commands tự load)
├── config.js             # Extended: admin + ZT + web
├── serverChecker.js      # (giữ nguyên)
├── embedBuilder.js       # (giữ nguyên)
├── commands/             # 12 files (7 cũ + 5 ZT)
├── zt/                   # 🆕 api.js + flow.js + poller.js
├── storage/store.js      # 🆕 JSON helpers
└── web/                  # 🆕 server.js + routes/ + views/

public/
├── vendor/pico.min.css   # 🆕 82KB
├── vendor/htmx.min.js    # 🆕 48KB
└── css/custom.css        # 🆕 Minecraft theme

data/                     # 🆕 Auto-generated (gitignored)
├── zt-requests.json
├── zt-audit.json
├── web-access.log
└── setup.log
```

# 🎮 Minecraft Server Discord Bot v2.0

Discord bot để monitor Minecraft server + **web dashboard** + **ZeroTier join flow** (optional).

## ✨ Tính năng

### Core (v1)
- 📡 **Monitor** Minecraft server liên tục, thông báo online/offline lên Discord
- 📊 **Slash commands**: `/serverstatus`, `/uptime`, `/ip`, `/ping`, `/showplayer`, `/lastcheck`, `/serverinfo`
- ⚙️ Config qua `.env` (Discord token, MC server address, polling interval)

### Mới ở v2.0
- 🌐 **Web Dashboard** (localhost) — xem live status, edit config, restart bot
- 📝 **Setup Wizard** — không cần edit `.env` thủ công, điền form trên web
- 📜 **Player Guide page** (`/guide`) — hướng dẫn cho player mới (auto-detect public/private mode)
- 🔒 **ZeroTier flow** (optional, cho private servers) — user tự request, admin approve qua slash command, bot auto-DM IP
- 🛡️ **Admin commands**: `/zt-approve`, `/zt-deny`, `/zt-list`, `/zt-myinfo`
- 📋 **Audit log** — track tất cả ZeroTier approvals
- 🔄 **Auto-polling** — bot check ZeroTier mỗi 60s, tự gửi IP cho user nếu admin approve thẳng trong Central UI

## 📦 Cài đặt

```bash
git clone <repo>
cd minecraftserverbot
npm install
cp .env.example .env
npm start
```

Sau khi chạy lần đầu, mở browser: **http://127.0.0.1:3000** — sẽ redirect tới Setup Wizard nếu `.env` chưa có config.

## ⚙️ Cấu hình

### Bằng Setup Wizard (khuyến nghị)
1. Chạy `npm start` (lần đầu sẽ fail vì thiếu config — OK)
2. Mở http://127.0.0.1:3000/setup
3. Điền form, click **Lưu**
4. `Ctrl+C` rồi `npm start` lại

### Bằng tay (legacy)
Sửa file `.env` theo hướng dẫn trong `.env.example`.

## 🎮 Slash Commands

### Cho mọi người
| Command | Mô tả |
|---------|-------|
| `/serverstatus` | Xem trạng thái server hiện tại |
| `/uptime` | Server đã chạy được bao lâu |
| `/ip` | Lấy địa chỉ Minecraft |
| `/ping` | Latency hiện tại |
| `/showplayer` | Danh sách player online |
| `/lastcheck` | Lần check gần nhất |
| `/serverinfo` | Thông tin chi tiết (version, MOTD) |
| `/zt-request` | (Private mode) Gửi yêu cầu join ZeroTier |
| `/zt-myinfo` | Xem trạng thái yêu cầu ZeroTier của mình |

### Cho admin
| Command | Mô tả |
|---------|-------|
| `/zt-approve <id>` | Duyệt yêu cầu ZeroTier + auto-DM IP |
| `/zt-deny <id> [reason]` | Từ chối |
| `/zt-list` | List pending requests |

## 🌐 ZeroTier Flow (Private Mode)

Khi `MC_EXPOSURE_MODE=private`, server cần ZeroTier để player join.

### Setup phía admin
1. Tạo ZeroTier network tại https://my.zerotier.com
2. Lấy **Network ID** + **API Token** (Account → API Tokens)
3. Điền vào Setup Wizard → bật ZeroTier
4. Authorize chính máy chủ Minecraft trong ZeroTier Central

### Flow cho player mới
1. Vào `/guide` trên web → đọc hướng dẫn
2. Tải ZeroTier, tạo account
3. Join network (paste Network ID)
4. Lấy Node ID (10 ký tự hex)
5. DM bot: `/zt-request zt-id:<id> mc-username:<name>`
6. Admin thấy notification → dùng `/zt-approve <request-id>`
7. Bot tự authorize qua API + DM IP cho user
8. User mở Minecraft → connect

## 📁 Cấu trúc

```
src/
├── index.js              # Entry point
├── config.js             # Load .env + validate
├── serverChecker.js      # Minecraft server polling
├── embedBuilder.js       # Discord embed helpers
├── commands/             # Slash commands (auto-loaded)
│   ├── _utils.js         # sendDm, isAdmin helpers
│   ├── showplayer.js
│   ├── serverstatus.js
│   ├── uptime.js
│   ├── ip.js
│   ├── ping.js
│   ├── lastcheck.js
│   ├── serverinfo.js
│   ├── zt-request.js     # 🆕
│   ├── zt-approve.js     # 🆕
│   ├── zt-deny.js        # 🆕
│   ├── zt-list.js        # 🆕
│   └── zt-myinfo.js      # 🆕
├── zt/                   # 🆕 ZeroTier
│   ├── api.js            # Central API wrapper
│   ├── flow.js           # Request/approve/deny logic
│   └── poller.js         # 60s auto-detect authorizations
├── storage/              # 🆕 JSON file storage
│   └── store.js          # readJson, writeJson, appendToArray
└── web/                  # 🆕 Web dashboard
    ├── server.js         # HTTP server (built-in, no framework)
    ├── routes/index.js   # Route handlers
    └── views/            # HTML templates
        ├── setup.html
        ├── dashboard.html
        ├── guide-public.html
        └── guide-zerotier.html
```

## 💾 Runtime data

Bot tự tạo và quản lý data trong `data/`:
- `zt-requests.json` — tất cả ZeroTier requests
- `zt-audit.json` — audit log (approvals, denials, etc.)
- `web-access.log` — web server access log
- `setup.log` — setup wizard activity

Folder này được `.gitignore` (chỉ có `.gitkeep`).

## 🔒 Bảo mật

- Web dashboard bind `127.0.0.1` (localhost only) theo mặc định
- KHÔNG public web ra internet trừ khi bạn hiểu rõ rủi ro
- Nếu cần truy cập từ xa, dùng reverse proxy (Nginx/Caddy) + HTTPS + auth
- `.env` chứa token — KHÔNG commit, KHÔNG share
- ZeroTier API token có quyền authorize members — giữ bí mật

## 📜 License

MIT — see [LICENSE](LICENSE) file.

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🔗 Links

- 🐛 [Report bug](https://github.com/BoyinGlasses/DCB-MC-Bot/issues)
- 💡 [Request feature](https://github.com/BoyinGlasses/DCB-MC-Bot/issues)
- 📥 [View source](https://github.com/BoyinGlasses/DCB-MC-Bot)

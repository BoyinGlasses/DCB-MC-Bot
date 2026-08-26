# Minecraft Server Discord Bot

Discord bot thông báo khi Minecraft server (Fabric) online/offline, kèm rich server info.

## Tính năng

- 🟢 Thông báo khi server online với đầy đủ thông tin:
  - Server Name (MOTD)
  - Minecraft Version
  - Số người chơi đang online
  - Ping/Latency
  - Server Address
  - Uptime
- 🔴 Thông báo khi server offline
- ⏱️ Không spam - chỉ thông báo khi trạng thái thay đổi
- 🔧 Dễ cấu hình qua file `.env`
- 🎮 Slash commands:
  - `/showplayer` - Xem danh sách người chơi đang online
  - `/serverstatus` - Kiểm tra trạng thái server

## Yêu cầu

- Node.js 18+
- Discord bot token (từ [Discord Developer Portal](https://discord.com/developers/applications))
- Minecraft server chạy Fabric (hoặc bất kỳ server nào hỗ trợ ping protocol)

## Cài đặt

### 1. Clone/Download project

```bash
cd minecraftserverbot
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Tạo file `.env`

Copy file `.env.example` và điền thông tin:

```bash
cp .env.example .env
```

### 4. Cấu hình `.env`

Mở file `.env` và điền các giá trị:

```env
# Discord Bot Token - lấy từ Discord Developer Portal
DISCORD_BOT_TOKEN=your_bot_token_here

# Channel ID - Enable Developer Mode trong Discord, right-click channel, Copy Channel ID
DISCORD_CHANNEL_ID=123456789012345678

# Minecraft Server Address
MC_SERVER_HOST=your.server.ip
MC_SERVER_PORT=25565

# Polling interval (ms) - 30000 = 30 giây
POLLING_INTERVAL_MS=30000
```

### 5. Tạo Discord Bot

1. Vào [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" → đặt tên
3. Vào "Bot" → "Reset Token" để lấy token
4. Bật **Message Content Intent** trong Bot settings
5. Invite bot vào server:
   - Vào "OAuth2" → "URL Generator"
   - Chọn scopes: `bot`
   - Chọn permissions: `Send Messages`, `Embed Links`
   - Copy URL và mở trong trình duyệt

### 6. Chạy bot

```bash
npm start
```

## Chạy với PM2 (Production)

```bash
# Cài đặt PM2
npm install -g pm2

# Chạy bot
pm2 start src/index.js --name minecraft-bot

# Auto-restart khi crash
pm2 startup

# Lưu process list
pm2 save
```

## Cấu trúc project

```
minecraftserverbot/
├── src/
│   ├── index.js          # Main bot entry point
│   ├── config.js         # Configuration loader
│   ├── serverChecker.js  # Server polling & state machine
│   └── embedBuilder.js   # Rich embed message builder
├── .env                  # Your configuration (gitignored)
├── .env.example          # Configuration template
├── package.json
└── README.md
```

## Troubleshooting

### Bot không phản hồi?
- Kiểm tra Discord bot token đúng chưa
- Kiểm tra Channel ID đúng chưa
- Kiểm tra bot đã được invite vào server chưa

### Không lấy được server info?
- Kiểm tra Minecraft server có online không
- Kiểm tra server address và port đúng chưa
- Một số server có thể cần enable query trong server.properties

### Thông báo spam?
- Bot sẽ không spam - chỉ thông báo khi trạng thái thay đổi
- Nếu server unstable (lên xuống liên tục), giảm `POLLING_INTERVAL_MS`

## License

MIT

# Contributing to Minecraft Server Discord Bot

Cảm ơn bạn quan tâm đến việc đóng góp! 🎮

## 🐛 Báo bug

Mở [GitHub Issue](https://github.com/BoyinGlasses/DCB-MC-Bot/issues) với:

- **Mô tả ngắn gọn** vấn đề
- **Steps to reproduce** (càng chi tiết càng tốt)
- **Expected vs actual behavior**
- **Environment**:
  - Node.js version (`node --version`)
  - OS (Windows/Mac/Linux)
  - Bot version (`git describe --tags`)
- **Logs** (paste từ console, redact Discord token trước khi post!)

## 💡 Đề xuất feature

Mở issue với prefix `[Feature Request]` + mô tả:
- Use case thực tế
- Mockup / sketch nếu có
- Backward compatibility impact

## 🔧 Pull Request

### Setup local

```bash
git clone https://github.com/BoyinGlasses/DCB-MC-Bot.git
cd DCB-MC-Bot
npm install
cp .env.example .env
# Điền token Discord + channel ID test
npm run dev
```

### Coding conventions

- **ESM modules** (`import` / `export`, không CommonJS)
- **No build step** — giữ repo đơn giản, dev pull về chạy được ngay
- **Vanilla JS** (no TypeScript) — phù hợp scale hiện tại
- **No web framework** — dùng built-in `node:http` cho web
- **JSON file storage** — không thêm DB dependency
- **Style**: 2-space indent, single quotes, no semicolons OK (match code hiện tại)

### Slash command mới

Mỗi command là 1 file trong `src/commands/`:

```js
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('my-command')
    .setDescription('Mô tả ngắn'),
  
  async execute(interaction) {
    // ...
  },
};
```

Bot tự load từ folder này — không cần register thủ công.

### ZeroTier extension

Nếu thêm tunnel khác (Tailscale, ngrok, Cloudflare Tunnel):
- Tạo `src/<tunnel-name>/` theo pattern của `src/zt/`
- Update `src/web/views/guide-*.html` để handle mode mới
- Update setup wizard

### Trước khi PR

- [ ] Test chạy local với `npm run dev`
- [ ] Nếu thêm command, verify register thành công trên Discord
- [ ] Update `README.md` nếu thêm tính năng user-facing
- [ ] Add entry vào `release-notes-vX.Y.md` (hoặc tạo file mới cho version mới)
- [ ] Commit message theo [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: ...` — tính năng mới
  - `fix: ...` — bug fix
  - `refactor: ...` — không thay đổi behavior
  - `docs: ...` — chỉ documentation
  - `chore: ...` — maintenance

## 📦 Release process

1. Update version trong `package.json`
2. Tạo `release-notes-vX.Y.md` mô tả changes
3. Tag: `git tag -a vX.Y.Z -m "..."`
4. Push: `git push origin main --tags`

## 🤝 Code of Conduct

- Tôn trọng người khác
- Giữ issue/PR constructively
- Không spam, không quảng cáo

## 📞 Liên hệ

- GitHub: [@BoyinGlasses](https://github.com/BoyinGlasses)
- Discord: mở issue trên GitHub (preferred)

---

Made with ⛏️ for the Minecraft community

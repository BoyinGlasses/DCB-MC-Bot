/**
 * Slash commands registry
 * Tự động load tất cả commands từ folder này (trừ _utils.js, _loader.js, index.js)
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = __dirname;

const SKIP_FILES = new Set(['index.js', '_utils.js', '_loader.js']);

/**
 * Load all command modules dynamically
 * @returns {Promise<Map<string, Object>>} Map of commandName -> command
 */
export async function loadCommands() {
  const commands = new Map();
  const files = readdirSync(COMMANDS_DIR).filter(f =>
    f.endsWith('.js') && !SKIP_FILES.has(f)
  );

  for (const file of files) {
    const filePath = join(COMMANDS_DIR, file);
    const fileUrl = pathToFileURL(filePath).href;

    try {
      const module = await import(fileUrl);
      const cmd = module.default;

      if (!cmd || !cmd.data || typeof cmd.execute !== 'function') {
        console.warn(`[Commands] Skipping ${file}: invalid command shape`);
        continue;
      }

      const name = cmd.data.name;
      commands.set(name, cmd);
      console.log(`[Commands] Loaded: /${name}`);
    } catch (err) {
      console.error(`[Commands] Failed to load ${file}:`, err.message);
    }
  }

  return commands;
}

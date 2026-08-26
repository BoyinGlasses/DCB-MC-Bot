import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const DATA_DIR = './data';

/**
 * Ensure directory exists for a file path
 * @param {string} filePath
 */
function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read a JSON file, return default if missing or invalid
 * @param {string} filename - File name relative to data/ dir
 * @param {*} defaultValue - Returned if file is missing or invalid
 * @returns {*}
 */
export function readJson(filename, defaultValue = {}) {
  const path = join(DATA_DIR, filename);
  ensureDir(path);

  if (!existsSync(path)) {
    return defaultValue;
  }

  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Storage] Failed to parse ${filename}:`, err.message);
    return defaultValue;
  }
}

/**
 * Write data to a JSON file (pretty-printed)
 * @param {string} filename
 * @param {*} data
 */
export function writeJson(filename, data) {
  const path = join(DATA_DIR, filename);
  ensureDir(path);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Append an item to a JSON array file (auto-adds timestamp)
 * @param {string} filename
 * @param {Object} item
 */
export function appendToArray(filename, item) {
  const data = readJson(filename, []);
  data.push({ ...item, _ts: new Date().toISOString() });

  // Keep audit log bounded (last 1000 entries)
  if (data.length > 1000) {
    data.splice(0, data.length - 1000);
  }

  writeJson(filename, data);
}

/**
 * Append a line to a plain text log file
 * @param {string} filename
 * @param {string} line
 */
export function appendLog(filename, line) {
  const path = join(DATA_DIR, filename);
  ensureDir(path);
  const timestamp = new Date().toISOString();
  appendFileSync(path, `[${timestamp}] ${line}\n`, 'utf-8');
}

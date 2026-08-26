import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { appendLog } from '../storage/store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const VIEWS_DIR = join(__dirname, 'views');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * Read a view file
 * @param {string} name
 * @returns {string}
 */
export function readView(name) {
  const path = join(VIEWS_DIR, name);
  return readFileSync(path, 'utf-8');
}

/**
 * Serve a static file from /public
 * @param {http.ServerResponse} res
 * @param {string} relativePath
 */
function serveStatic(res, relativePath) {
  // Prevent path traversal
  const safePath = relativePath.replace(/\.\./g, '').replace(/^\/+/, '');
  const fullPath = join(PUBLIC_DIR, safePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(fullPath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = extname(fullPath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(readFileSync(fullPath));
}

/**
 * Render a view with template variables
 * Supports:
 *   {{key}}          - escaped value
 *   {{!key}}         - raw value (no escape)
 *   {{key?a:b}}      - conditional: 'a' if truthy, 'b' if falsy
 *
 * @param {string} name - View file name
 * @param {Object} vars - Variables to inject
 * @returns {string}
 */
export function render(name, vars = {}) {
  let html = readView(name);

  // Conditional: {{key?trueVal:falseVal}}
  html = html.replace(/\{\{([a-zA-Z_][\w]*)\?([^:}]*):([^}]*)\}\}/g, (_, key, t, f) => {
    return vars[key] ? t : f;
  });

  // Raw: {{!key}}
  html = html.replace(/\{\{!([a-zA-Z_][\w]*)\}\}/g, (_, key) => {
    return String(vars[key] ?? '');
  });

  // Escaped: {{key}}
  html = html.replace(/\{\{([a-zA-Z_][\w]*)\}\}/g, (_, key) => {
    return String(vars[key] ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  });

  return html;
}

/**
 * Send JSON response
 */
export function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Send HTML response
 */
export function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

/**
 * Read request body as text
 * @param {http.IncomingMessage} req
 * @returns {Promise<string>}
 */
export function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/**
 * Web server route registry
 * Each entry: { method, path, handler }
 * Handler signature: (req, res, ctx) => Promise<void>
 */
const routes = [];

/**
 * Register a route
 * @param {string} method
 * @param {string} path
 * @param {Function} handler - (req, res, ctx) => Promise<void>
 */
export function route(method, path, handler) {
  routes.push({ method: method.toUpperCase(), path, handler });
}

/**
 * Match a request to a route
 * Supports exact match and pattern with :param
 */
function matchRoute(method, pathname) {
  for (const r of routes) {
    if (r.method !== method) continue;

    // Exact match
    if (r.path === pathname) {
      return { handler: r.handler, params: {} };
    }

    // Pattern match with :param
    const routeParts = r.path.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    let match = true;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return { handler: r.handler, params };
  }
  return null;
}

/**
 * Start the web server
 * @param {Object} deps - { serverChecker, ztFlow }
 * @returns {http.Server}
 */
export function startWebServer(deps = {}) {
  const server = createServer(async (req, res) => {
    const start = Date.now();
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    const pathname = url.pathname;
    const method = req.method;

    try {
      // Static files
      if (pathname.startsWith('/static/')) {
        return serveStatic(res, pathname.replace('/static/', ''));
      }

      // Vendor files (Pico, HTMX)
      if (pathname.startsWith('/vendor/')) {
        return serveStatic(res, pathname.slice(1));
      }

      // Routes
      const matched = matchRoute(method, pathname);
      if (matched) {
        const ctx = {
          params: matched.params,
          url,
          req,
          deps,
        };
        await matched.handler(req, res, ctx);
        logRequest(method, pathname, res.statusCode, Date.now() - start);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      logRequest(method, pathname, 404, Date.now() - start);
    } catch (err) {
      console.error('[Web] Error:', err.message, err.stack);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('Internal Server Error');
      logRequest(method, pathname, 500, Date.now() - start, err.message);
    }
  });

  server.listen(config.web.port, config.web.host, () => {
    console.log(`[Web] Dashboard running at http://${config.web.host}:${config.web.port}`);
  });

  return server;
}

function logRequest(method, path, status, durationMs, error = null) {
  const line = `${method} ${path} ${status} ${durationMs}ms${error ? ` error="${error}"` : ''}`;
  appendLog('web-access.log', line);
}

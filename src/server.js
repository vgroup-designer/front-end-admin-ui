import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startAgentQuery } from './agent.js';
import { createAsyncQueue } from './asyncQueue.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

// Lets the app load inside the Shopify Admin iframe instead of being blocked
// by the browser's default framing protection.
const EMBED_CSP = 'frame-ancestors https://*.myshopify.com https://admin.shopify.com;';

const STATIC_FILES = {
  '/style.css': { file: 'style.css', type: 'text/css' },
  '/app.js': { file: 'app.js', type: 'text/javascript' },
};

// Single shared agent session for the life of the server, mirroring the CLI
// REPL: one conversation, fed by whichever browser tab sends a message.
const inputQueue = createAsyncQueue();
const history = [];
const sseClients = new Set();

function broadcast(message) {
  history.push(message);
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}

async function runAgentLoop() {
  for await (const message of startAgentQuery(inputQueue)) {
    broadcast(message);
  }
}
runAgentLoop().catch((err) => {
  console.error('[agent loop] terminated with error:', err);
  broadcast({ type: 'result', is_error: true, result: `Agent process crashed: ${err.message}` });
});

async function serveIndex(res) {
  const html = await readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const body = html.replace('%SHOPIFY_API_KEY%', config.SHOPIFY_CLIENT_ID);
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Security-Policy': EMBED_CSP,
  }).end(body);
}

async function serveStatic(res, pathname) {
  const entry = STATIC_FILES[pathname];
  if (!entry) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(path.join(PUBLIC_DIR, entry.file));
    res.writeHead(200, { 'Content-Type': entry.type }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

function handleEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`retry: 1000\n\n`);
  for (const message of history) {
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  }
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
}

async function handleChat(req, res) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400).end('Invalid JSON body');
    return;
  }

  const text = typeof parsed.message === 'string' ? parsed.message.trim() : '';
  if (!text) {
    res.writeHead(400).end('Missing "message" field');
    return;
  }

  const userMessage = {
    type: 'user',
    message: { role: 'user', content: text },
    parent_tool_use_id: null,
  };
  broadcast(userMessage);
  inputQueue.push(userMessage);
  res.writeHead(202).end();
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && pathname === '/api/events') {
    handleEvents(req, res);
  } else if (req.method === 'POST' && pathname === '/api/chat') {
    handleChat(req, res).catch((err) => {
      console.error('[api/chat] error:', err);
      res.writeHead(500).end('Internal error');
    });
  } else if (req.method === 'GET' && pathname === '/') {
    serveIndex(res).catch((err) => {
      console.error('[index] error:', err);
      res.writeHead(500).end('Internal error');
    });
  } else if (req.method === 'GET') {
    serveStatic(res, pathname);
  } else {
    res.writeHead(405).end('Method not allowed');
  }
});

server.listen(PORT, () => {
  console.log(`Shopify ops agent UI listening on http://localhost:${PORT}`);
});

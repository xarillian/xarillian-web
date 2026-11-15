// Screenshots the scene in headless Chrome and fails when a scene pixel is not a whole, square block of screen pixels.
// Run with `node checks/pixels.mjs`; set CHROME to use another browser binary.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const SCENE_PIXEL = 4;
// Real windows are a whole number of screen pixels, so each size here is too once scaled.
const SCREENS = [
  { width: 1280, height: 1000, scale: 1 },
  { width: 1281, height: 1001, scale: 1 },
  { width: 1284, height: 996, scale: 1.25 },
  { width: 1366, height: 768, scale: 1.5 },
  { width: 1100, height: 732, scale: 1.75 },
  { width: 400, height: 860, scale: 2 },
];
const SITE = path.resolve(import.meta.dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };

const site = await serveSite();
const browser = await openBrowser();
let failures = 0;
try {
  await browser.send('Page.enable');
  for (const screen of SCREENS) {
    const verdict = await inspect(screen);
    const ok = verdict.stray === 0 && verdict.colours > 8;
    if (!ok) failures++;
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${screen.width}x${screen.height} @${screen.scale}: ` +
        `${verdict.block}px blocks, ${verdict.stray} stray screen pixels, ${verdict.colours} colours`,
    );
  }
} finally {
  browser.close();
  site.close();
}
process.exitCode = failures ? 1 : 0;

async function inspect({ width, height, scale }) {
  await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  await browser.send('Page.navigate', { url: `http://127.0.0.1:${site.address().port}/` });
  await browser.evaluate(`new Promise((done) => {
    const wait = () => (document.querySelector('#scene').width > 1 && !document.querySelector('.controls').hidden ? setTimeout(done, 400) : setTimeout(wait, 50));
    wait();
  })`);
  await browser.evaluate(`document.querySelectorAll('main, .controls, .mini-card').forEach((el) => (el.style.visibility = 'hidden'))`);
  const { data } = await browser.send('Page.captureScreenshot', { format: 'png' });
  return browser.evaluate(`(${countStrayPixels})('data:image/png;base64,${data}', ${Math.max(1, Math.round(SCENE_PIXEL * scale))})`);
}

// Runs in the page, so the browser decodes its own screenshot.
async function countStrayPixels(screenshot, block) {
  const shot = new Image();
  shot.src = screenshot;
  await shot.decode();
  const canvas = new OffscreenCanvas(shot.naturalWidth, shot.naturalHeight);
  const context = canvas.getContext('2d');
  context.drawImage(shot, 0, 0);
  const pixels = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);

  let stray = 0;
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++)
      if (pixels[y * canvas.width + x] !== pixels[(y - (y % block)) * canvas.width + x - (x % block)]) stray++;
  return { block, stray, colours: new Set(pixels).size };
}

function serveSite() {
  const server = http.createServer((request, response) => {
    const file = path.join(SITE, new URL(request.url, 'http://site').pathname.replace(/\/$/, '/index.html'));
    if (!file.startsWith(SITE) || !fs.existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(fs.readFileSync(file));
  });
  return new Promise((ready) => server.listen(0, '127.0.0.1', () => ready(server)));
}

async function openBrowser() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pixels-'));
  const chrome = spawn(
    process.env.CHROME ?? 'google-chrome-stable',
    ['--headless=new', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--remote-debugging-port=0', 'about:blank'],
    { stdio: 'ignore' },
  );
  const page = await firstPage(path.join(profile, 'DevToolsActivePort'));
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((open) => (socket.onopen = open));

  const replies = new Map();
  let lastId = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    replies.get(message.id)?.(message);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      replies.set(++lastId, ({ result, error }) => (error ? reject(new Error(`${method}: ${error.message}`)) : resolve(result)));
      socket.send(JSON.stringify({ id: lastId, method, params }));
    });
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const close = () => {
    socket.close();
    chrome.kill();
    chrome.once('exit', () => fs.rmSync(profile, { recursive: true, force: true }));
  };
  return { send, evaluate, close };
}

async function firstPage(portFile) {
  for (let tries = 0; tries < 80; tries++) {
    await new Promise((tick) => setTimeout(tick, 125));
    if (!fs.existsSync(portFile)) continue;
    const [port] = fs.readFileSync(portFile, 'utf8').split('\n');
    const targets = await fetch(`http://127.0.0.1:${port}/json`).then(
      (reply) => reply.json(),
      () => [],
    );
    const page = targets.find((target) => target.type === 'page');
    if (page) return page;
  }
  throw new Error('Chrome did not open a page to inspect');
}

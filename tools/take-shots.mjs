// Take the four screenshots listed in shots.json with headless Chromium and
// write them into screenshots/. Usage:
//   node tools/take-shots.mjs [--port 8080]
// Serves game/ on the port, opens each ?shot= URL at 1280x720, waits for
// window.__shotReady, and saves a JPEG. Verifies each file is <= 256 KiB.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// playwright-core lives in an earlier entry's node_modules; reuse it rather
// than installing a second copy. The browser binary is the cached Chromium.
const require = createRequire('/home/hatch/workspace/makefun/oneprompt-game-assets/node_modules/playwright-core/package.json');
const { chromium } = require('playwright-core');
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;

const here = fileURLToPath(new URL('..', import.meta.url));
const repo = here;
const shots = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
const port = Number(process.argv.find((a, i, arr) => arr[i - 1] === '--port')) || 8080;

const server = spawn(process.execPath, [join(repo, 'serve.ts'), '--port', String(port)], {
  cwd: repo,
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve) => setTimeout(resolve, 1200));

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

mkdirSync(join(repo, 'screenshots'), { recursive: true });
for (const shot of shots) {
  const url = `http://127.0.0.1:${port}/${shot.query}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
  await page.waitForTimeout(150);
  const file = join(repo, 'screenshots', shot.name);
  await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
  const size = statSync(file).size;
  console.log(`${shot.name}: ${size} bytes${size > 262144 ? ' — TOO BIG' : ''}`);
}
await browser.close();
server.kill();
if (errors.length > 0) {
  console.log('PAGE ERRORS:');
  for (const e of errors) console.log(' ', e);
  process.exitCode = 1;
} else {
  console.log('No console/page errors.');
}

// Headless play-test: load the game in Chromium, click through title ->
// play cards -> end turn -> let the Witch answer, and force the win and
// loss paths via the window.__ember debug handle. Fails (exit 1) on any
// console/page error or on a state that does not change as expected.
// Usage: node tools/playtest.mjs [--port 8081]
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// playwright-core lives in an earlier entry's node_modules; reuse it rather
// than installing a second copy. The browser binary is the cached Chromium.
const require = createRequire('/home/hatch/workspace/makefun/oneprompt-game-assets/node_modules/playwright-core/package.json');
const { chromium } = require('playwright-core');
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;

const repo = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv.find((a, i, arr) => arr[i - 1] === '--port')) || 8081;

const server = spawn(process.execPath, [join(repo, 'serve.ts'), '--port', String(port)], {
  cwd: repo,
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve) => setTimeout(resolve, 1200));

const failures = [];
const errors = [];
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

await page.goto(`http://127.0.0.1:${port}/?seed=7`, { waitUntil: 'load' });
await page.waitForTimeout(600);

// 1. Title screen is up.
check('title screen renders', await page.evaluate(() => !!document.querySelector('#game')));

// 2. Click to start.
await page.mouse.click(640, 400);
await page.waitForTimeout(400);
let state = await page.evaluate(() => ({
  phase: window.__ember.game.phase,
  hand: window.__ember.game.player.hand.length,
  energy: window.__ember.game.player.energy,
}));
check('game starts on click', state.phase === 'player', JSON.stringify(state));
check('player dealt 5 cards', state.hand === 5, `hand=${state.hand}`);

// 3. Play the first affordable card by clicking its centre.
const cardPos = await page.evaluate(() => {
  const g = window.__ember.game;
  const i = g.player.hand.findIndex((c) => c.cost <= g.player.energy);
  if (i < 0) return null;
  // Player hand layout: centred on 640, spacing 158, y 486, card 150x208.
  const n = g.player.hand.length;
  const startX = 640 - (n * 158) / 2 + (158 - 150) / 2;
  return { x: startX + i * 158 + 75, y: 470 + 104, uid: g.player.hand[i].uid, name: g.player.hand[i].name };
});
if (!cardPos) {
  check('found an affordable card', false);
} else {
  await page.mouse.click(cardPos.x, cardPos.y);
  await page.waitForTimeout(700);
  state = await page.evaluate(() => ({
    hand: window.__ember.game.player.hand.length,
    played: window.__ember.game.cardsPlayed,
    last: window.__ember.game.lastPlayed?.card.name,
  }));
  check('card plays on click', state.played === 1 && state.last === cardPos.name, JSON.stringify(state));
}

// 4. End turn: click END TURN (1120..1260, 636..688).
await page.mouse.click(1190, 662);
await page.waitForTimeout(6000);
state = await page.evaluate(() => ({
  phase: window.__ember.game.phase,
  turn: window.__ember.game.turn,
  log: window.__ember.game.log.slice(-1)[0],
}));
check('enemy turn runs and player turn returns', state.phase === 'player' && state.turn === 2, JSON.stringify(state));

// 5. Play several turns: each turn play every affordable card (key 1 is
// always the first card in hand), then end the turn.
for (let t = 0; t < 3; t += 1) {
  for (let k = 0; k < 6; k += 1) {
    await page.keyboard.press('1');
    await page.waitForTimeout(450);
  }
  await page.keyboard.press('e');
  await page.waitForTimeout(6500);
}
state = await page.evaluate(() => ({
  phase: window.__ember.game.phase,
  turn: window.__ember.game.turn,
  pHp: window.__ember.game.player.hp,
  eHp: window.__ember.game.enemy.hp,
}));
check('three more turns complete', state.turn >= 4 && (state.phase === 'player' || state.phase === 'won' || state.phase === 'lost'), JSON.stringify(state));

// 6. Force the win path: restart if the duel already ended, set the Witch
// to 1 HP, put a strike in hand, and click it.
if (state.phase !== 'player') {
  await page.mouse.click(640, 400);
  await page.waitForTimeout(400);
}
const strikePos = await page.evaluate(() => {
  const g = window.__ember.game;
  window.__ember.setHp('enemy', 1);
  window.__ember.setHp('player', 30);
  g.player.energy = 10;
  let idx = g.player.hand.findIndex((c) => c.kind === 'strike' || c.kind === 'spark');
  if (idx < 0) {
    const fromDeck = g.player.deck.findIndex((c) => c.kind === 'strike');
    if (fromDeck >= 0) g.player.hand.push(g.player.deck.splice(fromDeck, 1)[0]);
    idx = g.player.hand.findIndex((c) => c.kind === 'strike' || c.kind === 'spark');
  }
  if (idx < 0) return null;
  const n = g.player.hand.length;
  const startX = 640 - (n * 158) / 2 + (158 - 150) / 2;
  return { x: startX + idx * 158 + 75, y: 470 + 104, name: g.player.hand[idx].name };
});
if (!strikePos) {
  check('found a strike to win with', false);
} else {
  await page.mouse.click(strikePos.x, strikePos.y);
  await page.waitForTimeout(1800);
  state = await page.evaluate(() => ({ phase: window.__ember.game.phase, score: window.__ember.game.score }));
}
check('win path reaches victory screen', state.phase === 'won', JSON.stringify(state));

// 7. Restart from the win screen, then force the loss path: put a strike
// in the Witch's hand so her turn finishes the player.
await page.mouse.click(640, 400);
await page.waitForTimeout(400);
await page.evaluate(() => {
  const g = window.__ember.game;
  window.__ember.setHp('player', 1);
  window.__ember.setHp('enemy', 30);
  g.player.energy = 0;
  const fromDeck = g.enemy.deck.findIndex((c) => c.kind === 'strike');
  if (fromDeck >= 0) g.enemy.hand.push(g.enemy.deck.splice(fromDeck, 1)[0]);
});
await page.mouse.click(1190, 662); // end turn; the Witch should finish the player
await page.waitForTimeout(8000);
state = await page.evaluate(() => ({ phase: window.__ember.game.phase }));
check('loss path reaches defeat screen', state.phase === 'lost', JSON.stringify(state));

// 8. Restart from the loss screen.
await page.mouse.click(640, 400);
await page.waitForTimeout(400);
state = await page.evaluate(() => ({ phase: window.__ember.game.phase, hp: window.__ember.game.player.hp }));
check('restart works after defeat', state.phase === 'player' && state.hp === 30, JSON.stringify(state));

await browser.close();
server.kill();

if (errors.length > 0) {
  console.log('PAGE ERRORS:');
  for (const e of errors) console.log(' ', e);
  failures.push('console/page errors');
}
console.log(failures.length === 0 ? 'PLAY-TEST: ALL PASS' : `PLAY-TEST: ${failures.length} FAILURES`);
process.exit(failures.length === 0 ? 0 : 1);

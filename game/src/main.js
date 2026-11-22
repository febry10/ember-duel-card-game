// Boot and the one loop: input is read every frame, the renderer paints what
// is there, and a small queue of timed actions paces the Witch's turn so each
// of her cards lands with its own animation instead of all at once.
//
// ?seed=N fixes the dealt hands. ?shot=start|play|win|lose (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_DAMAGE, EVENT_GUARD, EVENT_HEAL, EVENT_LOSE, EVENT_PLAYED,
  EVENT_RESONANCE, EVENT_WIN, canPlay, createGame, playCard, resetGame,
  startEnemyTurn, startPlayerTurn,
} from './state.js';
import { takeEnemyTurn } from './ai.js';
import { sfx, setMuted, unlockAudio } from './audio.js';
import {
  END_TURN_RECT, SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON,
  createRenderer, enemyHandRects, playerHandRects,
} from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

// A debug handle for the headless play-test: read the state, force a hand,
// or set a life total. It changes nothing the player sees.
window.__ember = {
  game,
  reset: () => resetGame(game),
  setHp: (who, hp) => { game[who].hp = hp; },
};

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen, scene.best, null, 1.2, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let hoverUid = null;
  let muted = false;
  // Timed actions: { at (performance.now ms), fn }. The Witch's turn is a
  // chain of these, one card every 0.9 s, then the player's turn begins.
  let queue = [];
  let aiBusy = false;

  function announce(message) {
    status.textContent = message;
  }

  function later(ms, fn) {
    queue.push({ at: performance.now() + ms, fn });
  }

  function startGame() {
    resetGame(game);
    queue = [];
    aiBusy = false;
    screen = SCREEN_PLAY;
    sfx.deal();
    announce('Playing. Your move, Ember Knight.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WON : SCREEN_LOST;
    if (game.score > best) {
      best = game.score;
      saveBest(best);
    }
    if (won) {
      sfx.win();
      renderer.burst(640, 300, '#f2c94c', 60);
      renderer.burst(400, 260, '#e8632c', 40);
      renderer.burst(880, 260, '#f2c94c', 40);
    } else {
      sfx.lose();
    }
    announce(won ? `Victory! Score ${game.score}. Best ${best}.` : `Defeat. Score ${game.score}. Best ${best}.`);
  }

  /** React to a played card: sound, floaters, shake, banner. */
  function onPlayed(card, events, by) {
    const value = game.lastPlayed ? game.lastPlayed.value : card.value;
    if (events & EVENT_RESONANCE) {
      renderer.showBanner('✦ RESONANCE +2 ✦');
      sfx.resonance();
    }
    if (events & EVENT_DAMAGE) {
      const target = by === 'player' ? { x: 220, y: 78 } : { x: 220, y: 668 };
      renderer.addFloater(target.x, target.y, `-${value}`, '#ff5a4e');
      renderer.addShake(7);
      sfx.hit();
    } else if (events & EVENT_GUARD) {
      sfx.guard();
    } else if (events & EVENT_HEAL) {
      const target = by === 'player' ? { x: 220, y: 668 } : { x: 220, y: 78 };
      renderer.addFloater(target.x, target.y, `+${value}`, '#4caf6d');
      sfx.heal();
    }
    if (events & EVENT_WIN) later(700, () => endGame(true));
    else if (events & EVENT_LOSE) later(700, () => endGame(false));
  }

  function playerPlayCard(card) {
    if (game.phase !== 'player' || !canPlay(game, game.player, card)) return;
    const rects = playerHandRects(game);
    const index = game.player.hand.findIndex((c) => c.uid === card.uid);
    const from = rects[index] || { x: 565, y: 470 };
    renderer.flyCard(card, from.x, from.y, 640 - 75, 240, 'player');
    sfx.play();
    later(240, () => {
      const events = playCard(game, game.player, card.uid);
      if (events & EVENT_PLAYED) onPlayed(card, events, 'player');
    });
  }

  function endPlayerTurn() {
    if (game.phase !== 'player' || aiBusy) return;
    aiBusy = true;
    sfx.turn();
    startEnemyTurn(game);
    announce('The Cinder Witch takes her turn.');
    // Capture the Witch's hand layout before her plays shrink it, so each
    // card flies from where it sat.
    const enemyRects = enemyHandRects(game);
    // The Witch plays one card every 0.9 s; the renderer animates each.
    const plays = [];
    takeEnemyTurn(game, (card, events) => plays.push({ card, events }));
    // NOTE: takeEnemyTurn applies the plays at once to the state; the timed
    // chain below replays their *presentation* in order, setting the centre
    // table card as each one lands. The state already holds the outcome.
    plays.forEach((play, i) => {
      later(500 + i * 900, () => {
        const from = enemyRects[Math.min(i, enemyRects.length - 1)] || { x: 588, y: 64 };
        const resonance = Boolean(play.events & EVENT_RESONANCE);
        game.lastPlayed = {
          card: play.card, by: 'enemy', resonance,
          value: play.card.value + (resonance ? 2 : 0),
        };
        renderer.flyCard(play.card, from.x, from.y, 640 - 75, 240, 'enemy');
        sfx.play();
        later(240, () => onPlayed(play.card, play.events, 'enemy'));
      });
    });
    later(500 + plays.length * 900 + 500, () => {
      if (game.phase === 'enemy') {
        startPlayerTurn(game);
        sfx.deal();
        announce(`Turn ${game.turn}. Your move.`);
      }
      aiBusy = false;
    });
  }

  function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  function handleClick(clientX, clientY) {
    unlockAudio();
    const p = renderer.toField(clientX, clientY);
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (pointInRect(p.x, p.y, END_TURN_RECT)) {
      endPlayerTurn();
      return;
    }
    // Player hand: the topmost card under the cursor wins (later cards are
    // drawn on top, so check in reverse order).
    const rects = playerHandRects(game);
    for (let i = rects.length - 1; i >= 0; i -= 1) {
      const card = game.player.hand[i];
      const r = rects[i];
      const hovered = card.uid === hoverUid;
      const lift = hovered ? 26 : 0;
      if (pointInRect(p.x, p.y, { x: r.x - 8, y: r.y - lift - 8, w: r.w + 16, h: r.h + 16 })) {
        if (canPlay(game, game.player, card)) playerPlayCard(card);
        else sfx.click();
        return;
      }
    }
  }

  function handleMove(clientX, clientY) {
    if (screen !== SCREEN_PLAY) {
      hoverUid = null;
      return;
    }
    const p = renderer.toField(clientX, clientY);
    const rects = playerHandRects(game);
    hoverUid = null;
    for (let i = rects.length - 1; i >= 0; i -= 1) {
      const r = rects[i];
      if (pointInRect(p.x, p.y, { x: r.x - 8, y: r.y - 34, w: r.w + 16, h: r.h + 42 })) {
        hoverUid = game.player.hand[i].uid;
        return;
      }
    }
  }

  canvas.addEventListener('click', (e) => handleClick(e.clientX, e.clientY));
  canvas.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t) handleClick(t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      muted = !muted;
      setMuted(muted);
      announce(muted ? 'Sound off.' : 'Sound on.');
      return;
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        unlockAudio();
        startGame();
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
      endPlayerTurn();
    } else if (e.key >= '1' && e.key <= '5') {
      const card = game.player.hand[Number(e.key) - 1];
      if (card) playerPlayCard(card);
    }
  });

  let last = performance.now();
  let time = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    time += dt;
    // Run due timed actions.
    const due = queue.filter((a) => a.at <= now);
    queue = queue.filter((a) => a.at > now);
    for (const action of due) action.fn();
    renderer.draw(game, screen, best, hoverUid, time, dt);
  }

  announce('Ember Duel. Click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

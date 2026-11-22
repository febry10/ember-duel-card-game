// Everything the eye sees: the felt table, the two hands, the cards, the
// health bars, the log, the title screen and the win/loss screens, plus the
// card slides, floating damage numbers, screen shake and ember particles.
// The game is drawn on one canvas in a fixed 1280x720 logical field.
import { FIELD, PALETTE, FONT } from './config.js';
import { ELEMENTS, KINDS } from './deck.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

const CARD_W = 150;
const CARD_H = 208;
const ENEMY_CARD_W = 104;
const ENEMY_CARD_H = 144;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Hand layout: cards fanned in a gentle arc, centred on cx. Returns the
 *  rect of each card (and its rotation) in hand order. */
export function layoutHand(count, cx, y, spacing, cardW = CARD_W) {
  const rects = [];
  const total = count * spacing;
  const startX = cx - total / 2 + (spacing - cardW) / 2;
  for (let i = 0; i < count; i += 1) {
    const mid = (count - 1) / 2;
    const off = i - mid;
    rects.push({
      x: startX + i * spacing,
      y: y + Math.abs(off) * 7,
      w: cardW,
      h: CARD_H,
      rot: off * 0.045,
    });
  }
  return rects;
}

export function playerHandRects(game) {
  return layoutHand(game.player.hand.length, FIELD.width / 2, 470, 158);
}

export function enemyHandRects(game) {
  const count = game.enemy.hand.length;
  const rects = [];
  const spacing = 112;
  const total = count * spacing;
  const startX = FIELD.width / 2 - total / 2 + (spacing - ENEMY_CARD_W) / 2;
  for (let i = 0; i < count; i += 1) {
    const mid = (count - 1) / 2;
    rects.push({ x: startX + i * spacing, y: 64 + Math.abs(i - mid) * 4, w: ENEMY_CARD_W, h: ENEMY_CARD_H, rot: 0 });
  }
  return rects;
}

export const END_TURN_RECT = { x: 1120, y: 636, w: 140, h: 52 };

/** Draw one element's glyph (flame, droplet, leaf, bolt) centred at (cx, cy)
 *  with size s, in the given colour. Shapes, never text, tell the elements
 *  apart. */
export function drawGlyph(ctx, glyph, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.7, -s * 0.3, s * 0.55, s * 0.35, s * 0.3, s * 0.62);
    ctx.bezierCurveTo(s * 0.55, s * 0.85, s * 0.15, s, 0, s * 0.78);
    ctx.bezierCurveTo(-s * 0.15, s, -s * 0.55, s * 0.85, -s * 0.3, s * 0.62);
    ctx.bezierCurveTo(-s * 0.55, s * 0.35, -s * 0.7, -s * 0.3, 0, -s);
    ctx.fill();
  } else if (glyph === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.75, -s * 0.1, s * 0.7, s * 0.55, 0, s * 0.8);
    ctx.bezierCurveTo(-s * 0.7, s * 0.55, -s * 0.75, -s * 0.1, 0, -s);
    ctx.fill();
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.4, s * 0.85, s * 0.6, 0, s * 0.85);
    ctx.bezierCurveTo(-s * 0.85, s * 0.6, -s * 0.9, -s * 0.4, 0, -s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(0, s * 0.75);
    ctx.stroke();
  } else {
    // bolt
    ctx.beginPath();
    ctx.moveTo(s * 0.15, -s);
    ctx.lineTo(-s * 0.45, s * 0.15);
    ctx.lineTo(-s * 0.02, s * 0.15);
    ctx.lineTo(-s * 0.15, s);
    ctx.lineTo(s * 0.45, -s * 0.15);
    ctx.lineTo(s * 0.02, -s * 0.15);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#2c1a2e';
  ctx.fill();
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, x + 7, y + 7, w - 14, h - 14, 7);
  ctx.strokeStyle = 'rgba(139,92,246,0.5)';
  ctx.stroke();
  drawGlyph(ctx, 'flame', x + w / 2, y + h / 2, Math.min(w, h) * 0.22, '#8b5cf6');
}

function drawCardFace(ctx, card, x, y, w, h, opts = {}) {
  const el = ELEMENTS[card.element];
  const scale = w / CARD_W;
  ctx.save();
  if (opts.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(opts.rot);
    ctx.translate(-w / 2, -h / 2);
    x = 0; y = 0;
  }
  // Body
  roundRect(ctx, x, y, w, h, 12 * scale);
  ctx.fillStyle = opts.dim ? '#3a3128' : '#f7f0dd';
  ctx.fill();
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = opts.glow ? PALETTE.gold : el.color;
  ctx.stroke();
  // Element band across the top
  ctx.save();
  roundRect(ctx, x, y, w, 44 * scale, 12 * scale);
  ctx.clip();
  ctx.fillStyle = el.color;
  ctx.fillRect(x, y, w, 44 * scale);
  ctx.restore();
  // Cost circle, top left
  ctx.beginPath();
  ctx.arc(x + 24 * scale, y + 22 * scale, 17 * scale, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = '#7a5a10';
  ctx.stroke();
  ctx.fillStyle = '#241a12';
  ctx.font = `bold ${Math.round(22 * scale)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 24 * scale, y + 23 * scale);
  // Element glyph, top right
  ctx.beginPath();
  ctx.arc(x + w - 24 * scale, y + 22 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  drawGlyph(ctx, el.glyph, x + w - 24 * scale, y + 22 * scale, 9 * scale, el.color);
  // Name
  ctx.fillStyle = opts.dim ? '#8a7f6a' : '#241a12';
  ctx.font = `bold ${Math.round(15 * scale)}px ${FONT}`;
  ctx.fillText(card.name, x + w / 2, y + 62 * scale);
  // Kind + big value in the middle
  const kind = KINDS[card.kind];
  ctx.fillStyle = el.dark;
  ctx.font = `bold ${Math.round(13 * scale)}px ${FONT}`;
  ctx.fillText(kind.name.toUpperCase(), x + w / 2, y + 86 * scale);
  drawGlyph(ctx, el.glyph, x + w / 2, y + 128 * scale, 26 * scale, el.color);
  ctx.fillStyle = opts.dim ? '#8a7f6a' : '#241a12';
  ctx.font = `bold ${Math.round(34 * scale)}px ${FONT}`;
  ctx.fillText(String(card.value), x + w / 2, y + 132 * scale);
  // Rule text
  ctx.fillStyle = '#4a3f30';
  ctx.font = `${Math.round(11.5 * scale)}px ${FONT}`;
  ctx.fillText(card.text, x + w / 2, y + 178 * scale);
  // Element name along the bottom
  ctx.fillStyle = el.dark;
  ctx.font = `bold ${Math.round(11 * scale)}px ${FONT}`;
  ctx.fillText(el.name.toUpperCase(), x + w / 2, y + h - 12 * scale);
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, frac, fill, back) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  if (frac > 0) {
    ctx.save();
    roundRect(ctx, x, y, w * Math.max(0, Math.min(1, frac)), h, h / 2);
    ctx.clip();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

function drawPortrait(ctx, x, y, r, kind) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = kind === 'enemy' ? '#3b2a5e' : '#5e2a12';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = kind === 'enemy' ? '#8b5cf6' : PALETTE.gold;
  ctx.stroke();
  ctx.clip();
  if (kind === 'enemy') {
    // Hooded witch: hood arc, face shadow, glowing eyes
    ctx.fillStyle = '#241640';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.15, r * 0.72, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#1a102e';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.05, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(x - r * 0.18, y, r * 0.09, 0, Math.PI * 2);
    ctx.arc(x + r * 0.18, y, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Knight: helm dome, plume, visor slit
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.1, r * 0.62, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e8632c';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.95);
    ctx.quadraticCurveTo(x + r * 0.35, y - r * 0.55, x + r * 0.1, y - r * 0.2);
    ctx.quadraticCurveTo(x, y - r * 0.45, x, y - r * 0.95);
    ctx.fill();
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x - r * 0.45, y + r * 0.05, r * 0.9, r * 0.16);
  }
  ctx.restore();
}

function drawEnergyPips(ctx, x, y, energy, maxEnergy, rightAlign) {
  const r = 9;
  const gap = 22;
  const total = maxEnergy * gap - 4;
  let sx = rightAlign ? x - total : x;
  for (let i = 0; i < maxEnergy; i += 1) {
    ctx.beginPath();
    ctx.arc(sx + r + i * gap, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i < energy ? PALETTE.energy : '#3a2c1c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = i < energy ? '#7a5a10' : '#54432a';
    ctx.stroke();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let shake = 0;
  let floaters = []; // {x,y,text,color,t,life}
  let flying = null; // {card,fromX,fromY,toX,toY,t,dur,by}
  let particles = []; // {x,y,vx,vy,r,color,t,life}
  let banner = null; // {text,t,life}

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function addShake(amount) { shake = Math.max(shake, amount); }
  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, t: 0, life: 1.1 });
  }
  function flyCard(card, fromX, fromY, toX, toY, by) {
    flying = { card, fromX, fromY, toX, toY, t: 0, dur: 0.45, by };
  }
  function showBanner(text) { banner = { text, t: 0, life: 1.4 }; }
  function burst(x, y, color, count = 40) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      particles.push({
        x, y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 60,
        r: 2 + Math.random() * 4, color, t: 0, life: 0.9 + Math.random() * 0.8,
      });
    }
  }
  function emberRain() {
    for (let i = 0; i < 3; i += 1) {
      particles.push({
        x: Math.random() * FIELD.width, y: FIELD.height + 10,
        vx: (Math.random() - 0.5) * 20, vy: -(30 + Math.random() * 70),
        r: 2 + Math.random() * 3.5, color: Math.random() < 0.5 ? '#f2c94c' : '#e8632c',
        t: 0, life: 2.5 + Math.random() * 2,
      });
    }
  }

  function drawTable(time) {
    // Felt with a vignette and a gold-rimmed oval inlay.
    const g = ctx.createRadialGradient(640, 360, 120, 640, 360, 780);
    g.addColorStop(0, '#24503a');
    g.addColorStop(1, '#122619');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = 'rgba(242,201,76,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(640, 330, 520, 175, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242,201,76,0.12)';
    ctx.beginPath();
    ctx.ellipse(640, 330, 480, 150, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Drifting embers on the table.
    ctx.fillStyle = 'rgba(242,201,76,0.25)';
    for (let i = 0; i < 12; i += 1) {
      const x = ((i * 173 + time * 12) % 1300) - 10;
      const y = 60 + ((i * 97) % 600) + Math.sin(time * 0.7 + i) * 6;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSidePanel(game, side, isEnemy, x, y) {
    drawPortrait(ctx, x + 30, y + 30, 28, isEnemy ? 'enemy' : 'player');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(side.title.toUpperCase(), x + 68, y + 16);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(isEnemy ? 'The Cinder Witch' : 'You · Ember Knight', x + 68, y + 38);
    drawBar(ctx, x + 68, y + 50, 170, 14, side.hp / side.maxHp, PALETTE.hp, PALETTE.hpBack);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${side.hp}/${side.maxHp}`, x + 68 + 170 - 6, y + 57);
    ctx.textAlign = 'left';
    if (side.shield > 0) {
      ctx.fillStyle = PALETTE.shield;
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`🛡 ${side.shield} shield`, x + 68, y + 76);
    }
  }

  function drawLog(game) {
    ctx.save();
    roundRect(ctx, 16, 196, 268, 150, 10);
    ctx.fillStyle = 'rgba(20,14,8,0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(242,201,76,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('DUEL LOG', 30, 214);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `12.5px ${FONT}`;
    const lines = game.log.slice(-4);
    lines.forEach((line, i) => {
      ctx.globalAlpha = 0.55 + 0.45 * (i / Math.max(1, lines.length - 1));
      ctx.fillText(line.length > 42 ? line.slice(0, 41) + '…' : line, 30, 238 + i * 26);
    });
    ctx.restore();
  }

  function drawCenter(game, time) {
    // Turn + score strip at the top centre.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`TURN ${game.turn}`, 640, 22);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`SCORE ${game.score}`, 640, 44);
    // Last played card, centre table.
    if (game.lastPlayed && !flying) {
      const card = game.lastPlayed.card;
      const by = game.lastPlayed.by;
      drawCardFace(ctx, card, 640 - CARD_W / 2, 240, CARD_W, CARD_H, { glow: game.lastPlayed.resonance });
      ctx.fillStyle = by === 'player' ? PALETTE.player : '#a78bfa';
      ctx.font = `bold 13px ${FONT}`;
      ctx.fillText(by === 'player' ? 'YOU PLAYED' : 'WITCH PLAYED', 640, 226);
      if (game.lastPlayed.resonance) {
        ctx.fillStyle = PALETTE.gold;
        ctx.font = `bold 16px ${FONT}`;
        ctx.fillText('✦ RESONANCE +2 ✦', 640, 462);
      }
    } else if (!game.lastPlayed) {
      ctx.fillStyle = 'rgba(245,239,226,0.35)';
      ctx.font = `italic 15px ${FONT}`;
      ctx.fillText('Play a card to begin the duel', 640, 320);
    }
    // Flying card on top.
    if (flying) {
      const p = Math.min(1, flying.t / flying.dur);
      const ease = 1 - (1 - p) * (1 - p);
      const x = flying.fromX + (flying.toX - flying.fromX) * ease;
      const y = flying.fromY + (flying.toY - flying.fromY) * ease - Math.sin(p * Math.PI) * 60;
      drawCardFace(ctx, flying.card, x, y, CARD_W, CARD_H, { rot: (1 - p) * 0.2 });
    }
  }

  function drawPlayerHand(game, hoverUid, time) {
    const rects = playerHandRects(game);
    game.player.hand.forEach((card, i) => {
      const r = rects[i];
      const hovered = card.uid === hoverUid;
      const affordable = card.cost <= game.player.energy;
      const lift = hovered ? 26 : 0;
      drawCardFace(ctx, card, r.x, r.y - lift, r.w, r.h, {
        rot: r.rot,
        dim: game.phase !== 'player' || !affordable,
        glow: hovered,
      });
      if (!affordable && game.phase === 'player') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        roundRect(ctx, r.x, r.y - lift, r.w, r.h, 12);
        ctx.fill();
      }
    });
  }

  function drawEnemyHand(game) {
    const rects = enemyHandRects(game);
    rects.forEach((r) => drawCardBack(ctx, r.x, r.y, r.w, r.h));
  }

  function drawTitle(game, best, time) {
    drawTable(time);
    // Fanned decorative cards behind the title.
    const fan = [
      { id: 'x1', element: 'ember', kind: 'strike', cost: 2, value: 5, name: 'Cinder Slash', text: 'Deal 5 damage.' },
      { id: 'x2', element: 'tide', kind: 'guard', cost: 1, value: 4, name: 'Still Water', text: 'Gain 4 shield.' },
      { id: 'x3', element: 'storm', kind: 'strike', cost: 3, value: 7, name: 'Thunderclap', text: 'Deal 7 damage.' },
      { id: 'x4', element: 'thorn', kind: 'mend', cost: 1, value: 3, name: 'Bloom', text: 'Restore 3 life.' },
      { id: 'x5', element: 'ember', kind: 'spark', cost: 3, value: 4, name: 'Firebrand', text: 'Deal 4 damage. Draw 1.' },
    ];
    fan.forEach((card, i) => {
      const off = i - 2;
      drawCardFace(ctx, card, 640 - CARD_W / 2 + off * 120, 430 + Math.abs(off) * 14, CARD_W, CARD_H, { rot: off * 0.09 });
    });
    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.shadowColor = '#e8632c';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#f2c94c';
    ctx.font = `bold 92px ${FONT}`;
    ctx.fillText('EMBER DUEL', 640, 150);
    ctx.restore();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 24px ${FONT}`;
    ctx.fillText('A turn-based card battler against the Cinder Witch', 640, 215);
    // How to play
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText('Spend energy to play cards · Match elements in one turn for Resonance +2', 640, 330);
    ctx.fillText('Strike, Guard, Mend and Spark — reduce the Witch to 0 life to win', 640, 356);
    // Start prompt, pulsing
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText('— CLICK TO BEGIN —', 640, 420);
    ctx.globalAlpha = 1;
    if (best > 0) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText(`Best score: ${best}`, 640, 668);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText('Keys: 1–5 play a card · E ends your turn · M mutes sound', 640, 692);
  }

  function drawEnd(game, best, won, time) {
    // Dim the table, then a centred panel.
    ctx.fillStyle = 'rgba(10,6,4,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.save();
    roundRect(ctx, 340, 130, 600, 460, 18);
    ctx.fillStyle = '#241a12';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = won ? PALETTE.gold : '#7a3a3a';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (won) {
      ctx.save();
      ctx.shadowColor = '#f2c94c';
      ctx.shadowBlur = 30;
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 72px ${FONT}`;
      ctx.fillText('VICTORY!', 640, 210);
      ctx.restore();
      ctx.fillStyle = PALETTE.text;
      ctx.font = `italic 20px ${FONT}`;
      ctx.fillText('The Cinder Witch falls. The embers are yours.', 640, 268);
    } else {
      ctx.fillStyle = '#ff5a4e';
      ctx.font = `bold 72px ${FONT}`;
      ctx.fillText('DEFEAT', 640, 210);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `italic 20px ${FONT}`;
      ctx.fillText('The Witch keeps her embers… this time.', 640, 268);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    const rows = [
      ['Damage dealt', String(game.damageDealt)],
      ['Cards played', String(game.cardsPlayed)],
      ['Resonance chains', String(game.resonanceCount)],
      ['Turns', String(game.turn)],
      ['Win bonus', won ? '500' : '0'],
    ];
    rows.forEach(([label, value], i) => {
      const y = 318 + i * 30;
      ctx.textAlign = 'left';
      ctx.fillText(label, 420, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(value, 860, y);
      ctx.fillStyle = PALETTE.muted;
    });
    ctx.strokeStyle = 'rgba(242,201,76,0.4)';
    ctx.beginPath();
    ctx.moveTo(420, 478);
    ctx.lineTo(860, 478);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText('FINAL SCORE', 420, 510);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(String(game.score), 860, 510);
    if (game.score >= best && game.score > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText('★ NEW BEST ★', 640, 540);
    }
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('— CLICK TO PLAY AGAIN —', 640, 566);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawFloaters(dt) {
    floaters = floaters.filter((f) => (f.t += dt) < f.life);
    for (const f of floaters) {
      const p = f.t / f.life;
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = f.color;
      ctx.font = `bold 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x, f.y - p * 46);
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(dt) {
    particles = particles.filter((p) => (p.t += dt) < p.life);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw(game, screen, best, hoverUid, time, dt) {
    // Fit the 1280x720 field into the canvas, letterboxed.
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d0906';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    if (shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shake *= Math.pow(0.02, dt);
    }

    if (screen === SCREEN_TITLE) {
      drawTitle(game, best, time);
    } else if (screen === SCREEN_WON || screen === SCREEN_LOST) {
      drawTable(time);
      drawSidePanel(game, game.enemy, true, 16, 8);
      drawSidePanel(game, game.player, false, 16, 596);
      drawCenter(game, time);
      drawEnd(game, best, screen === SCREEN_WON, time);
    } else {
      drawTable(time);
      // Enemy side
      drawSidePanel(game, game.enemy, true, 16, 8);
      drawEnemyHand(game);
      drawEnergyPips(ctx, 1050, 40, game.enemy.energy, game.enemy.maxEnergy, false);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `13px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('WITCH ENERGY', 1050, 18);
      ctx.fillText(`Deck: ${game.enemy.deck.length}`, 1050, 66);
      // Centre
      drawLog(game);
      drawCenter(game, time);
      // Player side
      drawSidePanel(game, game.player, false, 16, 596);
      // Your energy lives on the table's right edge, clear of the hand.
      drawEnergyPips(ctx, 1050, 320, game.player.energy, game.player.maxEnergy, false);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `13px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('YOUR ENERGY', 1050, 296);
      ctx.fillText(`Deck ${game.player.deck.length} · Discard ${game.player.discard.length}`, 1050, 346);
      // End Turn button
      const r = END_TURN_RECT;
      const enabled = game.phase === 'player';
      roundRect(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fillStyle = enabled ? '#e8632c' : '#4a3624';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = enabled ? PALETTE.gold : '#54432a';
      ctx.stroke();
      ctx.fillStyle = enabled ? '#fff' : '#8a7f6a';
      ctx.font = `bold 17px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('END TURN ⏎', r.x + r.w / 2, r.y + r.h / 2 + 1);
      // Turn hint
      ctx.fillStyle = game.phase === 'player' ? PALETTE.gold : PALETTE.muted;
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(
        game.phase === 'player' ? 'YOUR TURN — play a card or end turn' : 'THE WITCH IS THINKING…',
        640, 700,
      );
      drawPlayerHand(game, hoverUid, time);
    }

    // Transient layers on every screen.
    drawParticles(dt);
    drawFloaters(dt);
    if (banner) {
      banner.t += dt;
      if (banner.t > banner.life) banner = null;
      else {
        const p = banner.t / banner.life;
        ctx.globalAlpha = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.6) / 0.4);
        ctx.fillStyle = PALETTE.gold;
        ctx.font = `bold 30px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(banner.text, 640, 150);
        ctx.globalAlpha = 1;
      }
    }
    if (flying) {
      flying.t += dt;
      if (flying.t >= flying.dur) flying = null;
    }
    if (screen === SCREEN_WON) emberRain();
  }

  return {
    draw, addShake, addFloater, flyCard, showBanner, burst,
    // Convert a client (CSS pixel) point into logical field coordinates.
    toField(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
      const ox = (canvas.width - FIELD.width * scale) / 2;
      const oy = (canvas.height - FIELD.height * scale) / 2;
      const dpr = canvas.width / rect.width;
      return {
        x: ((clientX - rect.left) * dpr - ox) / scale,
        y: ((clientY - rect.top) * dpr - oy) / scale,
      };
    },
  };
}

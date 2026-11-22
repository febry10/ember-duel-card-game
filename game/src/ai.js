// The Cinder Witch's mind: readable, counterable, never random for its own
// sake. It weighs every card it can afford, picks the best-scoring play, and
// stops when nothing is worth playing — so the player can learn its habits:
// it guards when hurt, mends when low, and goes for the kill when it smells
// one. It returns the list of card uids it will play, in order, and the
// caller plays them one at a time so each lands with its own animation.
import { canPlay, playCard } from './state.js';

function scorePlay(game, side, card, resonance) {
  const other = side === game.player ? game.enemy : game.player;
  const value = card.value + (resonance ? 2 : 0);
  let score = 0;
  if (card.kind === 'strike' || card.kind === 'spark') {
    // Lethal is worth everything.
    if (value >= other.hp + other.shield) score += 1000;
    score += value * 3;
    if (card.kind === 'spark') score += 4; // the extra card is worth a little
    // Don't overkill a nearly-dead foe with the big card when a small one wins.
    if (other.hp <= 3 && value > other.hp + 4) score -= 6;
  } else if (card.kind === 'guard') {
    // Shield matters most when the player can hit hard next turn.
    const threat = side === game.enemy ? 8 : 8;
    score += Math.min(value, threat) * 2;
    if (side.hp <= 10) score += 6;
  } else if (card.kind === 'mend') {
    const missing = side.maxHp - side.hp;
    if (missing <= 0) score -= 50; // never heal at full life
    else score += Math.min(value, missing) * 2.5;
    if (side.hp <= 8) score += 10;
  }
  // Resonance pairs are worth setting up: a cheap card of an element the
  // hand holds twice is a better opener than its face value says.
  if (!resonance) {
    const pair = side.hand.some((c) => c !== card && c.element === card.element && c.cost + card.cost <= side.energy);
    if (pair) score += 3;
  } else {
    score += 5;
  }
  // Prefer cheap cards when energy is tight; expensive cards must earn it.
  score -= card.cost * 0.5;
  return score;
}

/** Choose the Witch's next card, or null when it passes. Pure choice: the
 *  caller applies it with playCard. */
export function chooseCard(game) {
  const side = game.enemy;
  let best = null;
  let bestScore = 2; // below this, the Witch holds its cards and passes
  for (const card of side.hand) {
    if (!canPlay(game, side, card)) continue;
    const resonance = side.playedThisTurn.some((c) => c.element === card.element);
    const score = scorePlay(game, side, card, resonance);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/** Play the Witch's whole turn, one card at a time, calling onPlayed after
 *  each card so the renderer can animate it. Returns the event mask of the
 *  last play (or EVENT_NONE when it passed on everything). */
export function takeEnemyTurn(game, onPlayed) {
  let events = 0;
  let guard = 0;
  for (;;) {
    const card = chooseCard(game);
    if (!card) break;
    events = playCard(game, game.enemy, card.uid);
    if (onPlayed) onPlayed(card, events);
    if (game.phase === 'won' || game.phase === 'lost') break;
    guard += 1;
    if (guard > 12) break; // a hand can never hold more than this
  }
  return events;
}

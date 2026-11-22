// The rules engine: one duel between the player and the Cinder Witch.
// Pure state, no drawing and no sound here, so the screenshot stager and the
// play-test can drive it directly. Animations live in render.js; the engine
// only reports what happened as events.
import {
  DRAW_PER_TURN, HAND_SIZE, MAX_ENERGY, MAX_SHIELD, RESONANCE_BONUS,
  START_ENERGY, START_HP,
} from './config.js';
import { buildDeck, shuffle } from './deck.js';

export const EVENT_NONE = 0;
export const EVENT_PLAYED = 1;
export const EVENT_DAMAGE = 2;
export const EVENT_HEAL = 4;
export const EVENT_GUARD = 8;
export const EVENT_RESONANCE = 16;
export const EVENT_WIN = 32;
export const EVENT_LOSE = 64;
export const EVENT_TURN = 128;

export function createSide(name, title) {
  return {
    name, title,
    hp: START_HP, maxHp: START_HP, shield: 0,
    energy: START_ENERGY, maxEnergy: START_ENERGY,
    deck: [], hand: [], discard: [],
    playedThisTurn: [],
  };
}

export function createGame(random) {
  const game = {
    random,
    turn: 1,
    phase: 'player', // 'player' | 'enemy' | 'won' | 'lost'
    player: createSide('You', 'Ember Knight'),
    enemy: createSide('Cinder Witch', 'Cinder Witch'),
    log: [],
    score: 0,
    damageDealt: 0,
    cardsPlayed: 0,
    resonanceCount: 0,
    lastPlayed: null, // { card, by, resonance, value } for the centre table
    floaters: [], // { x, y, text, color, t } — filled by the renderer via events
    winner: null,
  };
  resetGame(game);
  return game;
}

export function resetGame(game) {
  for (const side of [game.player, game.enemy]) {
    side.hp = START_HP;
    side.shield = 0;
    side.energy = START_ENERGY;
    side.maxEnergy = START_ENERGY;
    side.deck = shuffle(buildDeck(), game.random);
    side.hand = [];
    side.discard = [];
    side.playedThisTurn = [];
    for (let i = 0; i < HAND_SIZE; i += 1) drawCard(game, side);
  }
  game.turn = 1;
  game.phase = 'player';
  game.log = ['The duel begins. Your move, Ember Knight.'];
  game.score = 0;
  game.damageDealt = 0;
  game.cardsPlayed = 0;
  game.resonanceCount = 0;
  game.lastPlayed = null;
  game.floaters = [];
  game.winner = null;
}

export function drawCard(game, side) {
  if (side.deck.length === 0) {
    // Reshuffle the discard pile; a duel that outlasts both decks keeps going.
    side.deck = shuffle(side.discard, game.random);
    side.discard = [];
    if (side.deck.length === 0) return null;
  }
  const card = side.deck.pop();
  side.hand.push(card);
  return card;
}

function log(game, message) {
  game.log.push(message);
  if (game.log.length > 5) game.log.shift();
}

/** Damage first eats shield, then life. Returns the life damage dealt. */
export function applyDamage(game, target, amount) {
  let remaining = amount;
  if (target.shield > 0) {
    const blocked = Math.min(target.shield, remaining);
    target.shield -= blocked;
    remaining -= blocked;
  }
  target.hp = Math.max(0, target.hp - remaining);
  return remaining;
}

/** The resonance bonus: a card gains +2 when its element was already played
 *  by the same side this turn. */
export function resonanceValue(game, side, card) {
  const same = side.playedThisTurn.filter((c) => c.element === card.element).length;
  return same > 0 ? RESONANCE_BONUS : 0;
}

/** Play a card from a side's hand. Returns an event mask, or EVENT_NONE when
 *  the play is illegal (not that side's turn, card not in hand, not enough
 *  energy). */
export function playCard(game, side, cardUid) {
  if (game.phase !== 'player' && side === game.player) return EVENT_NONE;
  if (game.phase !== 'enemy' && side === game.enemy) return EVENT_NONE;
  const index = side.hand.findIndex((c) => c.uid === cardUid);
  if (index < 0) return EVENT_NONE;
  const card = side.hand[index];
  if (card.cost > side.energy) return EVENT_NONE;

  side.energy -= card.cost;
  side.hand.splice(index, 1);
  side.discard.push(card);
  side.playedThisTurn.push(card);

  const bonus = resonanceValue(game, side, card);
  const value = card.value + bonus;
  const other = side === game.player ? game.enemy : game.player;
  let events = EVENT_PLAYED;
  if (bonus > 0) {
    events |= EVENT_RESONANCE;
    game.resonanceCount += 1;
    log(game, `${side.name} sparks Resonance (+${bonus}) on ${card.name}!`);
  }

  game.lastPlayed = { card, by: side === game.player ? 'player' : 'enemy', resonance: bonus > 0, value };
  game.cardsPlayed += 1;
  game.score += 5;

  if (card.kind === 'strike' || card.kind === 'spark') {
    const dealt = applyDamage(game, other, value);
    game.damageDealt += side === game.player ? dealt : 0;
    game.score += side === game.player ? dealt * 10 : 0;
    events |= EVENT_DAMAGE;
    log(game, `${side.name} plays ${card.name} — ${dealt} damage${bonus > 0 ? ` (resonance +${bonus})` : ''}.`);
    if (card.kind === 'spark') {
      drawCard(game, side);
      log(game, `${side.name} draws a card.`);
    }
  } else if (card.kind === 'guard') {
    side.shield = Math.min(MAX_SHIELD, side.shield + value);
    events |= EVENT_GUARD;
    log(game, `${side.name} plays ${card.name} — +${value} shield.`);
  } else if (card.kind === 'mend') {
    side.hp = Math.min(side.maxHp, side.hp + value);
    events |= EVENT_HEAL;
    log(game, `${side.name} plays ${card.name} — restores ${value} life.`);
  }

  if (other.hp <= 0) {
    game.phase = side === game.player ? 'won' : 'lost';
    game.winner = side.name;
    events |= side === game.player ? EVENT_WIN : EVENT_LOSE;
    if (side === game.player) game.score += 500;
    log(game, side === game.player ? 'The Cinder Witch falls! Victory!' : 'The Ember Knight falls. Defeat.');
  }
  return events;
}

export function canPlay(game, side, card) {
  return game.phase === (side === game.player ? 'player' : 'enemy') && card.cost <= side.energy;
}

/** End the player's turn: the enemy takes its turn (driven by ai.js through
 *  takeEnemyTurn), then a new player turn begins. */
export function startPlayerTurn(game) {
  game.turn += 1;
  const player = game.player;
  player.maxEnergy = Math.min(MAX_ENERGY, START_ENERGY + game.turn - 1);
  player.energy = player.maxEnergy;
  player.playedThisTurn = [];
  for (let i = 0; i < DRAW_PER_TURN; i += 1) drawCard(game, player);
  game.phase = 'player';
  log(game, `Turn ${game.turn} — your move. ${player.energy} energy.`);
  return EVENT_TURN;
}

export function startEnemyTurn(game) {
  const enemy = game.enemy;
  enemy.maxEnergy = Math.min(MAX_ENERGY, START_ENERGY + game.turn - 1);
  enemy.energy = enemy.maxEnergy;
  enemy.playedThisTurn = [];
  for (let i = 0; i < DRAW_PER_TURN; i += 1) drawCard(game, enemy);
  game.phase = 'enemy';
  log(game, `The Cinder Witch stirs…`);
  return EVENT_TURN;
}

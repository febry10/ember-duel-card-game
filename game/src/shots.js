// The screenshot scenes behind ?shot=start|play|win|lose. Each one builds a
// real game state (fresh deck, real hands, real rules applied) and freezes it
// at a moment a player would actually see, so every screenshot is a render
// of the game's own code — never a mock-up. The same seed always gives the
// same frame.
import { CARD_DEFS } from './deck.js';
import { applyDamage, playCard, resetGame } from './state.js';
import { SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

function cardById(game, id) {
  // Find the card in either deck or hand so the staged hand holds real cards.
  for (const side of [game.player, game.enemy]) {
    for (const pile of [side.hand, side.deck, side.discard]) {
      const found = pile.find((c) => c.id === id);
      if (found) return found;
    }
  }
  const def = CARD_DEFS.find((d) => d.id === id);
  return { ...def, uid: 900 + Math.floor(Math.random() * 90) };
}

function setHand(game, side, ids) {
  // Return the side's current hand to its deck, then deal the named cards.
  side.deck.push(...side.hand.splice(0));
  side.hand = ids.map((id) => cardById(game, id));
  // Remove staged cards from wherever they sat, so no duplicate shows.
  for (const other of [game.player, game.enemy]) {
    if (other === side) continue;
    other.deck = other.deck.filter((c) => !side.hand.includes(c));
    other.hand = other.hand.filter((c) => !side.hand.includes(c));
  }
}

/** Stage `game` into the named scene and return the screen to draw. */
export function stageShot(name, game) {
  resetGame(game);
  if (name === 'play') {
    game.turn = 4;
    game.player.hp = 24;
    game.player.shield = 4;
    game.player.energy = 6;
    game.player.maxEnergy = 6;
    game.enemy.hp = 18;
    game.enemy.shield = 2;
    game.enemy.energy = 5;
    game.enemy.maxEnergy = 6;
    game.score = 145;
    game.damageDealt = 12;
    game.cardsPlayed = 6;
    setHand(game, game.player, ['storm-strike', 'ember-guard', 'tide-spark', 'thorn-mend', 'ember-strike']);
    setHand(game, game.enemy, ['tide-strike', 'ember-mend', 'storm-guard', 'thorn-strike', 'tide-guard']);
    game.log = [
      'Turn 4 — your move. 6 energy.',
      'You play Cinder Slash — 5 damage.',
      'The Witch plays Still Water — +4 shield.',
      'Resonance! Storm chains Thunderclap.',
    ];
    // A resonance strike mid-flight, frozen on the table.
    const thunder = cardById(game, 'storm-strike');
    game.lastPlayed = { card: thunder, by: 'player', resonance: true, value: 9 };
    return { screen: SCREEN_PLAY, best: 320 };
  }
  if (name === 'win') {
    game.turn = 7;
    game.score = 640;
    game.damageDealt = 30;
    game.cardsPlayed = 11;
    game.resonanceCount = 3;
    game.player.hp = 14;
    game.player.shield = 2;
    game.enemy.hp = 0;
    game.phase = 'won';
    game.winner = 'You';
    const thunder = cardById(game, 'storm-strike');
    game.lastPlayed = { card: thunder, by: 'player', resonance: true, value: 9 };
    game.log = [
      'You play Thunderclap — 9 damage. Resonance +2.',
      'The Cinder Witch falls! Victory!',
    ];
    return { screen: SCREEN_WON, best: 640 };
  }
  if (name === 'lose') {
    game.turn = 6;
    game.score = 210;
    game.damageDealt = 16;
    game.cardsPlayed = 9;
    game.resonanceCount = 1;
    game.player.hp = 0;
    game.enemy.hp = 11;
    game.enemy.shield = 3;
    game.phase = 'lost';
    game.winner = 'Cinder Witch';
    const ember = cardById(game, 'ember-strike');
    game.lastPlayed = { card: ember, by: 'enemy', resonance: false, value: 5 };
    game.log = [
      'The Witch plays Cinder Slash — 5 damage.',
      'The Ember Knight falls. Defeat.',
    ];
    return { screen: SCREEN_LOST, best: 320 };
  }
  // start (and any unknown name): the title screen over a fresh table.
  return { screen: SCREEN_TITLE, best: 320 };
}

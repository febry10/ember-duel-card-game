// The cards of Ember Duel. Four elements, each told apart by colour AND by
// a drawn shape (flame, droplet, leaf, bolt) so a card reads at thumbnail
// size without its text. Four card kinds: Strike deals damage, Guard gives
// shield, Mend restores life, Spark deals damage and draws a card.

export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e8632c', dark: '#8f2f10', glyph: 'flame' },
  tide: { name: 'Tide', color: '#3fa7e8', dark: '#14507e', glyph: 'drop' },
  thorn: { name: 'Thorn', color: '#4caf6d', dark: '#1d5c34', glyph: 'leaf' },
  storm: { name: 'Storm', color: '#f2c94c', dark: '#8a6d10', glyph: 'bolt' },
};

export const KINDS = {
  strike: { name: 'Strike', verb: 'Deal' },
  guard: { name: 'Guard', verb: 'Gain' },
  mend: { name: 'Mend', verb: 'Restore' },
  spark: { name: 'Spark', verb: 'Deal + draw' },
};

// id, element, kind, cost, value. A deck holds one of each plus the extras
// below, 24 cards in all.
export const CARD_DEFS = [
  { id: 'ember-strike', element: 'ember', kind: 'strike', cost: 2, value: 5, name: 'Cinder Slash', text: 'Deal 5 damage.' },
  { id: 'ember-guard', element: 'ember', kind: 'guard', cost: 2, value: 5, name: 'Ashen Wall', text: 'Gain 5 shield.' },
  { id: 'ember-mend', element: 'ember', kind: 'mend', cost: 2, value: 4, name: 'Hearth Glow', text: 'Restore 4 life.' },
  { id: 'ember-spark', element: 'ember', kind: 'spark', cost: 3, value: 4, name: 'Firebrand', text: 'Deal 4 damage. Draw 1.' },
  { id: 'tide-strike', element: 'tide', kind: 'strike', cost: 1, value: 3, name: 'Riptide Cut', text: 'Deal 3 damage.' },
  { id: 'tide-guard', element: 'tide', kind: 'guard', cost: 1, value: 4, name: 'Still Water', text: 'Gain 4 shield.' },
  { id: 'tide-mend', element: 'tide', kind: 'mend', cost: 3, value: 7, name: 'Deep Spring', text: 'Restore 7 life.' },
  { id: 'tide-spark', element: 'tide', kind: 'spark', cost: 2, value: 3, name: 'Undertow', text: 'Deal 3 damage. Draw 1.' },
  { id: 'thorn-strike', element: 'thorn', kind: 'strike', cost: 2, value: 4, name: 'Briar Lash', text: 'Deal 4 damage.' },
  { id: 'thorn-guard', element: 'thorn', kind: 'guard', cost: 2, value: 6, name: 'Root Bastion', text: 'Gain 6 shield.' },
  { id: 'thorn-mend', element: 'thorn', kind: 'mend', cost: 1, value: 3, name: 'Bloom', text: 'Restore 3 life.' },
  { id: 'thorn-spark', element: 'thorn', kind: 'spark', cost: 3, value: 5, name: 'Seed Burst', text: 'Deal 5 damage. Draw 1.' },
  { id: 'storm-strike', element: 'storm', kind: 'strike', cost: 3, value: 7, name: 'Thunderclap', text: 'Deal 7 damage.' },
  { id: 'storm-guard', element: 'storm', kind: 'guard', cost: 3, value: 7, name: 'Storm Aegis', text: 'Gain 7 shield.' },
  { id: 'storm-mend', element: 'storm', kind: 'mend', cost: 2, value: 5, name: 'Calm Eye', text: 'Restore 5 life.' },
  { id: 'storm-spark', element: 'storm', kind: 'spark', cost: 2, value: 4, name: 'Chain Lightning', text: 'Deal 4 damage. Draw 1.' },
];

// Extra copies that round the 16 unique cards out to a 24-card deck.
const EXTRA_IDS = [
  'ember-strike', 'tide-strike', 'thorn-guard', 'storm-strike',
  'ember-guard', 'tide-spark', 'thorn-strike', 'storm-mend',
];

export function buildDeck() {
  const defs = [...CARD_DEFS];
  for (const id of EXTRA_IDS) {
    const def = CARD_DEFS.find((d) => d.id === id);
    defs.push(def);
  }
  // Fresh card objects, each with its own uid, so a hand can hold two copies.
  return defs.map((def, index) => ({ ...def, uid: index }));
}

/** Fisher-Yates shuffle driven by the game's seeded random. */
export function shuffle(deck, random) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

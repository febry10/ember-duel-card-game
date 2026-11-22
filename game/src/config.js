// Every tuning number and colour in one place. The table is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const START_HP = 30;
export const HAND_SIZE = 5;
export const DRAW_PER_TURN = 2;
export const START_ENERGY = 3;
export const MAX_ENERGY = 10;
export const MAX_SHIELD = 12;

/** A card played as the second (or later) card of its element in one turn
 *  gains this bonus to its number. */
export const RESONANCE_BONUS = 2;

export const PALETTE = {
  felt: '#1d3a2a',
  feltDark: '#142b1e',
  tableEdge: '#3a2417',
  gold: '#f2c94c',
  goldDark: '#b98a1d',
  text: '#f5efe2',
  muted: '#b8a98f',
  panel: '#241a12',
  panelEdge: '#4a3624',
  player: '#e8632c',
  enemy: '#8b5cf6',
  hp: '#e5534b',
  hpBack: '#3a1512',
  shield: '#4fc3f7',
  energy: '#f2c94c',
  danger: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'ember-duel.best';

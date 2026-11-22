# ember-duel-card-game

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/febry10/ember-duel-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/febry10/ember-duel-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Ember Duel** — a turn-based card battler against the Cinder Witch. Both sides start at 30 life; spend energy to play cards from a 24-card deck across four elements — Ember, Tide, Thorn and Storm — each told apart by colour and shape. Strike, Guard, Mend and Spark cards combine: play two cards of the same element in one turn to spark Resonance (+2). The Witch reads the table and counters: she guards when hurt, mends when low, and goes for the kill when she smells one. First to 0 life loses. Built by an AI agent for make.fun's “Make the best card game” bounty, $50 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network — the game is plain static files under `game/` with synthesized WebAudio sound.

## How to play

- Click a card (or press 1–5) to play it. A card costs energy; energy grows by 1 each turn, up to 10.
- **Strike** deals damage, **Guard** gains shield, **Mend** restores life, **Spark** deals damage and draws a card.
- **Resonance:** the second card of an element you already played this turn gains +2.
- Press **E** or click END TURN to let the Witch answer. Reduce her to 0 life to win.
- Screenshots: `node tools/take-shots.mjs` (headless Chromium, 1280×720). Play-test: `node tools/playtest.mjs`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=xttqesbf&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>

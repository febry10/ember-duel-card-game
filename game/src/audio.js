// Synthesized sound only — no audio files, no network. Every effect is a
// short WebAudio oscillator (or filtered noise) envelope. The context is
// created on the first user gesture; in screenshot mode it is never created.
let ctx = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  try {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(value) {
  muted = value;
}

function tone(freq, duration, type, volume, when = 0, slideTo = null) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(duration, volume, filterFreq, when = 0) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + when;
  const length = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  source.connect(filter).connect(gain).connect(c.destination);
  source.start(t0);
}

export const sfx = {
  click() { tone(660, 0.06, 'sine', 0.12); },
  deal() { noise(0.12, 0.10, 2400); },
  play() { noise(0.18, 0.14, 1200); tone(392, 0.12, 'triangle', 0.10, 0, 523); },
  hit() { tone(140, 0.22, 'sawtooth', 0.20, 0, 60); noise(0.15, 0.16, 500); },
  guard() { tone(330, 0.14, 'triangle', 0.12, 0, 440); tone(440, 0.14, 'triangle', 0.08, 0.06, 554); },
  heal() { tone(523, 0.12, 'sine', 0.10); tone(659, 0.12, 'sine', 0.10, 0.08); tone(784, 0.2, 'sine', 0.10, 0.16); },
  resonance() { tone(880, 0.1, 'triangle', 0.12); tone(1174, 0.16, 'triangle', 0.12, 0.07); },
  turn() { tone(494, 0.1, 'sine', 0.08); },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11));
    tone(1318, 0.5, 'triangle', 0.12, 0.48);
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.08, i * 0.14));
  },
};

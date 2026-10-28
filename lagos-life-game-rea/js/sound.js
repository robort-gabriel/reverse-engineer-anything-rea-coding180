// Procedural sound: UI effects, background grooves, travel ambience and Simlish.
// Everything is synthesised with Web Audio; there are no audio files.
const PREF_KEY = 'eko-life:sound';
let prefs = { sfx: true, music: true };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch {}

let ac = null, master, sfxBus, musicBus, verb;
let unlocked = false;
const N = (s) => 261.63 * 2 ** (s / 12); // semitones from middle C

function audio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.7;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp).connect(ac.destination);
    // Small room reverb from a decaying noise impulse
    const len = Math.floor(ac.sampleRate * 1.4), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2; }
    const conv = ac.createConvolver(); conv.buffer = ir;
    verb = ac.createGain(); verb.gain.value = 0.25; verb.connect(conv).connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = prefs.sfx ? 0.9 : 0; sfxBus.connect(master); sfxBus.connect(verb);
    musicBus = ac.createGain(); musicBus.gain.value = prefs.music ? 0.22 : 0; musicBus.connect(master);
    const mv = ac.createGain(); mv.gain.value = 0.3; musicBus.connect(mv).connect(verb);
  }
  if (ac.state === 'suspended' && unlocked && !document.hidden) ac.resume().catch(() => {});
  return ac;
}

// ── Voices ──
function blip(f, { dur = 0.1, vol = 0.2, drop = 0.8, delay = 0, type = 'sine', dest = sfxBus } = {}) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f * drop, t + dur);
  g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.03);
}
// Two-operator FM: bright bells and electric-piano plucks
function bell(f, { dur = 0.5, vol = 0.14, ratio = 3.5, index = 2, delay = 0, dest = sfxBus, at } = {}) {
  const a = audio(); if (!a) return;
  const t = at ?? a.currentTime + delay;
  const car = a.createOscillator(), mod = a.createOscillator(), mg = a.createGain(), g = a.createGain();
  car.frequency.value = f; mod.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.04, t + dur * 0.6);
  mod.connect(mg).connect(car.frequency);
  g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  car.connect(g).connect(dest); car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
}
let whiteBuf = null, brownBuf = null;
function buffers(a) {
  if (whiteBuf && whiteBuf.sampleRate === a.sampleRate) return;
  const n = a.sampleRate * 2; whiteBuf = a.createBuffer(1, n, a.sampleRate); brownBuf = a.createBuffer(1, n, a.sampleRate);
  const w = whiteBuf.getChannelData(0), b = brownBuf.getChannelData(0); let last = 0;
  for (let i = 0; i < n; i++) { w[i] = Math.random() * 2 - 1; b[i] = last = (last + 0.02 * w[i]) / 1.02; }
}
function hiss(dur, { from = 1000, to = 3000, vol = 0.04, delay = 0, type = 'bandpass', dest = sfxBus, at } = {}) {
  const a = audio(); if (!a) return; buffers(a);
  const t = at ?? a.currentTime + delay, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = whiteBuf; f.type = type; f.Q.value = 1.1;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  src.connect(f).connect(g).connect(dest); src.start(t, Math.random() * 1.5, dur + 0.05);
}

// ── Simlish: formant-filtered syllables ──
const VOWELS = [[800, 1150], [400, 2000], [300, 2300], [450, 800], [325, 700]];
function simlish(n = 4, pitch = 210) {
  const a = audio(); if (!a) return;
  let t = a.currentTime; const ask = Math.random() < 0.4;
  for (let i = 0; i < n; i++) {
    const d = 0.08 + Math.random() * 0.07, f0 = pitch * (0.9 + Math.random() * 0.3), bend = ask && i === n - 1 ? 1.3 : 0.94 + Math.random() * 0.15;
    const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * bend, t + d);
    const env = a.createGain(); env.gain.setValueAtTime(1e-4, t); env.gain.exponentialRampToValueAtTime(0.14, t + 0.012); env.gain.exponentialRampToValueAtTime(1e-4, t + d);
    const [f1, f2] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    for (const [ff, q, lvl] of [[f1, 6, 1], [f2, 9, 0.55]]) {
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q;
      const lg = a.createGain(); lg.gain.value = lvl; o.connect(bp).connect(lg).connect(env);
    }
    env.connect(sfxBus); o.start(t); o.stop(t + d + 0.02);
    t += d + 0.03 + Math.random() * 0.03;
  }
}

// ── Effects ──
const RECIPES = {
  tap: () => blip(N(19), { vol: 0.12, dur: 0.06 }),
  open: () => { blip(N(12), { vol: 0.12, dur: 0.08 }); blip(N(19), { vol: 0.11, dur: 0.1, delay: 0.055 }); hiss(0.16, { vol: 0.018, from: 1500, to: 4500 }); },
  close: () => { blip(N(19), { vol: 0.1, dur: 0.07 }); blip(N(12), { vol: 0.1, dur: 0.09, delay: 0.05 }); },
  send: () => { blip(N(16), { vol: 0.12, dur: 0.08, drop: 1.6 }); hiss(0.12, { vol: 0.02, from: 1200, to: 6000 }); },
  message: () => { bell(N(24), { ratio: 1, index: 0.4, vol: 0.1, dur: 0.6 }); bell(N(31), { ratio: 1, index: 0.4, vol: 0.09, dur: 0.8, delay: 0.12 }); },
  notice: () => { bell(N(19), { vol: 0.11, dur: 0.6, index: 1.3 }); bell(N(24), { vol: 0.1, dur: 0.85, index: 1.3, delay: 0.12 }); },
  cash: () => { bell(N(24), { vol: 0.12, dur: 0.45 }); bell(N(31), { vol: 0.11, dur: 0.75, delay: 0.08 }); hiss(0.25, { vol: 0.022, from: 4000, to: 9000, delay: 0.04 }); },
  buy: () => [0, 4, 7, 12].forEach((s, i) => bell(N(12 + s), { ratio: 1, index: 1.1, vol: 0.13, dur: 0.4 + i * 0.08, delay: i * 0.07 })),
  levelup: () => { [0, 4, 7, 12, 16].forEach((s, i) => bell(N(12 + s), { vol: 0.12, dur: 0.65, delay: i * 0.07 })); hiss(0.55, { vol: 0.025, from: 2000, to: 9000, delay: 0.1 }); },
  promo: () => {
    [-5, 0, 4, 7, 12].forEach((s, i) => bell(N(12 + s), { ratio: 1, index: 1.4, vol: 0.13, dur: 0.5, delay: i * 0.09 }));
    [12, 16, 19, 24].forEach((s, i) => bell(N(12 + s), { vol: 0.08, dur: 0.9, delay: 0.55 + i * 0.06 }));
    hiss(0.9, { vol: 0.03, from: 1500, to: 9000, delay: 0.45 });
  },
  sparkle: () => { [24, 28, 31, 36].forEach((s, i) => bell(N(12 + s), { vol: 0.07, dur: 0.5, delay: i * 0.05 })); hiss(0.4, { vol: 0.02, from: 3000, to: 10000 }); },
  error: () => blip(N(-2), { vol: 0.15, dur: 0.13, drop: 0.75 }),
  warn: () => { blip(N(9), { vol: 0.13, dur: 0.15, drop: 0.95 }); blip(N(4), { vol: 0.13, dur: 0.22, drop: 0.9, delay: 0.16 }); },
  step: () => blip(N(21), { vol: 0.05, dur: 0.03, drop: 0.95 }),
  door: () => { blip(N(-10), { vol: 0.16, dur: 0.16, drop: 0.6 }); hiss(0.2, { vol: 0.02, from: 800, to: 300 }); },
  horn: () => { const a = audio(); if (!a) return; for (const [d, len] of [[0, 0.15], [0.2, 0.28]]) for (const f of [370, 466]) { const t = a.currentTime + d, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(); o.type = 'square'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 1600; g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.015); g.gain.setValueAtTime(0.05, t + len - 0.04); g.gain.exponentialRampToValueAtTime(1e-4, t + len); o.connect(lp).connect(g).connect(sfxBus); o.start(t); o.stop(t + len + 0.02); } },
  simlish: () => simlish(4 + Math.floor(Math.random() * 3), 180 + Math.random() * 90),
};
export function sfx(name) { if (!prefs.sfx || document.hidden) return; RECIPES[name]?.(); }

// ── Music: a step sequencer with one groove per mood ──
const kick = (t) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(1e-3, t + 0.24); o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.26); };
const shaker = (t, v) => hiss(0.05, { at: t, vol: v, from: 6000, to: 8000, type: 'highpass', dest: musicBus });
const clap = (t) => hiss(0.12, { at: t, vol: 0.12, from: 1400, to: 1200, dest: musicBus });
const bass = (t, s, len) => { const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(); o.type = 'triangle'; o.frequency.value = N(s - 12); lp.type = 'lowpass'; lp.frequency.value = 650; g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(0.45, t + 0.01); g.gain.exponentialRampToValueAtTime(1e-4, t + len); o.connect(lp).connect(g).connect(musicBus); o.start(t); o.stop(t + len + 0.05); };
const logdrum = (t, s) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(N(s - 12) * 1.6, t); o.frequency.exponentialRampToValueAtTime(N(s - 12), t + 0.07); g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.3); o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.33); };
const keys = (t, notes, dur, vol = 0.045) => notes.forEach((s) => bell(N(s), { at: t, ratio: 14, index: 0.45, vol, dur, dest: musicBus }));
const pluck = (t, s, vol = 0.05) => bell(N(s), { at: t, ratio: 1, index: 2.4, vol, dur: 0.26, dest: musicBus });
const pad = (t, notes, dur) => {
  const lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1200;
  g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(0.02, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(1e-4, t + dur * 1.1);
  lp.connect(g).connect(musicBus);
  for (const s of notes) for (const [type, det] of [['sine', 0], ['triangle', 7]]) { const o = ac.createOscillator(); o.type = type; o.frequency.value = N(s - 12); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur * 1.15); }
};

// Chords in semitones from middle C. Day: Am–F–C–G; party: Dm–Bb–F–C; night: Fmaj7–Em7–Dm7–Cmaj7
const DAY = { bpm: 100, chords: [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]], roots: [-15, -19, -12, -17] };
const GROOVES = {
  day: { ...DAY, play(t, i, bar, st) {
    const ch = DAY.chords[bar % 4], r = DAY.roots[bar % 4];
    if (i === 0 || i === 7 || i === 10) kick(t);
    shaker(t, i % 4 === 2 ? 0.08 : i % 2 ? 0.025 : 0.045);
    if (i === 0) bass(t, r, st * 5); if (i === 6) bass(t, r + 7, st * 3); if (i === 10) bass(t, r + 12, st * 3); if (i === 14) bass(t, r + 10, st * 2);
    if (i === 2 || i === 10) keys(t, ch.map((s) => s + 12), st * 2);
    const mel = [null, 2, null, 0, 1, null, 2, null, 1, null, 0, 2, null, 1, null, 0][i];
    if (mel != null && bar % 2) pluck(t, ch[mel] + 12);
  } },
  party: { bpm: 112, chords: [[2, 5, 9], [-2, 2, 5], [5, 9, 12], [0, 4, 7]], roots: [-10, -14, -7, -12], play(t, i, bar, st) {
    const g = GROOVES.party, ch = g.chords[bar % 4], r = g.roots[bar % 4];
    if (i % 4 === 0) kick(t);
    if (i === 4 || i === 12) clap(t);
    shaker(t, i % 2 ? 0.03 : 0.06);
    const ld = [{ 3: 0, 6: 0, 10: 7, 13: 12 }, { 3: 0, 7: 5, 11: 0, 14: 10 }][bar % 2][i];
    if (ld !== undefined) logdrum(t, r + ld);
    if (i === 0) keys(t, ch, st * 6, 0.04);
    if (i === 10) keys(t, ch.map((s) => s + 12), st * 3, 0.03);
  } },
  highlife: { bpm: 124, chords: [[0, 4, 7], [-7, -3, 0], [-5, -1, 2], [0, 4, 7]], roots: [-12, -19, -17, -12], play(t, i, bar, st) {
    const g = GROOVES.highlife, ch = g.chords[bar % 4], r = g.roots[bar % 4];
    if (i === 0 || i === 8) kick(t);
    shaker(t, i % 4 === 2 ? 0.09 : 0.03);
    const gtr = [2, null, 1, 0, null, 2, 1, null, 0, null, 2, 1, null, 0, 2, null][i];
    if (gtr != null) pluck(t, ch[gtr] + 12, 0.04);
    if (i === 0) bass(t, r, st * 4); if (i === 6) bass(t, r + 7, st * 2); if (i === 10) bass(t, r + 4, st * 2); if (i === 12) bass(t, r + 7, st * 3);
    if (i === 4 || i === 12) keys(t, ch, st * 2, 0.03);
  } },
  night: { bpm: 70, chords: [[-7, -3, 0, 4], [-8, -5, -1, 2], [-10, -7, -3, 0], [-12, -8, -5, -1]], roots: [-19, -20, -22, -24], play(t, i, bar, st) {
    const g = GROOVES.night, ch = g.chords[bar % 4], r = g.roots[bar % 4];
    if (i === 0) { pad(t, ch, st * 16); bass(t, r, st * 7); keys(t, ch, st * 8, 0.03); }
    if (i === 8) bass(t, r + 7, st * 5);
    if (bar % 2 && (i === 4 || i === 6 || i === 12)) bell(N(ch[(i / 2) % ch.length] + 12), { at: t, vol: 0.02, dur: 0.9, index: 0.8, dest: musicBus });
    if (i % 2 === 0) shaker(t, i % 4 === 0 ? 0.03 : 0.015);
  } },
};
let groove = 'day', timer = null, nextT = 0, step = 0, cur = null;
function schedule() {
  if (!ac || document.hidden) return;
  const g = GROOVES[groove];
  if (g !== cur) { cur = g; step = 0; nextT = Math.max(nextT, ac.currentTime + 0.05); }
  const st = 60 / g.bpm / 4;
  while (nextT < ac.currentTime + 0.25) { g.play(nextT, step % 16, Math.floor(step / 16), st); nextT += st; step++; }
}
function runMusic() {
  const on = prefs.music && unlocked && !document.hidden;
  if (on && !timer && audio()) { nextT = ac.currentTime + 0.1; cur = null; timer = setInterval(schedule, 50); }
  else if (!on && timer) { clearInterval(timer); timer = null; }
}
export function setGroove(name) { if (GROOVES[name]) groove = name; }

// ── Travel ambience: engine and road noise while moving ──
let amb = null;
export function ambience(kind) {
  if (amb) { const old = amb; amb = null; clearInterval(old.timer); old.gain.gain.setTargetAtTime(1e-4, ac.currentTime, 0.25); setTimeout(() => old.srcs.forEach((s) => { try { s.stop(); } catch {} }), 1200); }
  if (!kind || !prefs.sfx || !unlocked) return;
  const a = audio(); if (!a) return; buffers(a);
  const gain = a.createGain(); gain.gain.setValueAtTime(1e-4, a.currentTime); gain.gain.setTargetAtTime(0.6, a.currentTime, 0.5); gain.connect(sfxBus);
  const srcs = [];
  const rumble = (freq, vol) => { const s = a.createBufferSource(); s.buffer = brownBuf; s.loop = true; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; const g = a.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(gain); s.start(0, Math.random() * 1.9); srcs.push(s); };
  const engine = (hz, vol, wob) => { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; const lfo = a.createOscillator(); lfo.frequency.value = 0.8; const lg = a.createGain(); lg.gain.value = wob; lfo.connect(lg).connect(o.frequency); const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = a.createGain(); g.gain.value = vol; o.connect(f).connect(g).connect(gain); o.start(); lfo.start(); srcs.push(o, lfo); };
  if (kind === 'danfo' || kind === 'ride') rumble(kind === 'ride' ? 220 : 300, 0.55);
  if (kind === 'okada') { engine(95, 0.06, 7); rumble(260, 0.3); }
  if (kind === 'keke') { engine(70, 0.05, 3); rumble(240, 0.3); }
  let n = 0;
  const timer = setInterval(() => {
    if (document.hidden) return; n++;
    if (kind === 'trek' && n % 2 === 0) sfx('step');
    if (kind !== 'trek' && Math.random() < 0.05) sfx('horn');
  }, 280);
  amb = { gain, srcs, timer };
}

// ── Settings and lifecycle ──
export const soundPrefs = () => ({ ...prefs });
export function setSoundPref(k, v) {
  prefs[k] = v; try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {}
  if (ac) { sfxBus.gain.setTargetAtTime(prefs.sfx ? 0.9 : 0, ac.currentTime, 0.05); musicBus.gain.setTargetAtTime(prefs.music ? 0.22 : 0, ac.currentTime, 0.2); }
  if (k === 'sfx' && !v) ambience(null);
  runMusic();
}
// Browsers only allow audio after a user gesture
function unlock() {
  if (unlocked) return; unlocked = true;
  const a = audio(); a?.resume().catch(() => {}); runMusic();
}
addEventListener('pointerdown', unlock, { capture: true });
addEventListener('keydown', unlock, { capture: true });
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) ac.suspend().catch(() => {}); else if (unlocked) ac.resume().catch(() => {});
  runMusic();
});

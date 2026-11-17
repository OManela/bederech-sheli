// Speech (he-IL), breathing tones and screen wake lock.
import { store } from './store.js';

const synth = window.speechSynthesis;
let heVoice = null;
let voicesReady = false;
let voiceCount = 0;
let skipVoice = false; // set when the chosen voice object fails, so we fall back to lang only
const alive = new Set(); // keeps utterances referenced (WebKit can garbage-collect them mid-speech)

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  if (!voices.length) return;
  voicesReady = true;
  voiceCount = voices.length;
  const he = voices.filter(v => /^(he|iw)/i.test(v.lang));
  heVoice =
    he.find(v => /carmit/i.test(v.name) && v.localService !== false) ||
    he.find(v => /carmit/i.test(v.name)) ||
    he.find(v => v.localService !== false) ||
    he[0] || null;
}
if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

/**
 * Resolves once voices have loaded (or after a short timeout).
 * `unknown` means the browser didn't list its voices (some iOS home-screen apps); speech may still work.
 */
export function voiceStatus() {
  const result = () => ({
    supported: !!synth,
    hebrew: !!heVoice,
    unknown: !!synth && !voicesReady,
    name: heVoice?.name,
    count: voiceCount,
  });
  return new Promise(resolve => {
    if (!synth || voicesReady) return resolve(result());
    let tries = 0;
    const t = setInterval(() => {
      pickVoice();
      if (voicesReady || ++tries > 20) { clearInterval(t); resolve(result()); }
    }, 100);
  });
}

// iOS 17+: play through the silent switch.
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* ignore */ }

/**
 * Speaks one utterance. Must be called synchronously inside a tap the first time (iOS).
 * Resolves 'ok' when it finished, or 'failed' when speech never started.
 */
function speakRaw(text, useVoice) {
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    if (useVoice && heVoice) u.voice = heVoice;
    u.rate = store.get().settings.rate || 0.9;
    u.pitch = 1;
    u.volume = 1;
    alive.add(u);
    let started = false, done = false;
    const finish = r => {
      if (done) return;
      done = true;
      clearTimeout(startGuard); clearTimeout(endGuard);
      alive.delete(u);
      resolve(r);
    };
    u.onstart = () => { started = true; };
    u.onend = () => finish(started ? 'ok' : 'failed');
    u.onerror = e => finish(started || e.error === 'interrupted' || e.error === 'canceled' ? 'ok' : 'failed');
    // If speech hasn't started within a few seconds, treat it as failed.
    const startGuard = setTimeout(() => { if (!started) { try { synth.cancel(); } catch { /* ignore */ } finish('failed'); } }, 4000);
    // Safety net if onend never fires (known WebKit quirk).
    const endGuard = setTimeout(() => finish(started ? 'ok' : 'failed'), 4000 + text.length * 160);
    try { synth.resume(); } catch { /* ignore */ } // iOS can get stuck in a paused state
    synth.speak(u);
  });
}

async function speakOne(text) {
  if (!synth || !text) return 'failed';
  const withVoice = !!heVoice && !skipVoice;
  const r = await speakRaw(text, withVoice);
  if (r === 'failed' && withVoice) {
    // Some listed voices can't actually be used by the browser; retry with the default Hebrew voice.
    skipVoice = true;
    return speakRaw(text, false);
  }
  return r;
}

/**
 * Plays [text, pauseMs] segments. Returns a controller with stop().
 * onSegment(i, text) lets the UI show captions. onFail() fires if the voice never starts.
 */
export function playScript(segments, { loop = null, onSegment, onEnd, onFail } = {}) {
  let stopped = false;
  let timer = null;
  let first = true;
  const wait = ms => new Promise(r => { timer = setTimeout(r, ms); });

  async function run(list, offset) {
    for (let i = 0; i < list.length; i++) {
      if (stopped) return false;
      const [text, pause] = list[i];
      onSegment && onSegment(offset + i, text);
      const r = await speakOne(text);
      if (stopped) return false;
      if (first) {
        first = false;
        if (r === 'failed') { stopped = true; onFail && onFail(); return false; }
      }
      await wait(pause || 0);
    }
    return true;
  }

  (async () => {
    unlockAudio();
    if (!(await run(segments, 0))) return;
    while (loop && !stopped) if (!(await run(loop, segments.length))) return;
    if (!stopped) onEnd && onEnd();
  })();

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      if (synth) synth.cancel();
    },
  };
}

/** Plays a sample from a tap. Resolves 'ok' | 'failed'. onStart fires when the voice actually begins. */
export function speakTest(text) {
  if (!synth) return Promise.resolve('failed');
  // WebKit drops a speak() that comes right after cancel(), so only cancel when needed, and wait a moment after.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    return new Promise(r => setTimeout(r, 250)).then(() => speakOne(text));
  }
  const p = speakOne(text);
  unlockAudio(); // after speak(), so the speech request is the first thing in the tap
  return p;
}

// ---------- tones (Web Audio) ----------
let ctx = null;
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* ignore */ }
}

/** A soft gliding tone: up for inhale, down for exhale. */
export function breathTone(kind, seconds) {
  if (!ctx) unlockAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  const [f0, f1] = kind === 'in' ? [196, 294] : [294, 196];
  osc.frequency.setValueAtTime(f0, now);
  osc.frequency.linearRampToValueAtTime(f1, now + seconds);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.4);
  gain.gain.setValueAtTime(0.12, now + Math.max(0.5, seconds - 0.6));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.05);
}

export function chime() {
  if (!ctx) unlockAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 659].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + i * 0.18);
    g.gain.exponentialRampToValueAtTime(0.15, now + i * 0.18 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 1.2);
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.18);
    o.stop(now + i * 0.18 + 1.3);
  });
}

// ---------- wake lock ----------
let lock = null;
let wantLock = false;
async function acquire() {
  try {
    if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
  } catch { lock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (wantLock && document.visibilityState === 'visible') acquire();
});
export async function keepAwake(on) {
  wantLock = on;
  if (on) await acquire();
  else if (lock) { try { await lock.release(); } catch { /* ignore */ } lock = null; }
}
export const wakeLockSupported = () => 'wakeLock' in navigator;

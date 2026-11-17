// Speech (he-IL), breathing tones and screen wake lock.
import { store } from './store.js';

const synth = window.speechSynthesis;
let heVoice = null;
let voicesReady = false;

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  if (!voices.length) return;
  voicesReady = true;
  heVoice =
    voices.find(v => /^he/i.test(v.lang) && /carmit/i.test(v.name)) ||
    voices.find(v => /^he|^iw/i.test(v.lang)) ||
    null;
}
if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

/** Resolves once voices have loaded (or after a short timeout). */
export function voiceStatus() {
  return new Promise(resolve => {
    if (!synth) return resolve({ supported: false, hebrew: false });
    if (voicesReady) return resolve({ supported: true, hebrew: !!heVoice, name: heVoice?.name });
    let tries = 0;
    const t = setInterval(() => {
      pickVoice();
      if (voicesReady || ++tries > 15) {
        clearInterval(t);
        resolve({ supported: true, hebrew: !!heVoice, name: heVoice?.name });
      }
    }, 100);
  });
}

// iOS 17+: play through the silent switch.
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* ignore */ }

function speakOne(text) {
  return new Promise(resolve => {
    if (!synth || !text) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    if (heVoice) u.voice = heVoice;
    u.rate = store.get().settings.rate || 0.9;
    u.pitch = 1;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    u.onend = finish;
    u.onerror = finish;
    // Safety net if onend never fires (known WebKit quirk).
    setTimeout(finish, 1500 + text.length * 140);
    synth.speak(u);
  });
}

/**
 * Plays [text, pauseMs] segments. Returns a controller with stop().
 * onSegment(i, text) lets the UI show captions.
 */
export function playScript(segments, { loop = null, onSegment, onEnd } = {}) {
  let stopped = false;
  let timer = null;
  const wait = ms => new Promise(r => { timer = setTimeout(r, ms); });

  async function run(list, offset) {
    for (let i = 0; i < list.length; i++) {
      if (stopped) return;
      const [text, pause] = list[i];
      onSegment && onSegment(offset + i, text);
      await speakOne(text);
      if (stopped) return;
      await wait(pause || 0);
    }
  }

  (async () => {
    unlockAudio();
    await run(segments, 0);
    while (loop && !stopped) await run(loop, segments.length);
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

export function speakTest(text) {
  unlockAudio();
  if (synth) synth.cancel();
  return speakOne(text);
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

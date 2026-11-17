// All data lives only on this device, in localStorage.
const KEY = 'bederech-sheli:v1';
const SCHEMA = 1;

export const DEFAULT_SAFETY = [
  'נוסעת רק בנתיב הימני',
  'נוסעת רק עם מישהו לידי',
  'אוחזת בהגה חזק מאוד',
  'נוסעת רק בשעות שקטות',
  'נוסעת לאט במיוחד',
  'מכבה רדיו ומוזיקה',
  'בודקת שוב ושוב איפה אפשר לעצור',
  'שותה מים / לוקחת משהו "ליתר ביטחון"',
];

function fresh() {
  return {
    v: SCHEMA,
    createdAt: new Date().toISOString(),
    name: '',
    onboarded: false,
    baseline: null,
    goals: [],
    modules: {},          // id -> { done, doneAt, card }
    reflections: {},      // moduleId -> text
    ladder: [],           // { id, text, suds, createdAt }
    drives: [],           // { id, stepId, stepText, plannedAt, pre:{...}, post:{...}|null }
    thoughts: [],
    checkins: [],
    interoceptive: [],    // { id, date, exercise, suds, similar, note }
    imaginal: [],         // { id, date, script, before, peak, end }
    notes: [],            // free journal notes { id, date, text }
    safety: { mine: [], dropped: [] },
    copingCard: '',
    panicPlan: { signs: '', steps: '', stops: '' },
    maintenance: { signs: '', plan: '' },
    reminders: { days: [0, 2, 4], time: '18:00' },
    settings: { rate: 0.9, tones: true },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('load failed', e);
    return fresh();
  }
}

function migrate(s) {
  // Merge with defaults so new fields appear after app updates.
  const base = fresh();
  const out = { ...base, ...s };
  out.safety = { ...base.safety, ...(s.safety || {}) };
  out.panicPlan = { ...base.panicPlan, ...(s.panicPlan || {}) };
  out.maintenance = { ...base.maintenance, ...(s.maintenance || {}) };
  out.reminders = { ...base.reminders, ...(s.reminders || {}) };
  out.settings = { ...base.settings, ...(s.settings || {}) };
  out.v = SCHEMA;
  return out;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('save failed', e);
  }
}

export const store = {
  get: () => state,
  update(fn) {
    fn(state);
    save();
    return state;
  },
  reset() {
    state = fresh();
    save();
  },
  exportJSON() {
    return JSON.stringify({ app: 'bederech-sheli', exportedAt: new Date().toISOString(), data: state }, null, 2);
  },
  importJSON(text) {
    const parsed = JSON.parse(text);
    const data = parsed && parsed.app === 'bederech-sheli' ? parsed.data : null;
    if (!data || typeof data !== 'object') throw new Error('bad file');
    state = migrate(data);
    save();
  },
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch { /* ignore */ }
}

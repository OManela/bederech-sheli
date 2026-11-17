import { store } from './store.js';
import { $, icon } from './ui.js';
import * as home from './views/home.js';
import * as onboarding from './views/onboarding.js';
import * as program from './views/program.js';
import * as ladder from './views/ladder.js';
import * as thoughts from './views/thoughts.js';
import * as tools from './views/tools.js';
import * as sos from './views/sos.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

// [pattern, view factory, options]
const ROUTES = [
  ['/', home.render, { tab: 'home' }],
  ['/onboarding', onboarding.render, { tabs: false }],
  ['/program', program.renderList, { tab: 'program' }],
  ['/lesson/:id', program.renderLesson, { tab: 'program' }],
  ['/journal', program.renderJournal, { tab: 'tools' }],
  ['/ladder', ladder.renderLadder, { tab: 'ladder' }],
  ['/drive/new/:step', ladder.renderDriveNew, { tab: 'ladder' }],
  ['/drive/:id', ladder.renderDrive, { tab: 'ladder' }],
  ['/drives', ladder.renderDrives, { tab: 'ladder' }],
  ['/thoughts', thoughts.renderList, { tab: 'tools' }],
  ['/thought/new', thoughts.renderNew, { tab: 'tools' }],
  ['/tools', tools.renderHub, { tab: 'tools' }],
  ['/breathing', tools.renderBreathing, { tab: 'tools' }],
  ['/grounding', tools.renderGrounding, { tab: 'tools' }],
  ['/coping', tools.renderCoping, { tab: 'tools' }],
  ['/goals', tools.renderGoals, { tab: 'tools' }],
  ['/safety', tools.renderSafety, { tab: 'tools' }],
  ['/panic-plan', tools.renderPanicPlan, { tab: 'tools' }],
  ['/maintenance', tools.renderMaintenance, { tab: 'tools' }],
  ['/interoceptive', tools.renderInteroceptive, { tab: 'tools' }],
  ['/sos', sos.renderSOS, { tab: 'tools' }],
  ['/imaginal', sos.renderImaginalList, { tab: 'tools' }],
  ['/imaginal/:id', sos.renderImaginal, { tab: 'tools' }],
  ['/progress', progress.renderProgress, { tab: 'progress' }],
  ['/checkin', progress.renderCheckin, { tab: 'progress' }],
  ['/summary', progress.renderSummary, { tab: 'progress' }],
  ['/settings', settings.render, { tab: 'home' }],
];

const TABS = [
  ['home', '#/', 'בית', 'home'],
  ['program', '#/program', 'תוכנית', 'book'],
  ['ladder', '#/ladder', 'סולם', 'ladder'],
  ['tools', '#/tools', 'כלים', 'tools'],
  ['progress', '#/progress', 'התקדמות', 'chart'],
];

function match(path) {
  for (const [pattern, fn, opts] of ROUTES) {
    const pp = pattern.split('/');
    const sp = path.split('/');
    if (pp.length !== sp.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(sp[i]);
      else if (pp[i] !== sp[i]) { ok = false; break; }
    }
    if (ok) return { fn, opts, params };
  }
  return null;
}

let cleanup = null;

function route() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  const s = store.get();

  if (!s.onboarded && path !== '/onboarding') { location.replace('#/onboarding'); return; }

  const m = match(path) || match('/');
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }

  const view = $('#view');
  const out = m.fn({ ...m.params, query }) || {};
  view.innerHTML = out.html || '';
  const showTabs = m.opts.tabs !== false && !out.fullscreen;
  view.classList.toggle('no-tabs', !showTabs);
  renderTabs(showTabs ? m.opts.tab : null);
  window.scrollTo(0, 0);
  if (out.mount) cleanup = out.mount(view) || null;
}

function renderTabs(active) {
  const bar = $('#tabbar');
  if (!active) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = TABS.map(([id, href, label, ic]) =>
    `<a href="${href}" ${id === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`
  ).join('');
}

window.addEventListener('hashchange', route);
route();

// On localhost the offline cache is off unless ?sw=1, so edits show up immediately.
const isDev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]sw=1/.test(location.search);
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !isDev) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed', err));
  });
}

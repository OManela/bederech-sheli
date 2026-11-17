import { store } from '../store.js';
import { $, esc, escBr, icon, personalize, topbar, toast, go, fmtDate } from '../ui.js';
import { MODULES, isUnlocked } from '../content/modules.js';

export function renderList() {
  const s = store.get();
  const items = MODULES.map((m, i) => {
    const done = s.modules[m.id]?.done;
    const unlocked = isUnlocked(s, i);
    const dot = done ? `<span class="num-dot done">${icon('check', 'width="18" height="18"')}</span>`
      : unlocked ? `<span class="num-dot">${i + 1}</span>`
        : `<span class="num-dot locked">${icon('lock', 'width="16" height="16"')}</span>`;
    const inner = `${dot}
      <div class="grow">
        <div class="title">${esc(m.title)}</div>
        <div class="small muted">${esc(m.subtitle)}</div>
      </div>
      ${unlocked ? `<span class="chev">${icon('chev', 'width="18" height="18"')}</span>` : ''}`;
    return unlocked
      ? `<li><a class="list-item" href="#/lesson/${m.id}">${inner}</a></li>`
      : `<li><div class="list-item" style="opacity:.55">${inner}</div></li>`;
  }).join('');
  const done = MODULES.filter(m => s.modules[m.id]?.done).length;
  return {
    html: `
      ${topbar('התוכנית')}
      <div class="card soft">
        <p>8 שלבים, בערך שלב בשבוע. כל שלב נפתח אחרי שמסיימים את הקודם, ואפשר לחזור לשלבים קודמים בכל זמן.</p>
        <div class="bar"><i style="width:${(done / MODULES.length) * 100}%"></i></div>
        <p class="small muted" style="margin-top:6px">הושלמו ${done} מתוך ${MODULES.length}</p>
      </div>
      <div class="card"><ul class="list">${items}</ul></div>
      <a class="btn block" href="#/journal">התובנות שלי</a>`,
  };
}

export function renderLesson({ id }) {
  const s = store.get();
  const idx = MODULES.findIndex(m => m.id === id);
  const mod = MODULES[idx];
  if (!mod || !isUnlocked(s, idx)) { setTimeout(() => go('#/program')); return { html: '' }; }
  const total = mod.cards.length + 1; // + summary card
  let cur = Math.min(s.modules[id]?.card || 0, total - 1);
  if (s.modules[id]?.done) cur = 0;

  function cardHTML() {
    if (cur < mod.cards.length) {
      const c = mod.cards[cur];
      return `<h2>${personalize(c.title)}</h2><div class="body">${personalize(c.html)}</div>`;
    }
    const st = store.get();
    const refl = st.reflections[id]?.text || '';
    const done = st.modules[id]?.done;
    return `
      <h2>לסיכום השלב</h2>
      <div class="body">
        <label class="field"><span>שאלה למחשבה</span>
          <small>${esc(mod.reflection)}</small>
          <textarea id="refl" placeholder="כתבי כאן בחופשיות…">${esc(refl)}</textarea>
        </label>
        <h3>תרגול לבית</h3>
        <ul class="list">${mod.homework.map(h => `
          <li><a class="list-item" href="${h.href}">
            <span class="num-dot" style="width:28px;height:28px">${icon('check', 'width="14" height="14"')}</span>
            <div class="grow"><div>${esc(h.text)}</div><div class="small" style="color:var(--primary)">${esc(h.label)}</div></div>
            <span class="chev">${icon('chev', 'width="18" height="18"')}</span>
          </a></li>`).join('')}
        </ul>
      </div>
      <button class="btn primary block" id="complete" style="margin-top:14px">${done ? 'שמרי' : 'סיימתי את השלב'}</button>`;
  }

  function paint(root) {
    $('#lc', root).innerHTML = cardHTML();
    $('#dots', root).innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i === cur ? 'on' : ''}"></i>`).join('');
    $('#prev', root).disabled = cur === 0;
    $('#next', root).hidden = cur === total - 1;
    store.update(st => { st.modules[id] = { ...(st.modules[id] || {}), card: cur }; });
    const comp = $('#complete', root);
    if (comp) comp.onclick = () => complete();
    const refl = $('#refl', root);
    if (refl) refl.addEventListener('input', () => saveRefl(refl.value));
  }

  function saveRefl(text) {
    store.update(st => { st.reflections[id] = { text, date: new Date().toISOString() }; });
  }

  function complete() {
    const refl = $('#refl');
    if (refl) saveRefl(refl.value);
    const wasDone = store.get().modules[id]?.done;
    store.update(st => { st.modules[id] = { ...(st.modules[id] || {}), done: true, doneAt: st.modules[id]?.doneAt || new Date().toISOString(), card: 0 }; });
    if (wasDone) { toast('נשמר'); return; }
    const nextMod = MODULES[idx + 1];
    toast(nextMod ? `כל הכבוד! נפתח שלב ${idx + 2}: ${nextMod.title}` : 'כל הכבוד! סיימת את התוכנית');
    go('#/program');
  }

  return {
    html: `
      ${topbar(`${idx + 1}. ${esc(mod.title)}`, { back: '#/program' })}
      <article class="card lesson-card" id="lc"></article>
      <div class="dots" id="dots"></div>
      <div class="btn-row">
        <button class="btn" id="prev">הקודם</button>
        <button class="btn primary" id="next">הבא</button>
      </div>`,
    mount(root) {
      paint(root);
      $('#prev', root).onclick = () => { if (cur > 0) { cur--; paint(root); window.scrollTo(0, 0); } };
      $('#next', root).onclick = () => { if (cur < total - 1) { cur++; paint(root); window.scrollTo(0, 0); } };
      // Swipe: in RTL, dragging the finger to the right brings the next card.
      let x0 = null, y0 = null;
      const lc = $('#lc', root);
      lc.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      lc.addEventListener('touchend', e => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        if (e.target.closest('textarea, input')) return;
        if (dx > 0 && cur < total - 1) { cur++; paint(root); }
        else if (dx < 0 && cur > 0) { cur--; paint(root); }
      });
    },
  };
}

export function renderJournal() {
  const s = store.get();
  const entries = MODULES.filter(m => s.reflections[m.id]?.text);
  const notes = [...s.notes].reverse();
  return {
    html: `
      ${topbar('התובנות שלי', { back: '#/tools' })}
      <div class="card">
        <h2>רשימה חופשית</h2>
        <textarea id="note-text" style="min-height:80px" placeholder="מחשבה, תובנה, מסלול שאת נמנעת ממנו, רגע שהצלחת…"></textarea>
        <button class="btn primary block" id="note-add" style="margin-top:10px">הוסיפי</button>
      </div>
      ${notes.map(n => `
        <div class="card" data-id="${n.id}">
          <div class="eyebrow">${fmtDate(n.date, true)}</div>
          <p>${escBr(n.text)}</p>
          <button class="btn ghost" data-del style="min-height:36px;padding:4px 8px">מחיקה</button>
        </div>`).join('')}
      <h2 style="margin-top:22px">תשובות לשאלות בשלבים</h2>
      ${entries.length ? entries.map(m => `
        <a class="card" href="#/lesson/${m.id}" style="display:block;text-decoration:none;color:inherit">
          <div class="eyebrow">${esc(m.title)} · ${fmtDate(s.reflections[m.id].date)}</div>
          <p class="small muted">${esc(m.reflection)}</p>
          <p>${escBr(s.reflections[m.id].text)}</p>
        </a>`).join('')
        : '<div class="card"><p class="muted">התשובות שתכתבי בסוף כל שלב יופיעו כאן.</p></div>'}`,
    mount(root) {
      $('#note-add', root).onclick = () => {
        const text = $('#note-text', root).value.trim();
        if (!text) return;
        store.update(x => { x.notes.push({ id: Date.now().toString(36), date: new Date().toISOString(), text }); });
        toast('נשמר');
        go('#/journal');
      };
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        if (!confirm('למחוק את הרשימה?')) return;
        const id = b.closest('[data-id]').dataset.id;
        store.update(x => { x.notes = x.notes.filter(n => n.id !== id); });
        go('#/journal');
      });
    },
  };
}

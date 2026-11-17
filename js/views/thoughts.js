import { store, uid } from '../store.js';
import { $, $$, esc, escBr, icon, topbar, toast, go, fmtDate, rangeField, chipsField, bindChips, readChips, val, num } from '../ui.js';
import { THINKING_TRAPS } from '../content/modules.js';

export function renderList() {
  const s = store.get();
  const list = [...s.thoughts].reverse();
  return {
    html: `
      ${topbar('יומן המחשבות', { back: '#/tools' })}
      <a class="btn primary block" href="#/thought/new" style="margin-bottom:14px">${icon('plus')} רשומה חדשה</a>
      ${list.length ? list.map(t => `
        <details class="card" data-id="${t.id}">
          <summary>
            <div class="eyebrow">${fmtDate(t.date, true)}</div>
            ${esc(t.thought || t.situation)}
            <div class="small muted" style="font-weight:400">
              אמונה במחשבה: ${t.beliefBefore} ← ${t.beliefAfter ?? '–'} · ${esc(t.emotion || 'רגש')}: ${t.intensityBefore} ← ${t.intensityAfter ?? '–'}
            </div>
          </summary>
          <div class="divider"></div>
          ${row('המצב', t.situation)}
          ${row('המחשבה האוטומטית', t.thought)}
          ${t.traps?.length ? row('מלכודות חשיבה', t.traps.join(', ')) : ''}
          ${row('ראיות בעד', t.evidenceFor)}
          ${row('ראיות נגד', t.evidenceAgainst)}
          ${row('מחשבה מאוזנת', t.balanced)}
          <button class="btn ghost" data-del>${icon('trash', 'width="18" height="18"')} מחיקה</button>
        </details>`).join('')
        : `<div class="card"><p class="muted">יומן המחשבות עוזר לתפוס מחשבות מפחידות ולבדוק אותן. כדאי למלא אותו אחרי (או לפני) נסיעה מלחיצה – לא בזמן הנהיגה.</p></div>`}`,
    mount(root) {
      $$('[data-del]', root).forEach(b => b.onclick = () => {
        if (!confirm('למחוק את הרשומה?')) return;
        const id = b.closest('[data-id]').dataset.id;
        store.update(x => { x.thoughts = x.thoughts.filter(t => t.id !== id); });
        go('#/thoughts');
      });
    },
  };
}

function row(label, text) {
  if (!text) return '';
  return `<div style="margin-bottom:10px"><div class="eyebrow">${label}</div><div>${escBr(text)}</div></div>`;
}

export function renderNew() {
  let step = 0;
  const d = { situation: '', thought: '', emotion: 'חרדה', intensityBefore: 70, beliefBefore: 70, traps: [], evidenceFor: '', evidenceAgainst: '', balanced: '', intensityAfter: 50, beliefAfter: 40 };

  const STEPS = [
    () => `
      <h2>1. המצב</h2>
      <label class="field"><span>מה קרה? איפה היית?</span>
        <small>למשל: "נסעתי בכביש 1, משאית עקפה אותי מימין" או "חשבתי על הנסיעה של מחר"</small>
        <textarea id="t-sit">${esc(d.situation)}</textarea>
      </label>`,
    () => `
      <h2>2. המחשבה והרגש</h2>
      <label class="field"><span>מה עבר לך בראש?</span>
        <small>המחשבה המפחידה ביותר, במילים שלך</small>
        <textarea id="t-th" placeholder="למשל: אני אאבד שליטה על ההגה">${esc(d.thought)}</textarea>
      </label>
      ${rangeField({ id: 't-bb', label: 'כמה את מאמינה למחשבה הזו? (0–100)', min: 0, max: 100, step: 5, value: d.beliefBefore })}
      <label class="field"><span>איזה רגש הרגשת?</span>
        <input type="text" id="t-em" value="${esc(d.emotion)}">
      </label>
      ${rangeField({ id: 't-ib', label: 'באיזו עוצמה? (0–100)', min: 0, max: 100, step: 5, value: d.intensityBefore })}`,
    () => `
      <h2>3. מלכודות חשיבה</h2>
      <p class="muted">האם המחשבה נופלת לאחת המלכודות? אפשר לסמן כמה.</p>
      ${chipsField('traps', THINKING_TRAPS, d.traps)}`,
    () => `
      <h2>4. בדיקת המחשבה</h2>
      <label class="field"><span>מה תומך במחשבה?</span>
        <small>עובדות בלבד, לא תחושות</small>
        <textarea id="t-ef">${esc(d.evidenceFor)}</textarea>
      </label>
      <label class="field"><span>מה לא תומך בה?</span>
        <small>כמה פעמים חשבת ככה ומה קרה בפועל? מה היית אומרת לחברה? גם אם זה יקרה – איך תתמודדי?</small>
        <textarea id="t-ea">${esc(d.evidenceAgainst)}</textarea>
      </label>`,
    () => `
      <h2>5. מחשבה מאוזנת</h2>
      <label class="field"><span>איך אפשר לחשוב על זה בצורה מציאותית יותר?</span>
        <small>לא "הכול יהיה מושלם" – אלא משהו שאת באמת יכולה להאמין לו</small>
        <textarea id="t-bal" placeholder="למשל: ייתכן שארגיש חרדה, אבל חרדה לא גורמת לי לאבד שליטה. נהגתי מאות פעמים והגעתי.">${esc(d.balanced)}</textarea>
      </label>
      ${rangeField({ id: 't-ba', label: 'עכשיו – כמה את מאמינה למחשבה המקורית?', min: 0, max: 100, step: 5, value: d.beliefAfter })}
      ${rangeField({ id: 't-ia', label: 'ומה עוצמת הרגש עכשיו?', min: 0, max: 100, step: 5, value: d.intensityAfter })}`,
  ];

  function collect(root) {
    const g = id => (document.getElementById(id) ? val(id) : null);
    if (step === 0) d.situation = g('t-sit').trim();
    if (step === 1) { d.thought = g('t-th').trim(); d.emotion = g('t-em').trim(); d.beliefBefore = num('t-bb'); d.intensityBefore = num('t-ib'); }
    if (step === 2) d.traps = readChips('traps', root);
    if (step === 3) { d.evidenceFor = g('t-ef').trim(); d.evidenceAgainst = g('t-ea').trim(); }
    if (step === 4) { d.balanced = g('t-bal').trim(); d.beliefAfter = num('t-ba'); d.intensityAfter = num('t-ia'); }
  }

  function paint(root) {
    root.innerHTML = `
      ${topbar('רשומה ביומן המחשבות', { back: '#/thoughts' })}
      <div class="steps-ind">${STEPS.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="card">${STEPS[step]()}</div>
      <div class="btn-row">
        ${step > 0 ? '<button class="btn" id="t-back">הקודם</button>' : ''}
        <button class="btn primary" id="t-next">${step === STEPS.length - 1 ? 'שמרי' : 'הבא'}</button>
      </div>`;
    bindChips(root);
    const back = $('#t-back', root);
    if (back) back.onclick = () => { collect(root); step--; paint(root); };
    $('#t-next', root).onclick = () => {
      collect(root);
      if (step === 1 && !d.thought) { toast('נסי לכתוב את המחשבה'); return; }
      if (step < STEPS.length - 1) { step++; paint(root); window.scrollTo(0, 0); return; }
      store.update(s => { s.thoughts.push({ id: uid(), date: new Date().toISOString(), ...d }); });
      const drop = d.beliefBefore - d.beliefAfter;
      toast(drop > 0 ? `האמונה במחשבה ירדה ב-${drop}. כל הכבוד` : 'נשמר ביומן');
      go('#/thoughts');
    };
  }

  return { html: '', mount: root => paint(root) };
}

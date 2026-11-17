import { store, uid, DEFAULT_SAFETY } from '../store.js';
import { $, $$, esc, escBr, icon, topbar, toast, go, fmtDate, rangeField, val, num } from '../ui.js';
import { INTEROCEPTIVE } from '../content/modules.js';
import { breathTone, unlockAudio, chime, keepAwake } from '../audio.js';

const link = (href, title, sub, ic) => `
  <li><a class="list-item" href="${href}">
    <span class="num-dot">${icon(ic, 'width="18" height="18"')}</span>
    <div class="grow"><div class="title">${title}</div><div class="small muted">${sub}</div></div>
    <span class="chev">${icon('chev', 'width="18" height="18"')}</span>
  </a></li>`;

export function renderHub() {
  return {
    html: `
      ${topbar('כלים')}
      <a class="sos-btn" href="#/sos">${icon('wave')} מצב SOS לנסיעה</a>
      <div class="card"><div class="eyebrow">ברגע של חרדה</div><ul class="list">
        ${link('#/breathing', 'נשימה איטית', 'עיגול וצלילים, 4 שניות פנימה ו-6 החוצה', 'wave')}
        ${link('#/grounding', 'קרקוע 5-4-3-2-1', 'לחזור לכאן ועכשיו דרך החושים', 'tools')}
        ${link('#/coping', 'כרטיס ההתמודדות שלי', 'המשפטים שלך לפני נסיעה', 'book')}
      </ul></div>
      <div class="card"><div class="eyebrow">תרגול</div><ul class="list">
        ${link('#/thoughts', 'יומן המחשבות', 'לזהות מחשבה מפחידה ולבדוק אותה', 'book')}
        ${link('#/imaginal', 'חשיפה בדמיון', 'נסיעות מוקראות – להאזנה בבית בלבד', 'play')}
        ${link('#/interoceptive', 'חשיפה לתחושות', 'תרגילים שמעוררים תחושות גוף בבטחה', 'chart')}
        ${link('#/drives', 'יומן הנסיעות', 'כל התרגולים, לפני ואחרי', 'car')}
      </ul></div>
      <div class="card"><div class="eyebrow">התוכניות שלי</div><ul class="list">
        ${link('#/goals', 'המטרות שלי', 'לאן אני רוצה להגיע', 'road')}
        ${link('#/safety', 'התנהגויות ביטחון', 'מה אני עושה "ליתר ביטחון", ועל מה ויתרתי', 'ladder')}
        ${link('#/panic-plan', 'תוכנית להתקף בנהיגה', 'מה אני עושה ברגע האמת', 'wave')}
        ${link('#/maintenance', 'תוכנית תחזוקה', 'לשמור על ההישגים', 'check')}
        ${link('#/journal', 'התובנות שלי', 'תשובות לשאלות ורשימות חופשיות', 'book')}
      </ul></div>`,
  };
}

// ---------- breathing ----------
export function renderBreathing() {
  const s = store.get();
  let running = false, timer = null, endAt = 0, minutes = 5;
  const IN = 4, OUT = 6;
  return {
    html: `
      ${topbar('נשימה איטית', { back: '#/tools' })}
      <div class="card">
        <div class="breath-stage"><div class="breath-circle" id="circle"></div></div>
        <div class="breath-label" id="blabel">מוכנה?</div>
        <p class="center muted small" id="bleft"></p>
      </div>
      <div class="card">
        <label class="field"><span>משך</span>
          <div class="seg" id="dur">${[3, 5, 10].map(m => `<button type="button" aria-pressed="${m === 5}" data-m="${m}">${m} דקות</button>`).join('')}</div>
        </label>
        <label class="field" style="display:flex;gap:10px;align-items:center;margin:0">
          <input type="checkbox" id="tones" style="width:22px;height:22px" ${s.settings.tones ? 'checked' : ''}>
          <span style="margin:0">צלילים מנחים (עולה בשאיפה, יורד בנשיפה)</span>
        </label>
      </div>
      <button class="btn primary block" id="bstart">התחילי</button>
      <p class="small muted center" style="margin-top:12px">זכרי: הנשימה היא כלי להישאר עם החרדה, לא לגרש אותה.</p>`,
    mount(root) {
      const circle = $('#circle', root), label = $('#blabel', root), left = $('#bleft', root), btn = $('#bstart', root);
      $('#dur', root).onclick = e => {
        const b = e.target.closest('button'); if (!b || running) return;
        minutes = +b.dataset.m;
        $$('#dur button', root).forEach(x => x.setAttribute('aria-pressed', x === b));
      };
      $('#tones', root).onchange = e => store.update(x => { x.settings.tones = e.target.checked; });

      const phase = (kind) => {
        if (!running) return;
        if (Date.now() >= endAt) { stop(true); return; }
        const sec = kind === 'in' ? IN : OUT;
        circle.style.transitionDuration = sec + 's';
        circle.style.transform = kind === 'in' ? 'scale(2.1)' : 'scale(1)';
        label.textContent = kind === 'in' ? 'שאיפה…' : 'נשיפה ארוכה…';
        if ($('#tones', root).checked) breathTone(kind, sec);
        const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 60000));
        left.textContent = `נותרו כ-${rem} דקות`;
        timer = setTimeout(() => phase(kind === 'in' ? 'out' : 'in'), sec * 1000);
      };
      const stop = (finished) => {
        running = false;
        clearTimeout(timer);
        keepAwake(false);
        circle.style.transitionDuration = '1.5s';
        circle.style.transform = 'scale(1)';
        label.textContent = finished ? 'כל הכבוד' : 'מוכנה?';
        left.textContent = '';
        btn.textContent = 'התחילי';
        if (finished) chime();
      };
      btn.onclick = () => {
        if (running) { stop(false); return; }
        unlockAudio();
        running = true;
        endAt = Date.now() + minutes * 60000;
        btn.textContent = 'עצירה';
        keepAwake(true);
        phase('in');
      };
      return () => { running = false; clearTimeout(timer); keepAwake(false); };
    },
  };
}

// ---------- grounding ----------
export function renderGrounding() {
  const STEPS = [
    ['5', 'דברים שאת רואה', 'הסתכלי סביבך ומני בשקט חמישה דברים. צבע, צורה, אור.'],
    ['4', 'דברים שאת מרגישה במגע', 'הבגד על העור, הרגליים על הרצפה, הגב על הכיסא, הידיים.'],
    ['3', 'צלילים שאת שומעת', 'רחוקים וקרובים. מכונית, רוח, הנשימה שלך.'],
    ['2', 'ריחות', 'או שני ריחות שאת אוהבת, אם אין ריח מסביב.'],
    ['1', 'דבר אחד טוב שאת יכולה להגיד לעצמך', 'למשל: "אני כאן. זו חרדה, והיא תעבור."'],
  ];
  let i = 0;
  return {
    html: `${topbar('קרקוע 5-4-3-2-1', { back: '#/tools' })}<div id="g"></div>
      <p class="small muted center">בזמן נהיגה – רק בקול ובראש, בלי להסתכל על הטלפון. במצב SOS הקול מנחה גרסה קצרה של התרגיל.</p>`,
    mount(root) {
      const paint = () => {
        const done = i >= STEPS.length;
        $('#g', root).innerHTML = done
          ? `<div class="card good center"><h2>כל הכבוד</h2><p>חזרת לכאן ועכשיו. שימי לב איך את מרגישה.</p>
              <button class="btn block" id="g-again">שוב מההתחלה</button></div>`
          : `<div class="card center" style="padding:30px 18px">
              <div style="font-size:4rem;font-weight:800;color:var(--primary);line-height:1">${STEPS[i][0]}</div>
              <h2>${STEPS[i][1]}</h2><p class="muted">${STEPS[i][2]}</p></div>
             <button class="btn primary block" id="g-next">${i === STEPS.length - 1 ? 'סיום' : 'הבא'}</button>`;
        const n = $('#g-next', root); if (n) n.onclick = () => { i++; paint(); };
        const a = $('#g-again', root); if (a) a.onclick = () => { i = 0; paint(); };
      };
      paint();
    },
  };
}

// ---------- coping card ----------
export function renderCoping() {
  const s = store.get();
  const balanced = [...s.thoughts].reverse().filter(t => t.balanced).slice(0, 3);
  const pp = s.panicPlan;
  return {
    html: `
      ${topbar('כרטיס ההתמודדות שלי', { back: '#/tools' })}
      <div class="card soft">
        <div class="eyebrow">המשפטים שלי</div>
        <div id="cc-view">${s.copingCard ? `<p style="font-size:1.1rem">${escBr(s.copingCard)}</p>` : '<p class="muted">עוד לא כתבת. מה תרצי להגיד לעצמך לפני נסיעה, או ברגע קשה?</p>'}</div>
        <div id="cc-edit" hidden>
          <textarea id="cc-text" style="min-height:140px" placeholder="למשל:&#10;חרדה היא לא מסוכנת – היא אזעקה.&#10;כבר נהגתי מאות פעמים והגעתי.&#10;אני לא צריכה שהפחד ייעלם, רק להמשיך לנשום.">${esc(s.copingCard)}</textarea>
          <button class="btn primary block" id="cc-save" style="margin-top:10px">שמרי</button>
        </div>
        <button class="btn ghost" id="cc-toggle">${s.copingCard ? 'עריכה' : 'כתבי את הכרטיס'}</button>
      </div>
      <div class="card">
        <div class="eyebrow">ברגע של חרדה בכביש</div>
        <p style="margin:0"><b>נ</b>שימה ארוכה · <b>ש</b>ם: "זו חרדה, היא תעבור" · <b>מ</b>גע: ידיים על ההגה · <b>י</b>מינה בבטחה</p>
      </div>
      ${pp.steps ? `<div class="card"><div class="eyebrow">מה עוזר לי</div><p style="margin:0">${escBr(pp.steps)}</p></div>` : ''}
      ${balanced.length ? `<div class="card"><div class="eyebrow">מחשבות מאוזנות מהיומן שלי</div>
        ${balanced.map(t => `<p>"${esc(t.balanced)}"</p>`).join('')}</div>` : ''}
      ${s.goals.length ? `<div class="card good"><div class="eyebrow">בשביל מה אני עושה את זה</div>
        <ul style="margin:0;padding-inline-start:1.2em">${s.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>` : ''}`,
    mount(root) {
      const edit = $('#cc-edit', root), view = $('#cc-view', root), tog = $('#cc-toggle', root);
      tog.onclick = () => { edit.hidden = false; view.hidden = true; tog.hidden = true; $('#cc-text', root).focus(); };
      $('#cc-save', root).onclick = () => {
        store.update(x => { x.copingCard = val('cc-text').trim(); });
        toast('נשמר');
        go('#/coping');
      };
    },
  };
}

// ---------- goals ----------
export function renderGoals() {
  const s = store.get();
  const goals = [...s.goals, '', '', ''].slice(0, Math.max(3, s.goals.length + 1));
  return {
    html: `
      ${topbar('המטרות שלי', { back: '#/tools' })}
      <p class="muted">מטרות מוחשיות ומדידות. אפשר לעדכן אותן בכל שלב.</p>
      <div class="card">
        ${goals.map((g, i) => `<label class="field"><span>מטרה ${i + 1}</span>
          <input type="text" class="goal" value="${esc(g)}" placeholder="למשל: לנסוע לבד בכביש המהיר לעבודה"></label>`).join('')}
      </div>
      <button class="btn primary block" id="g-save">שמרי</button>`,
    mount(root) {
      $('#g-save', root).onclick = () => {
        store.update(x => { x.goals = $$('.goal', root).map(i => i.value.trim()).filter(Boolean); });
        toast('המטרות נשמרו');
        go('#/goals');
      };
    },
  };
}

// ---------- safety behaviours ----------
export function renderSafety() {
  const s = store.get();
  const all = [...new Set([...DEFAULT_SAFETY, ...s.safety.mine])];
  return {
    html: `
      ${topbar('התנהגויות ביטחון', { back: '#/tools' })}
      <div class="card soft"><p style="margin:0">סמני מה את עושה כדי להרגיש בטוחה יותר בנהיגה – גם דברים קטנים. השאלה המבחינה: "האם הייתי עושה את זה גם בלי חרדה?"</p></div>
      <div class="card">
        <h2>מה אני עושה</h2>
        <ul class="list" id="sf-list">${all.map(b => {
          const mine = s.safety.mine.includes(b), dropped = s.safety.dropped.includes(b);
          return `<li class="list-item" data-b="${esc(b)}">
            <input type="checkbox" class="sf-mine" style="width:22px;height:22px;flex:none" ${mine ? 'checked' : ''} aria-label="אני עושה את זה">
            <div class="grow">${esc(b)}</div>
            <button type="button" class="chip sf-drop" aria-pressed="${dropped}" ${mine ? '' : 'hidden'}>ויתרתי</button>
          </li>`;
        }).join('')}</ul>
        <div class="btn-row" style="margin-top:12px">
          <input type="text" id="sf-new" placeholder="הוסיפי משהו משלך" style="flex:2">
          <button class="btn" id="sf-add">${icon('plus', 'width="18" height="18"')}</button>
        </div>
      </div>
      <p class="small muted">ההתנהגויות שסימנת יופיעו בטופס "לפני הנסיעה", כדי לבחור על מה לוותר בכל תרגול.</p>`,
    mount(root) {
      const sync = () => {
        const mine = [], dropped = [];
        $$('#sf-list [data-b]', root).forEach(li => {
          const b = li.dataset.b, m = $('.sf-mine', li).checked, d = $('.sf-drop', li);
          d.hidden = !m;
          if (m) mine.push(b);
          if (m && d.getAttribute('aria-pressed') === 'true') dropped.push(b);
        });
        store.update(x => { x.safety.mine = mine; x.safety.dropped = dropped; });
      };
      $$('.sf-mine', root).forEach(c => c.onchange = sync);
      $$('.sf-drop', root).forEach(c => c.onclick = () => { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'); sync(); });
      $('#sf-add', root).onclick = () => {
        const t = val('sf-new').trim(); if (!t) return;
        store.update(x => { if (!x.safety.mine.includes(t)) x.safety.mine.push(t); });
        go('#/safety');
      };
    },
  };
}

// ---------- panic plan & maintenance ----------
function planForm({ title, intro, fields, key, back }) {
  const s = store.get();
  return {
    html: `
      ${topbar(title, { back })}
      ${intro}
      <div class="card">
        ${fields.map(([k, label, hint, ph]) => `<label class="field"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}
          <textarea data-k="${k}" placeholder="${esc(ph)}">${esc(s[key][k])}</textarea></label>`).join('')}
      </div>
      <button class="btn primary block" id="pl-save">שמרי</button>`,
    mount(root) {
      $('#pl-save', root).onclick = () => {
        store.update(x => { $$('[data-k]', root).forEach(t => { x[key][t.dataset.k] = t.value.trim(); }); });
        toast('נשמר');
      };
    },
  };
}

export function renderPanicPlan() {
  return planForm({
    title: 'תוכנית להתקף בנהיגה',
    back: '#/tools',
    key: 'panicPlan',
    intro: `<div class="card soft"><p style="margin:0"><b>נ־ש־מ־י:</b> נשימה · שם ("זו חרדה, היא תעבור") · מגע (ידיים על ההגה, גב במושב) · ימינה בבטחה, בקצב קבוע.</p></div>`,
    fields: [
      ['signs', 'הסימנים הראשונים שלי', 'מה קורה בגוף ובראש כשזה מתחיל?', 'למשל: הידיים מזיעות, אני מתחילה לחשוב "אני לא אצליח"'],
      ['steps', 'מה עוזר לי ברגע הזה', 'זה יופיע בכרטיס ההתמודדות', 'למשל: נשיפה ארוכה, להגיד בקול "זו רק חרדה", לעבור לנתיב הימני'],
      ['stops', 'היכן אפשר לעצור בבטחה במסלולים שלי', 'תחנות דלק, יציאות, מפרצים – רק אם באמת צריך', 'למשל: תחנת הדלק אחרי מחלף…'],
    ],
  });
}

export function renderMaintenance() {
  return planForm({
    title: 'תוכנית תחזוקה',
    back: '#/tools',
    key: 'maintenance',
    intro: '<p class="muted">איך תשמרי על מה שהשגת, ומה תעשי אם הפחד ינסה לחזור.</p>',
    fields: [
      ['signs', 'סימני האזהרה שלי', 'מה יגיד לי שהפחד מתחיל לחזור?', 'למשל: אני מתחילה לבחור מסלולים ארוכים "סתם ככה"'],
      ['plan', 'מה אעשה כדי לשמור על ההישגים', 'כמה פעמים בשבוע, אילו כבישים, מה אעשה אחרי נסיעה קשה', 'למשל: לפחות נסיעה אחת בשבוע בכביש מהיר…'],
    ],
  });
}

// ---------- interoceptive exposure ----------
export function renderInteroceptive({ query }) {
  const s = store.get();
  const ex = INTEROCEPTIVE.find(e => e.id === query.ex);
  if (!ex) {
    const hist = [...s.interoceptive].reverse().slice(0, 15);
    return {
      html: `
        ${topbar('חשיפה לתחושות', { back: '#/tools' })}
        <div class="card accent"><p style="margin:0"><b>לפני שמתחילים:</b> אם יש לך בעיות לב או לחץ דם, אסתמה, אפילפסיה, הריון, היסטוריה של התעלפויות או בעיות צוואר – התייעצי קודם עם רופא/ה. מתרגלים בישיבה או ליד משהו יציב.</p></div>
        <div class="card"><ul class="list">${INTEROCEPTIVE.map(e => {
          const n = s.interoceptive.filter(h => h.exercise === e.id).length;
          return `<li><a class="list-item" href="#/interoceptive?ex=${e.id}">
            <div class="grow"><div class="title">${e.title}</div><div class="small muted">${e.feel} · ${e.seconds} שניות</div></div>
            ${n ? `<span class="badge">${n}×</span>` : ''}
            <span class="chev">${icon('chev', 'width="18" height="18"')}</span></a></li>`;
        }).join('')}</ul></div>
        ${hist.length ? `<div class="card"><h2>התרגולים שלי</h2>${hist.map(h => {
          const e = INTEROCEPTIVE.find(x => x.id === h.exercise);
          return `<div class="kv"><span>${e ? e.title : ''} <span class="small muted">${fmtDate(h.date)}</span></span><b>חרדה ${h.suds} · דמיון ${h.similar}</b></div>`;
        }).join('')}</div>` : ''}`,
    };
  }
  let timer = null;
  return {
    html: `
      ${topbar(ex.title, { back: '#/interoceptive' })}
      <div class="card"><p>${ex.how}</p><p class="muted small">תחושה צפויה: ${ex.feel}. בצעי עד הסוף, ושימי לב לתחושות בסקרנות – בלי להילחם בהן.</p></div>
      <div class="card center">
        <div id="ix-t" style="font-size:3.4rem;font-weight:800;color:var(--primary)">${ex.seconds}</div>
        <button class="btn primary block" id="ix-go">התחילי</button>
      </div>
      <div class="card" id="ix-rate" hidden>
        <h2>איך היה?</h2>
        ${rangeField({ id: 'ix-suds', label: 'כמה חרדה הרגשת בשיא? (0–100)', min: 0, max: 100, step: 5, value: 40 })}
        ${rangeField({ id: 'ix-sim', label: 'כמה זה דמה לחרדה בנהיגה? (0–100)', min: 0, max: 100, step: 5, value: 40 })}
        <label class="field"><span>מה שמת לב?</span><textarea id="ix-note" style="min-height:70px"></textarea></label>
        <button class="btn primary block" id="ix-save">שמרי</button>
        <p class="small muted" style="margin-top:10px">חכי שהתחושות ירדו לבד, ואז נסי שוב. 3–5 חזרות בדרך כלל מורידות את הפחד מהתחושה.</p>
      </div>`,
    mount(root) {
      const t = $('#ix-t', root), go1 = $('#ix-go', root);
      go1.onclick = () => {
        unlockAudio();
        let left = ex.seconds;
        go1.disabled = true;
        timer = setInterval(() => {
          left--;
          t.textContent = left;
          if (left <= 0) {
            clearInterval(timer);
            chime();
            t.textContent = 'סיום';
            go1.disabled = false;
            go1.textContent = 'שוב';
            $('#ix-rate', root).hidden = false;
          }
        }, 1000);
      };
      $('#ix-save', root).onclick = () => {
        store.update(x => { x.interoceptive.push({ id: uid(), date: new Date().toISOString(), exercise: ex.id, suds: num('ix-suds'), similar: num('ix-sim'), note: val('ix-note').trim() }); });
        toast('נשמר');
        go('#/interoceptive');
      };
      return () => clearInterval(timer);
    },
  };
}

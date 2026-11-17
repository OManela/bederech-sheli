import { store, uid, DEFAULT_SAFETY } from '../store.js';
import { $, $$, esc, escBr, icon, topbar, toast, go, fmtDate, rangeField, chipsField, bindChips, readChips, val, num } from '../ui.js';
import { EXAMPLE_LADDER } from '../content/modules.js';

const MASTERY_SUDS = 40;

// ---------- helpers shared with other views ----------
export function stepDrives(s, stepId) {
  return s.drives.filter(d => d.stepId === stepId && d.post && !d.post.skipped);
}

export function completedDrives(s) {
  return s.drives.filter(d => d.post && !d.post.skipped);
}

export function isMastered(s, step) {
  if (step.mastered) return true;
  const ds = stepDrives(s, step.id);
  if (ds.length < 3) return false;
  return ds.slice(-2).every(d => d.post.actual <= MASTERY_SUDS);
}

export function sortedLadder(s) {
  return [...s.ladder].sort((a, b) => a.suds - b.suds);
}

export function nextLadderStep(s) {
  return sortedLadder(s).find(st => !isMastered(s, st)) || null;
}

export function openDrive(s) {
  return [...s.drives].reverse().find(d => !d.post) || null;
}

function safetyOptions(s) {
  const mine = s.safety.mine.length ? s.safety.mine : DEFAULT_SAFETY;
  return [...new Set(mine)];
}

// ---------- ladder ----------
export function renderLadder() {
  const s = store.get();
  const steps = sortedLadder(s);
  const current = nextLadderStep(s);
  let editing = null;

  const rows = steps.map((st, i) => {
    const ds = stepDrives(s, st.id);
    const m = isMastered(s, st);
    const last = ds[ds.length - 1];
    return `
      <li class="entry" data-id="${st.id}">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <span class="num-dot ${m ? 'done' : ''}">${m ? icon('check', 'width="18" height="18"') : i + 1}</span>
          <div class="grow" style="flex:1;min-width:0">
            <div class="title" style="font-weight:600">${esc(st.text)}</div>
            <div class="small muted" style="margin-top:3px">
              <span class="badge primary">צפוי ${st.suds}</span>
              ${ds.length ? `<span class="badge">${ds.length} תרגולים</span> <span class="badge">אחרון: ${last.post.actual}</span>` : ''}
              ${m ? '<span class="badge good">הושג</span>' : ''}
            </div>
          </div>
        </div>
        ${st.id === current?.id ? `
        <div class="btn-row" style="margin-top:10px">
          <a class="btn primary" href="#/drive/new/${st.id}">${icon('car')} לתרגל</a>
          <button class="btn" data-act="edit">עריכה</button>
        </div>` : `
        <div style="display:flex;gap:4px;margin-top:4px;margin-inline-start:44px">
          <a class="btn ghost small-btn" href="#/drive/new/${st.id}">לתרגל</a>
          <button class="btn ghost small-btn" data-act="edit">עריכה</button>
        </div>`}
      </li>`;
  }).join('');

  return {
    html: `
      ${topbar('סולם החשיפה', { right: `<a class="icon-btn" href="#/drives" aria-label="יומן נסיעות">${icon('book')}</a>` })}
      <div class="card soft">
        <p>הצעדים ממוינים מהקל לקשה. מתחילים בצעד הראשון שלא הושג, חוזרים עליו כמה פעמים, ועולים שלב.</p>
        <p class="small muted">צעד מסומן "הושג" אחרי 3 תרגולים לפחות, כשבשניים האחרונים החרדה הייתה ${MASTERY_SUDS} או פחות. אפשר גם לסמן ידנית.</p>
      </div>
      ${steps.length ? `<div class="card"><ul class="list">${rows}</ul></div>` : `
        <div class="card">
          <h2>הסולם עדיין ריק</h2>
          <p>אפשר להתחיל מסולם לדוגמה ולערוך אותו לפי הכבישים שלך, או לבנות מאפס.</p>
          <button class="btn primary block" id="load-example">טעני סולם לדוגמה</button>
        </div>`}
      <div class="card" id="editor">
        <h2 id="ed-title">הוספת צעד</h2>
        <label class="field"><span>תיאור הצעד</span>
          <small>היכן, מתי, לבד או עם מלווה, כמה זמן</small>
          <textarea id="st-text" style="min-height:70px" placeholder="למשל: נהיגה בכביש 4 מהמחלף ליציאה הבאה, בצהריים, לבד"></textarea>
        </label>
        ${rangeField({ id: 'st-suds', label: 'כמה חרדה את מצפה להרגיש? (SUDS)', min: 0, max: 100, step: 5, value: 50, lo: '0', hi: '100' })}
        <label class="field" id="mastered-wrap" hidden style="display:flex;gap:10px;align-items:center">
          <input type="checkbox" id="st-mastered" style="width:22px;height:22px"> <span style="margin:0">סמני את הצעד כ"הושג"</span>
        </label>
        <div class="btn-row">
          <button class="btn primary" id="st-save">הוסיפי לסולם</button>
          <button class="btn" id="st-cancel" hidden>ביטול</button>
          <button class="btn danger" id="st-del" hidden>${icon('trash', 'width="18" height="18"')} מחיקה</button>
        </div>
      </div>
      <a class="btn block" href="#/drive/new/free">${icon('car')} תרגול נהיגה חופשי (מחוץ לסולם)</a>`,
    mount(root) {
      const ex = $('#load-example', root);
      if (ex) ex.onclick = () => {
        store.update(st => { st.ladder = EXAMPLE_LADDER.map(e => ({ id: uid(), text: e.text, suds: e.suds, createdAt: new Date().toISOString() })); });
        toast('הסולם נטען. ערכי אותו לפי הכבישים שלך');
        go('#/ladder');
      };

      const resetEditor = () => {
        editing = null;
        $('#ed-title').textContent = 'הוספת צעד';
        $('#st-text').value = '';
        setRange(50);
        $('#st-save').textContent = 'הוסיפי לסולם';
        $('#st-cancel').hidden = $('#st-del').hidden = $('#mastered-wrap').hidden = true;
      };
      const setRange = v => { $('#st-suds').value = v; $('#st-suds').dispatchEvent(new Event('input')); };

      $$('[data-act=edit]', root).forEach(b => b.onclick = () => {
        const id = b.closest('[data-id]').dataset.id;
        const st = store.get().ladder.find(x => x.id === id);
        editing = id;
        $('#ed-title').textContent = 'עריכת צעד';
        $('#st-text').value = st.text;
        setRange(st.suds);
        $('#st-mastered').checked = !!st.mastered;
        $('#st-save').textContent = 'שמרי';
        $('#st-cancel').hidden = $('#st-del').hidden = $('#mastered-wrap').hidden = false;
        $('#editor').scrollIntoView({ behavior: 'smooth' });
      });

      $('#st-cancel', root).onclick = resetEditor;
      $('#st-del', root).onclick = () => {
        if (!confirm('למחוק את הצעד? התרגולים שתיעדת יישארו ביומן הנסיעות.')) return;
        store.update(st => { st.ladder = st.ladder.filter(x => x.id !== editing); });
        go('#/ladder');
      };
      $('#st-save', root).onclick = () => {
        const text = val('st-text').trim();
        if (!text) { toast('נא לתאר את הצעד'); return; }
        const suds = num('st-suds');
        store.update(st => {
          if (editing) {
            const x = st.ladder.find(y => y.id === editing);
            Object.assign(x, { text, suds, mastered: $('#st-mastered').checked });
          } else {
            st.ladder.push({ id: uid(), text, suds, createdAt: new Date().toISOString() });
          }
        });
        toast(editing ? 'נשמר' : 'הצעד נוסף');
        go('#/ladder');
      };
    },
  };
}

// ---------- before a drive ----------
export function renderDriveNew({ step }) {
  const s = store.get();
  const st = s.ladder.find(x => x.id === step);
  const free = !st;
  const opts = safetyOptions(s);
  return {
    html: `
      ${topbar('לפני הנסיעה', { back: '#/ladder' })}
      <div class="card soft">
        <div class="eyebrow">${free ? 'תרגול חופשי' : 'הצעד בסולם'}</div>
        ${free ? `<label class="field" style="margin:0"><span>מה את מתכננת?</span>
            <input type="text" id="dv-text" placeholder="למשל: נסיעה לעבודה בכביש 2"></label>`
          : `<h2>${esc(st.text)}</h2>`}
      </div>
      <div class="card">
        <p class="muted">רגע לפני שיוצאים: מה הפחד צופה? אחרי הנסיעה נבדוק את זה מול המציאות.</p>
        ${rangeField({ id: 'dv-exp', label: 'כמה חרדה את מצפה להרגיש בשיא? (0–100)', min: 0, max: 100, step: 5, value: st ? st.suds : 50, lo: '0', hi: '100' })}
        <label class="field"><span>ממה את הכי חוששת שיקרה?</span>
          <textarea id="dv-fear" style="min-height:70px" placeholder="למשל: אקבל התקף ולא אוכל להמשיך לנהוג"></textarea>
        </label>
        ${rangeField({ id: 'dv-like', label: 'מה הסיכוי שזה יקרה, לדעתך? (%)', min: 0, max: 100, step: 5, value: 50, lo: '0%', hi: '100%' })}
        <label class="field"><span>על אילו התנהגויות ביטחון את מוותרת הפעם?</span>
          <small>מספיקה אחת</small>
          ${chipsField('drop', opts)}
        </label>
      </div>
      <button class="btn primary block" id="dv-go">${icon('car')} שמרי – אני יוצאת לדרך</button>`,
    mount(root) {
      bindChips(root);
      $('#dv-go', root).onclick = () => {
        const stepText = free ? val('dv-text').trim() || 'תרגול חופשי' : st.text;
        const d = {
          id: uid(),
          stepId: free ? null : st.id,
          stepText,
          plannedAt: new Date().toISOString(),
          pre: { expected: num('dv-exp'), fear: val('dv-fear').trim(), likelihood: num('dv-like'), drop: readChips('drop', root) },
          post: null,
        };
        store.update(x => { x.drives.push(d); });
        go(`#/drive/${d.id}?fresh=1`);
      };
    },
  };
}

// ---------- after a drive / details ----------
export function renderDrive({ id, query }) {
  const s = store.get();
  const d = s.drives.find(x => x.id === id);
  if (!d) { setTimeout(() => go('#/drives')); return { html: '' }; }

  if (!d.post && query.fresh) {
    return {
      html: `
        ${topbar('נסיעה טובה', { back: '#/ladder' })}
        <div class="card good">
          <h2>את יוצאת לדרך, ${esc(s.name)}</h2>
          <p>זכרי: המטרה היא לא שלא תפחדי – אלא להישאר ולגלות מה קורה באמת.</p>
          <p><b>נ־ש־מ־י:</b> נשימה · שם ("זו חרדה") · מגע (ידיים על ההגה) · ימינה בבטחה.</p>
        </div>
        <div class="card accent">
          <p style="margin:0"><b>הטלפון בתושבת, ולא נוגעים בו בנסיעה.</b> אם רוצים ליווי קולי – מפעילים SOS עכשיו, לפני שזזים.</p>
        </div>
        <a class="sos-btn" href="#/sos">${icon('wave')} הפעילי SOS לפני הנסיעה</a>
        <a class="btn block" href="#/drive/${d.id}">חזרתי – לתיעוד אחרי הנסיעה</a>`,
    };
  }

  if (!d.post) {
    const opts = [...new Set([...safetyOptions(s), ...d.pre.drop])];
    return {
      html: `
        ${topbar('אחרי הנסיעה', { back: '#/ladder' })}
        <div class="card soft">
          <div class="eyebrow">${fmtDate(d.plannedAt, true)}</div>
          <h2>${esc(d.stepText)}</h2>
        </div>
        <div class="card">
          <label class="field"><span>יצאת לנסיעה?</span>
            <div class="seg" id="went"><button type="button" aria-pressed="true" data-v="yes">כן</button><button type="button" aria-pressed="false" data-v="no">לא הפעם</button></div>
          </label>
          <div id="went-yes">
            ${rangeField({ id: 'ps-act', label: 'כמה חרדה הרגשת בשיא, בפועל? (0–100)', min: 0, max: 100, step: 5, value: d.pre.expected, lo: '0', hi: '100' })}
            ${d.pre.fear ? `<label class="field"><span>חששת ש: "${esc(d.pre.fear)}". זה קרה?</span>
              <div class="seg" id="happened"><button type="button" aria-pressed="false" data-v="no">לא</button><button type="button" aria-pressed="false" data-v="partly">חלקית</button><button type="button" aria-pressed="false" data-v="yes">כן</button></div>
            </label>` : ''}
            <label class="field"><span>כמה דקות נסעת? (לא חובה)</span>
              <input type="number" id="ps-min" inputmode="numeric" min="0" max="600">
            </label>
            <label class="field"><span>באילו התנהגויות ביטחון השתמשת בכל זאת?</span>
              ${chipsField('used', opts)}
            </label>
            <label class="field"><span>מה למדת מהנסיעה?</span>
              <textarea id="ps-learn" placeholder="למשל: החרדה עלתה בהשתלבות וירדה אחרי כמה דקות. הצלחתי להמשיך."></textarea>
            </label>
          </div>
          <div id="went-no" hidden>
            <p>זה בסדר. כדאי לכתוב מה עצר אותך – זה מידע חשוב, לא כישלון. אולי הצעד גדול מדי כרגע, ואפשר לחלק אותו לצעד קטן יותר.</p>
            <label class="field"><span>מה עצר אותך?</span><textarea id="ps-why"></textarea></label>
          </div>
        </div>
        <button class="btn primary block" id="ps-save">שמרי</button>`,
      mount(root) {
        bindChips(root);
        $$('.seg', root).forEach(seg => seg.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return;
          $$('button', seg).forEach(x => x.setAttribute('aria-pressed', x === b));
          if (seg.id === 'went') {
            $('#went-yes', root).hidden = b.dataset.v !== 'yes';
            $('#went-no', root).hidden = b.dataset.v !== 'no';
          }
        }));
        $('#ps-save', root).onclick = () => {
          const went = $('#went [aria-pressed=true]', root).dataset.v === 'yes';
          if (!went) {
            store.update(x => {
              const dd = x.drives.find(y => y.id === id);
              dd.post = { date: new Date().toISOString(), skipped: true, why: val('ps-why').trim() };
            });
            toast('נשמר. נסי שוב כשתרגישי מוכנה');
            go('#/ladder');
            return;
          }
          const h = $('#happened [aria-pressed=true]', root);
          store.update(x => {
            const dd = x.drives.find(y => y.id === id);
            dd.post = {
              date: new Date().toISOString(),
              actual: num('ps-act'),
              happened: h ? h.dataset.v : null,
              minutes: num('ps-min') || null,
              used: readChips('used', root),
              learned: val('ps-learn').trim(),
            };
          });
          go(`#/drive/${id}`);
        };
      },
    };
  }

  return { html: `${topbar('תוצאות התרגול', { back: '#/drives' })}${resultHTML(s, d)}
    <div class="btn-row">
      ${d.stepId ? `<a class="btn primary" href="#/drive/new/${d.stepId}">לתרגל שוב</a>` : ''}
      <a class="btn" href="#/ladder">לסולם</a>
    </div>
    <button class="btn ghost block" id="del-drive" style="margin-top:8px">מחיקת התיעוד</button>`,
  mount(root) {
    $('#del-drive', root).onclick = () => {
      if (!confirm('למחוק את התיעוד של הנסיעה הזו?')) return;
      store.update(x => { x.drives = x.drives.filter(y => y.id !== id); });
      go('#/drives');
    };
  } };
}

function resultHTML(s, d) {
  if (d.post.skipped) {
    return `<div class="card"><div class="eyebrow">${fmtDate(d.plannedAt, true)}</div><h2>${esc(d.stepText)}</h2>
      <p>הנסיעה לא יצאה לפועל.${d.post.why ? ` מה עצר: ${esc(d.post.why)}` : ''}</p></div>`;
  }
  const exp = d.pre.expected, act = d.post.actual, diff = exp - act;
  let msg;
  if (diff >= 10) msg = `החרדה הייתה נמוכה ב-${diff} ממה שציפית. המוח לומד שהפחד מגזים בתחזיות שלו.`;
  else if (diff <= -10) msg = 'היה קשה יותר ממה שציפית – ועדיין עשית את זה. גם זה לימוד חשוב: את מסוגלת לשאת חרדה גבוהה.';
  else msg = 'החרדה הייתה בערך כמו שציפית – ונשארת בכל זאת. זה לימוד חשוב: את יכולה לנהוג גם כשאת מפחדת.';

  let fearMsg = '';
  if (d.pre.fear && d.post.happened) {
    if (d.post.happened === 'no') fearMsg = `חששת ש"${esc(d.pre.fear)}", והערכת שהסיכוי הוא ${d.pre.likelihood}%. <b>זה לא קרה.</b>`;
    else if (d.post.happened === 'partly') fearMsg = `חלק ממה שחששת ממנו קרה ("${esc(d.pre.fear)}"). שימי לב: איך התמודדת עם זה בפועל?`;
    else fearMsg = `מה שחששת ממנו קרה ("${esc(d.pre.fear)}") – ועברת את זה. מה זה מלמד אותך על היכולת שלך להתמודד?`;
  }
  const dropped = d.pre.drop.filter(x => !d.post.used.includes(x));
  const prevCount = s.drives.filter(x => x.post && !x.post.skipped && (d.stepId ? x.stepId === d.stepId : false)).length;

  return `
    <div class="card good pe">
      <div class="eyebrow">${esc(d.stepText)} · ${fmtDate(d.plannedAt, true)}</div>
      <p style="margin:6px 0">ציפית ל-<b>${exp}</b>, בפועל <b>${act}</b></p>
      ${diff > 0 ? `<span class="big"><bdi dir="ltr">−${diff}</bdi></span>` : ''}
      <p>${msg}</p>
    </div>
    ${fearMsg ? `<div class="card"><p style="margin:0">${fearMsg}</p></div>` : ''}
    ${dropped.length ? `<div class="card soft"><p style="margin:0">ויתרת על: <b>${dropped.map(esc).join(', ')}</b>. כל ויתור כזה מלמד את המוח שאת מסתדרת גם בלי.</p></div>` : ''}
    ${d.post.learned ? `<div class="card"><div class="eyebrow">מה למדת</div><p style="margin:0">${escBr(d.post.learned)}</p></div>` : ''}
    ${d.stepId && prevCount ? `<p class="small muted center">${prevCount === 1 ? 'זה התרגול הראשון שלך בצעד הזה. כדאי לחזור עליו עוד כמה פעמים בימים הקרובים.' : `עד עכשיו תרגלת את הצעד הזה ${prevCount} פעמים.`}</p>` : ''}`;
}

export function renderDrives() {
  const s = store.get();
  const list = [...s.drives].reverse();
  return {
    html: `
      ${topbar('יומן הנסיעות', { back: '#/ladder' })}
      ${list.length ? `<div class="card"><ul class="list">${list.map(d => `
        <li><a class="list-item" href="#/drive/${d.id}">
          <div class="grow">
            <div class="title">${esc(d.stepText)}</div>
            <div class="small muted">${fmtDate(d.plannedAt, true)}</div>
          </div>
          ${!d.post ? '<span class="badge accent">פתוח</span>'
            : d.post.skipped ? '<span class="badge">לא יצא</span>'
              : `<span class="badge primary">${d.pre.expected} ← ${d.post.actual}</span>`}
          <span class="chev">${icon('chev', 'width="18" height="18"')}</span>
        </a></li>`).join('')}</ul></div>
        <p class="small muted center">המספרים: חרדה צפויה ← חרדה בפועל</p>`
        : '<div class="card"><p class="muted">עדיין אין נסיעות מתועדות. בחרי צעד בסולם ולחצי "לתרגל".</p></div>'}`,
  };
}

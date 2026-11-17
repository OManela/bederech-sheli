import { store, uid } from '../store.js';
import { $, esc, escBr, icon, topbar, toast, go, fmtDate, rangeField, num, daysSince } from '../ui.js';
import { MODULES } from '../content/modules.js';
import { lineChart, barChart, axisDate } from '../charts.js';
import { completedDrives, isMastered, sortedLadder } from './ladder.js';

const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function weeklyCounts(drives, weeks = 8) {
  const counts = Array(weeks).fill(0);
  drives.forEach(d => {
    const w = Math.floor(daysSince(d.post.date) / 7);
    if (w < weeks) counts[weeks - 1 - w]++;
  });
  return counts;
}

export function renderProgress() {
  const s = store.get();
  const checks = [...s.checkins].sort((a, b) => a.date.localeCompare(b.date));
  const drives = completedDrives(s).sort((a, b) => a.plannedAt.localeCompare(b.plannedAt));
  const first = checks[0], last = checks[checks.length - 1];
  const modulesDone = MODULES.filter(m => s.modules[m.id]?.done).length;
  const mastered = s.ladder.filter(st => isMastered(s, st)).length;
  const avgPE = drives.length ? Math.round(drives.reduce((a, d) => a + (d.pre.expected - d.post.actual), 0) / drives.length) : null;
  const recentDrives = drives.slice(-12);

  const c1 = css('--chart-1'), c2 = css('--chart-2');

  return {
    html: `
      ${topbar('ההתקדמות שלי')}
      <div class="btn-row" style="margin-bottom:14px">
        <a class="btn primary" href="#/checkin">בדיקה שבועית</a>
        <a class="btn" href="#/summary">סיכום לשיתוף</a>
      </div>
      <div class="card">
        <div class="stats">
          <div class="stat"><b>${modulesDone}/${MODULES.length}</b><span>שלבים</span></div>
          <div class="stat"><b>${drives.length}</b><span>תרגולי נהיגה</span></div>
          <div class="stat"><b>${mastered}/${s.ladder.length}</b><span>צעדים שהושגו</span></div>
        </div>
      </div>

      <div class="card">
        <h2>פחד והימנעות</h2>
        ${checks.length >= 2 ? `
          ${lineChart({
            labels: checks.map(c => axisDate(c.date)),
            series: [
              { values: checks.map(c => c.fear), color: c1, label: 'פחד' },
              { values: checks.map(c => c.avoid), color: c2, label: 'הימנעות', dashed: true },
            ],
            max: 10, ticks: [0, 5, 10],
          })}
          <p class="small" style="margin-top:8px">מאז ההתחלה: פחד ${first.fear} ← ${last.fear}, הימנעות ${first.avoid} ← ${last.avoid}.</p>`
          : '<p class="muted">הגרף יופיע אחרי הבדיקה השבועית הראשונה (בנוסף לנקודת ההתחלה).</p>'}
      </div>

      <div class="card">
        <h2>ציפייה מול מציאות</h2>
        ${recentDrives.length ? `
          ${lineChart({
            labels: recentDrives.map(d => axisDate(d.plannedAt)),
            series: [
              { values: recentDrives.map(d => d.pre.expected), color: c2, label: 'חרדה צפויה', dashed: true },
              { values: recentDrives.map(d => d.post.actual), color: c1, label: 'חרדה בפועל' },
            ],
            max: 100, ticks: [0, 50, 100],
          })}
          ${avgPE != null ? `<p class="small" style="margin-top:8px">${avgPE > 0 ? `בממוצע, החרדה בפועל הייתה נמוכה ב-<b>${avgPE}</b> ממה שציפית.` : 'שימי לב לפער בין הציפייה למציאות בכל תרגול.'}</p>` : ''}`
          : '<p class="muted">אחרי התרגולים הראשונים בסולם יופיע כאן הפער בין מה שציפית למה שקרה.</p>'}
      </div>

      <div class="card">
        <h2>תרגולים בשבוע</h2>
        ${barChart({
          labels: ['לפני 7 שב׳', '', '', '', '', '', '', 'השבוע'],
          series: [{ values: weeklyCounts(drives), color: c1, label: 'נסיעות תרגול' }],
        })}
      </div>

      ${s.thoughts.length ? `<div class="card">
        <h2>יומן המחשבות</h2>
        <p style="margin:0">${s.thoughts.length === 1 ? 'רשומה אחת' : `${s.thoughts.length} רשומות`}. בממוצע, האמונה במחשבה המפחידה ירדה ב-<b>${Math.round(s.thoughts.reduce((a, t) => a + (t.beliefBefore - (t.beliefAfter ?? t.beliefBefore)), 0) / s.thoughts.length)}</b> נקודות אחרי הבדיקה.</p>
      </div>` : ''}`,
  };
}

export function renderCheckin() {
  return {
    html: `
      ${topbar('בדיקה שבועית', { back: '#/progress' })}
      <p class="muted">על השבוע האחרון. אין תשובות נכונות.</p>
      <div class="card" id="ck">
        ${rangeField({ id: 'ck-fear', label: 'כמה פחד הרגשת השבוע מנהיגה בכבישים רחבים?', value: 5, lo: '0 – בכלל לא', hi: '10 – פחד עצום' })}
        ${rangeField({ id: 'ck-avoid', label: 'כמה נמנעת מנסיעה בכבישים כאלה?', value: 5, lo: '0 – בכלל לא', hi: '10 – לגמרי' })}
        <label class="field"><span>כמה פעמים נהגת השבוע בכביש רחב?</span>
          <input type="number" id="ck-drives" inputmode="numeric" min="0" max="100" value="0"></label>
        <label class="field"><span>כמה התקפי חרדה היו לך השבוע (בכלל, לא רק בנהיגה)?</span>
          <input type="number" id="ck-panics" inputmode="numeric" min="0" max="100" value="0"></label>
        ${rangeField({ id: 'ck-mood', label: 'איך מצב הרוח הכללי שלך השבוע?', value: 6, lo: '0 – רע מאוד', hi: '10 – טוב מאוד' })}
      </div>
      <button class="btn primary block" id="ck-save">שמרי</button>`,
    mount(root) {
      $('#ck-save', root).onclick = () => {
        const rec = {
          id: uid(), date: new Date().toISOString(),
          fear: num('ck-fear'), avoid: num('ck-avoid'),
          drives: Math.max(0, num('ck-drives') || 0), panics: Math.max(0, num('ck-panics') || 0),
          mood: num('ck-mood'),
        };
        store.update(s => { s.checkins.push(rec); });
        if (rec.mood <= 2) {
          root.innerHTML = `
            ${topbar('תודה ששיתפת')}
            <div class="card accent">
              <h2>נשמע שהשבוע היה קשה</h2>
              <p>מצב רוח ירוד כזה ראוי לתשומת לב. כדאי לספר על כך לפסיכולוגית שלך – גם לפני הפגישה הבאה, אם אפשר.</p>
              <p>אם את מרגישה מצוקה קשה, או שעולות מחשבות על פגיעה בעצמך – אל תישארי עם זה לבד:</p>
              <ul>
                <li>ער״ן – עזרה ראשונה נפשית, 24/7: <a href="tel:1201"><b>1201</b></a></li>
                <li>סה״ר – תמיכה בצ׳אט: <a href="https://sahar.org.il" target="_blank" rel="noopener">sahar.org.il</a></li>
                <li>במצב חירום: <a href="tel:101"><b>101</b></a></li>
              </ul>
            </div>
            <a class="btn block" href="#/">חזרה לבית</a>`;
          return;
        }
        toast('נשמר. תודה');
        go('#/progress');
      };
    },
  };
}

export function renderSummary() {
  const s = store.get();
  const drives = completedDrives(s);
  const checks = s.checkins;
  const first = checks[0], last = checks[checks.length - 1];
  const avgPE = drives.length ? Math.round(drives.reduce((a, d) => a + (d.pre.expected - d.post.actual), 0) / drives.length) : null;
  const learned = [...drives].reverse().filter(d => d.post.learned).slice(0, 5);
  const ladder = sortedLadder(s);
  const since = s.baseline?.date || s.createdAt;

  return {
    html: `
      ${topbar('סיכום לשיתוף', { back: '#/progress' })}
      <p class="muted no-print">אפשר להראות את המסך לפסיכולוגית שלך, לצלם אותו או להדפיס/לשמור כ-PDF. השיתוף הוא לבחירתך בלבד.</p>
      <div class="card">
        <h2>${esc(s.name)} – סיכום "בדרך שלי"</h2>
        <p class="small muted">מ-${fmtDate(since)} עד ${fmtDate(new Date().toISOString())}</p>
        <div class="kv"><span>שלבים שהושלמו</span><b>${MODULES.filter(m => s.modules[m.id]?.done).length} מתוך ${MODULES.length}</b></div>
        ${first && last ? `<div class="kv"><span>פחד (0–10)</span><b>${first.fear} ← ${last.fear}</b></div>
        <div class="kv"><span>הימנעות (0–10)</span><b>${first.avoid} ← ${last.avoid}</b></div>` : ''}
        <div class="kv"><span>תרגולי נהיגה מתועדים</span><b>${drives.length}</b></div>
        ${avgPE != null ? `<div class="kv"><span>פער ממוצע: צפוי מול בפועל</span><b><bdi dir="ltr">${avgPE > 0 ? '−' : avgPE < 0 ? '+' : ''}${Math.abs(avgPE)}</bdi></b></div>` : ''}
        <div class="kv"><span>רשומות ביומן המחשבות</span><b>${s.thoughts.length}</b></div>
        <div class="kv"><span>תרגולי חשיפה לתחושות / בדמיון</span><b>${s.interoceptive.length} / ${(s.imaginal || []).length}</b></div>
      </div>
      ${s.goals.length ? `<div class="card"><h3>מטרות</h3><ul style="margin:0;padding-inline-start:1.2em">${s.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>` : ''}
      ${ladder.length ? `<div class="card"><h3>סולם החשיפה</h3>${ladder.map(st => `
        <div class="kv"><span>${esc(st.text)}</span><b>${isMastered(s, st) ? '✓ הושג' : `${s.drives.filter(d => d.stepId === st.id && d.post && !d.post.skipped).length} תרגולים`}</b></div>`).join('')}</div>` : ''}
      ${learned.length ? `<div class="card"><h3>מה למדתי מהנסיעות</h3>${learned.map(d => `<p>• ${esc(d.post.learned)} <span class="small muted">(${fmtDate(d.plannedAt)})</span></p>`).join('')}</div>` : ''}
      ${s.safety.dropped.length ? `<div class="card"><h3>התנהגויות ביטחון שוויתרתי עליהן</h3><p style="margin:0">${s.safety.dropped.map(esc).join(' · ')}</p></div>` : ''}
      ${s.maintenance.plan ? `<div class="card"><h3>תוכנית תחזוקה</h3><p style="margin:0">${escBr(s.maintenance.plan)}</p></div>` : ''}
      <button class="btn block no-print" id="print">הדפסה / שמירה כ-PDF</button>`,
    mount(root) {
      $('#print', root).onclick = () => window.print();
    },
  };
}

import { store, uid, requestPersistence } from '../store.js';
import { $, esc, rangeField, num, go, toast } from '../ui.js';

const LOGO = `<svg viewBox="0 0 96 96" aria-hidden="true">
  <circle cx="48" cy="48" r="46" fill="var(--primary-soft)"/>
  <circle cx="66" cy="30" r="9" fill="var(--accent)"/>
  <path d="M40 22 L22 80 H74 L56 22 Z" fill="var(--primary)"/>
  <path d="M48 30v8M48 46v9M48 63v11" stroke="var(--primary-soft)" stroke-width="3.5" stroke-linecap="round"/>
</svg>`;

export function render() {
  const draft = { name: store.get().name || '', fear: 6, avoid: 6, freq: 'לעיתים רחוקות', goals: ['', '', ''] };
  let step = 0;
  const TOTAL = 5;

  const steps = [
    () => `
      <div class="welcome-hero">${LOGO}
        <h1>בדרך שלי</h1>
        <p class="muted">תוכנית אישית להתמודדות עם הפחד מנהיגה בכבישים רחבים</p>
      </div>
      <div class="card">
        <p>התוכנית מבוססת על <b>טיפול קוגניטיבי-התנהגותי (CBT)</b> – גישה שנמצאה במחקרים יעילה מאוד לחרדות, לפאניקה ולפחד מנהיגה.</p>
        <p>כאן תמצאי שלבי למידה קצרים, יומנים, סולם חשיפה הדרגתי, כלי נשימה ומצב SOS קולי לנסיעות.</p>
        <p class="small muted">כל מה שתכתבי נשמר רק בטלפון שלך. שום מידע לא נשלח לשום מקום.</p>
      </div>`,
    () => `
      <h1>איך לקרוא לך?</h1>
      <p class="muted">האפליקציה תפנה אלייך בשמך.</p>
      <label class="field"><span>השם שלך</span>
        <input type="text" id="ob-name" autocomplete="given-name" maxlength="30" value="${esc(draft.name)}" placeholder="השם שלך">
      </label>`,
    () => `
      <h1>שני דברים חשובים, ${esc(draft.name)}</h1>
      <div class="card accent">
        <h2>בטיחות בנהיגה</h2>
        <p>לעולם אל תסתכלי על המסך ואל תגעי בטלפון בזמן נהיגה. את מצב ה-SOS מפעילים <b>לפני</b> היציאה לדרך, והוא עובד בקול בלבד.</p>
      </div>
      <div class="card soft">
        <h2>האפליקציה והטיפול שלך</h2>
        <p>האפליקציה משלימה את הטיפול אצל הפסיכולוגית שלך ולא מחליפה אותו. כדאי לספר לה על מה שאת מתרגלת כאן.</p>
        <p class="small">במצוקה נפשית קשה: ער״ן <b>1201</b> (24/7). במצב חירום: <b>101</b>.</p>
      </div>`,
    () => `
      <h1>נקודת ההתחלה</h1>
      <p class="muted">אין תשובות נכונות. זה רק כדי שנוכל לראות את השינוי לאורך הדרך.</p>
      <div class="card">
        ${rangeField({ id: 'ob-fear', label: 'כמה פחד את מרגישה מנהיגה בכבישים רחבים?', value: draft.fear, lo: '0 – בכלל לא', hi: '10 – פחד עצום' })}
        ${rangeField({ id: 'ob-avoid', label: 'כמה את נמנעת מנסיעה בכבישים כאלה?', value: draft.avoid, lo: '0 – אף פעם', hi: '10 – תמיד' })}
        <label class="field"><span>כמה פעמים נהגת בכביש רחב בחודש האחרון?</span>
          <input type="number" id="ob-freq" inputmode="numeric" min="0" max="200" value="${esc(draft.freqNum ?? 0)}">
        </label>
      </div>`,
    () => `
      <h1>המטרות שלך</h1>
      <p class="muted">מה היית רוצה להצליח לעשות בעוד כמה חודשים? אפשר לכתוב עכשיו או אחר כך.</p>
      <div class="card">
        ${draft.goals.map((g, i) => `
          <label class="field"><span>מטרה ${i + 1}</span>
            <input type="text" class="ob-goal" data-i="${i}" value="${esc(g)}" placeholder="${['למשל: לנסוע לבד בכביש המהיר לעבודה', 'למשל: לעקוף משאית בנתיב השמאלי', 'למשל: לנסוע לבקר את המשפחה בעצמי'][i]}">
          </label>`).join('')}
      </div>`,
  ];

  function collect() {
    if (step === 1) draft.name = ($('#ob-name').value || '').trim();
    if (step === 3) {
      draft.fear = num('ob-fear');
      draft.avoid = num('ob-avoid');
      draft.freqNum = Math.max(0, num('ob-freq') || 0);
    }
    if (step === 4) document.querySelectorAll('.ob-goal').forEach(el => { draft.goals[+el.dataset.i] = el.value.trim(); });
  }

  function paint(root) {
    root.innerHTML = `
      <div class="steps-ind">${Array.from({ length: TOTAL }, (_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      ${steps[step]()}
      <div class="btn-row" style="margin-top:18px">
        ${step > 0 ? '<button class="btn" id="ob-back">חזרה</button>' : ''}
        <button class="btn primary" id="ob-next">${step === 0 ? 'בואי נתחיל' : step === TOTAL - 1 ? 'סיום' : 'המשך'}</button>
      </div>`;
    $('#ob-next', root).onclick = () => next(root);
    const back = $('#ob-back', root);
    if (back) back.onclick = () => { collect(); step--; paint(root); };
    const nameInput = $('#ob-name', root);
    if (nameInput) {
      nameInput.focus();
      nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') next(root); });
    }
  }

  function next(root) {
    collect();
    if (step === 1 && !draft.name) { toast('נא לכתוב שם'); return; }
    if (step < TOTAL - 1) { step++; paint(root); return; }
    finish();
  }

  function finish() {
    const now = new Date().toISOString();
    store.update(s => {
      s.name = draft.name;
      s.onboarded = true;
      s.goals = draft.goals.filter(Boolean);
      s.baseline = { fear: draft.fear, avoid: draft.avoid, drivesPerMonth: draft.freqNum || 0, date: now };
      s.checkins.push({ id: uid(), date: now, fear: draft.fear, avoid: draft.avoid, drives: null, panics: null, mood: null, baseline: true });
    });
    requestPersistence();
    go('#/');
  }

  return { html: '', mount: root => paint(root) };
}

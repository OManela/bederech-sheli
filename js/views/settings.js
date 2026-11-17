import { store } from '../store.js';
import { $, $$, esc, topbar, toast, go, download, DAY_NAMES, rangeField, num } from '../ui.js';
import { buildICS } from '../ics.js';
import { speakTest, voiceStatus } from '../audio.js';

export function render() {
  const s = store.get();
  const r = s.reminders;
  return {
    html: `
      ${topbar('הגדרות', { back: '#/' })}

      <div class="card">
        <h2>פרטים</h2>
        <label class="field"><span>השם שלך</span>
          <input type="text" id="st-name" maxlength="30" value="${esc(s.name)}"></label>
        <button class="btn block" id="st-name-save">שמרי</button>
      </div>

      <div class="card">
        <h2>תזכורות לתרגול</h2>
        <p class="small muted">התזכורות נשמרות כאירוע חוזר ביומן של האייפון, ולכן עובדות גם בלי אינטרנט.</p>
        <label class="field"><span>באילו ימים?</span>
          <div class="chips" id="st-days">${DAY_NAMES.map((d, i) => `<button type="button" class="chip" data-d="${i}" aria-pressed="${r.days.includes(i)}">${d}</button>`).join('')}</div>
        </label>
        <label class="field"><span>באיזו שעה?</span>
          <input type="time" id="st-time" value="${esc(r.time)}"></label>
        <button class="btn primary block" id="st-ics">הוסיפי ליומן</button>
        <details style="margin-top:10px">
          <summary class="small">איך זה עובד באייפון?</summary>
          <ol class="small" style="padding-inline-start:1.2em">
            <li>לחצי "הוסיפי ליומן". ייפתח מסך עם האירוע.</li>
            <li>לחצי "הוסף הכול" (Add All) ובחרי לוח שנה.</li>
            <li>זהו – תקבלי התראה בימים ובשעה שבחרת.</li>
            <li>אם הקובץ לא נפתח מתוך האפליקציה, פתחי את כתובת האפליקציה בספארי ונסי שוב משם.</li>
            <li>לשינוי: מחקי את האירוע הישן ביומן, והוסיפי חדש מכאן.</li>
          </ol>
        </details>
      </div>

      <div class="card">
        <h2>קול</h2>
        <p class="small" id="st-voice">בודקת…</p>
        ${rangeField({ id: 'st-rate', label: 'מהירות ההקראה', min: 0.6, max: 1.2, step: 0.05, value: s.settings.rate, lo: 'איטי', hi: 'מהיר' })}
        <button class="btn block" id="st-test">השמיעי דוגמה</button>
        <div class="callout" id="st-voice-help" hidden style="margin-top:12px">
          <b>הקול לא התחיל לדבר.</b> כדאי לבדוק:
          <ol style="margin:6px 0 0;padding-inline-start:1.2em">
            <li>מתג השקט בצד האייפון – כבוי (בלי פס כתום), והווליום מוגבר.</li>
            <li>באייפון: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית – שיש קול שהורד (למשל כרמית).</li>
            <li>לסגור את האפליקציה לגמרי (החלקה למעלה) ולפתוח שוב.</li>
            <li>לנסות אותו דבר מתוך ספארי, בכתובת של האפליקציה.</li>
          </ol>
          <p class="small muted" style="margin:6px 0 0">גם בלי קול, מצב SOS עובד עם צלילי נשימה.</p>
        </div>
      </div>

      <div class="card">
        <h2>גיבוי</h2>
        <p class="small muted">כל המידע שמור רק בטלפון הזה. מומלץ לשמור גיבוי מדי פעם (למשל ב-iCloud Drive), כדי לא לאבד אותו אם מחליפים טלפון.</p>
        <div class="btn-row">
          <button class="btn" id="st-export">שמירת גיבוי</button>
          <label class="btn" style="cursor:pointer">שחזור מגיבוי<input type="file" id="st-import" accept="application/json,.json" hidden></label>
        </div>
      </div>

      <div class="card">
        <h2>על האפליקציה ובטיחות</h2>
        <p class="small">"בדרך שלי" היא תוכנית לעזרה עצמית המבוססת על עקרונות הטיפול הקוגניטיבי-התנהגותי המקוון (ICBT) לחרדה ולפחד מנהיגה. היא משלימה את הטיפול אצל הפסיכולוגית שלך, ואינה תחליף לייעוץ מקצועי או רפואי.</p>
        <ul class="small" style="padding-inline-start:1.2em">
          <li>לעולם אין להשתמש במסך בזמן נהיגה.</li>
          <li>לפני תרגילי חשיפה לתחושות – התייעצות עם רופא/ה אם יש בעיה רפואית.</li>
          <li>במצוקה נפשית: ער״ן <a href="tel:1201">1201</a> · במצב חירום: <a href="tel:101">101</a>.</li>
        </ul>
      </div>

      <button class="btn danger block" id="st-reset">מחיקת כל המידע</button>`,
    mount(root) {
      $('#st-name-save', root).onclick = () => {
        const n = $('#st-name', root).value.trim();
        if (!n) { toast('נא לכתוב שם'); return; }
        store.update(x => { x.name = n; });
        toast('נשמר');
      };

      $$('#st-days .chip', root).forEach(c => c.onclick = () => c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'));
      $('#st-ics', root).onclick = () => {
        const days = $$('#st-days .chip[aria-pressed=true]', root).map(c => +c.dataset.d);
        const time = $('#st-time', root).value || '18:00';
        if (!days.length) { toast('בחרי לפחות יום אחד'); return; }
        store.update(x => { x.reminders = { days, time }; });
        const url = location.origin + location.pathname;
        download('bederech-sheli-reminders.ics', buildICS({ days, time, url: location.protocol.startsWith('http') ? url : '' }), 'text/calendar;charset=utf-8');
      };

      voiceStatus().then(v => {
        $('#st-voice', root).innerHTML = !v.supported ? 'הקראה קולית לא נתמכת בדפדפן הזה.'
          : v.hebrew ? `קול בעברית זמין${v.name ? `: ${esc(v.name)}` : ''}.`
            : v.unknown ? 'הדפדפן לא מציג את רשימת הקולות. לחצי "השמיעי דוגמה" כדי לבדוק.'
              : 'לא נמצא קול בעברית. באייפון: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית, והורידי קול (למשל כרמית).';
      });
      $('#st-rate', root).addEventListener('change', () => store.update(x => { x.settings.rate = num('st-rate'); }));
      const testBtn = $('#st-test', root), help = $('#st-voice-help', root);
      testBtn.onclick = () => {
        store.update(x => { x.settings.rate = num('st-rate'); });
        help.hidden = true;
        testBtn.textContent = 'מנסה להשמיע…';
        testBtn.disabled = true;
        speakTest(`שלום ${store.get().name}. נשימה איטית… ונשיפה ארוכה.`).then(r => {
          testBtn.disabled = false;
          testBtn.textContent = 'השמיעי דוגמה';
          if (r === 'failed') help.hidden = false;
        });
      };

      $('#st-export', root).onclick = () => {
        const d = new Date().toISOString().slice(0, 10);
        download(`bederech-sheli-backup-${d}.json`, store.exportJSON());
      };
      $('#st-import', root).onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        if (!confirm('השחזור יחליף את כל המידע הנוכחי במידע מהגיבוי. להמשיך?')) return;
        try {
          store.importJSON(await f.text());
          toast('המידע שוחזר');
          go('#/');
        } catch {
          toast('הקובץ לא תקין');
        }
      };

      $('#st-reset', root).onclick = () => {
        if (!confirm('למחוק את כל המידע? (שלבים, יומנים, סולם ונסיעות). מומלץ לשמור גיבוי קודם.')) return;
        if (!confirm('בטוחה? אי אפשר לבטל את המחיקה.')) return;
        store.reset();
        go('#/onboarding');
      };
    },
  };
}

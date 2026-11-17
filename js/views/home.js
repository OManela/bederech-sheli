import { store } from '../store.js';
import { esc, icon, greeting, daysSince, topbar } from '../ui.js';
import { MODULES, currentModule } from '../content/modules.js';
import { openDrive, nextLadderStep, isMastered, completedDrives } from './ladder.js';

export function render() {
  const s = store.get();
  const mod = currentModule(s);
  const doneCount = MODULES.filter(m => s.modules[m.id]?.done).length;
  const lastCheckin = s.checkins[s.checkins.length - 1];
  const checkinDue = daysSince(lastCheckin?.date) >= 7;
  const open = openDrive(s);
  const nextStep = nextLadderStep(s);
  const done = completedDrives(s);
  const drivesDone = done.length;
  const mastered = s.ladder.filter(st => isMastered(s, st)).length;
  const weekDrives = done.filter(d => daysSince(d.post.date) < 7).length;

  const cards = [];

  if (open) {
    cards.push(`
      <a class="card accent" href="#/drive/${open.id}" style="display:block;text-decoration:none;color:inherit">
        <div class="eyebrow">תרגול פתוח</div>
        <h2>חזרת? איך היה?</h2>
        <p>${esc(open.stepText)}</p>
        <span class="btn accent">לתיעוד אחרי הנסיעה</span>
      </a>`);
  }

  if (checkinDue) {
    cards.push(`
      <a class="card warn" href="#/checkin" style="display:block;text-decoration:none;color:inherit">
        <div class="eyebrow">בדיקה שבועית</div>
        <h2>דקה אחת בשבילך</h2>
        <p>כמה שאלות קצרות על השבוע, כדי לראות את השינוי לאורך זמן.</p>
      </a>`);
  }

  if (mod) {
    const idx = MODULES.indexOf(mod);
    cards.push(`
      <a class="card" href="#/lesson/${mod.id}" style="display:block;text-decoration:none;color:inherit">
        <div class="eyebrow">השלב הבא בתוכנית · ${idx + 1} מתוך ${MODULES.length}</div>
        <h2>${esc(mod.title)}</h2>
        <p class="muted">${esc(mod.subtitle)} · כ-${mod.minutes} דקות</p>
        <div class="bar"><i style="width:${(doneCount / MODULES.length) * 100}%"></i></div>
      </a>`);
  } else {
    cards.push(`
      <div class="card good">
        <div class="eyebrow">התוכנית הושלמה</div>
        <h2>סיימת את כל 8 השלבים</h2>
        <p>המשיכי לתרגל בסולם ולשמור על ההישגים. אפשר לחזור לכל שלב מתי שתרצי.</p>
      </div>`);
  }

  if (!open && nextStep) {
    cards.push(`
      <a class="card soft" href="#/drive/new/${nextStep.id}" style="display:block;text-decoration:none;color:inherit">
        <div class="eyebrow">התרגול הבא בסולם</div>
        <h2>${esc(nextStep.text)}</h2>
        <p class="muted">חרדה צפויה: ${nextStep.suds}</p>
        <span class="btn primary">${icon('car')} לתכנון התרגול</span>
      </a>`);
  }

  return {
    html: `
      ${topbar(`${greeting()}, ${esc(s.name)}`, { right: `<a class="icon-btn" href="#/settings" aria-label="הגדרות">${icon('gear')}</a>` })}
      <a class="sos-btn" href="#/sos">${icon('wave')} מצב SOS לנסיעה</a>
      ${cards.join('')}
      <div class="card">
        <div class="eyebrow">ההתקדמות שלך</div>
        <div class="stats">
          <div class="stat"><b>${doneCount}/${MODULES.length}</b><span>שלבים</span></div>
          <div class="stat"><b>${drivesDone}</b><span>תרגולי נהיגה</span></div>
          <div class="stat"><b>${mastered}</b><span>צעדים שהושגו</span></div>
        </div>
        ${weekDrives ? `<p class="small muted" style="margin-top:10px">השבוע תרגלת ${weekDrives === 1 ? 'נסיעה אחת' : `${weekDrives} נסיעות`}. כל הכבוד!</p>` : ''}
      </div>
      <div class="btn-row compact">
        <a class="btn" href="#/breathing">נשימה</a>
        <a class="btn" href="#/thought/new">יומן מחשבות</a>
        <a class="btn" href="#/coping">הכרטיס שלי</a>
      </div>`,
  };
}

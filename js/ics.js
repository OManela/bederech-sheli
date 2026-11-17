// Builds an iCalendar file with weekly recurring practice reminders.
// Imported into the iPhone Calendar, the alarms work offline, with no server.

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const enc = new TextEncoder();

/** RFC 5545 line folding at 75 octets, without splitting UTF-8 characters. */
function fold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length ? 74 : 75; // continuation lines start with a space
    if (bytes + b > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const escText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const pad = n => String(n).padStart(2, '0');
const fmtLocal = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const fmtUTC = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * days: array of 0..6 (0 = Sunday), time: "HH:MM", url: app address
 */
export function buildICS({ days, time, url }) {
  const [hh, mm] = time.split(':').map(Number);
  const now = new Date();
  // First occurrence: the next selected day at the chosen time.
  const start = new Date(now);
  start.setHours(hh, mm, 0, 0);
  for (let i = 0; i < 8; i++) {
    if (days.includes(start.getDay()) && start > now) break;
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start.getTime() + 20 * 60000);
  const sorted = [...days].sort();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//bederech-sheli//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:bederech-sheli-${sorted.join('')}-${pad(hh)}${pad(mm)}@local`,
    `DTSTAMP:${fmtUTC(now)}`,
    `DTSTART:${fmtLocal(start)}`,
    `DTEND:${fmtLocal(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${sorted.map(d => BYDAY[d]).join(',')}`,
    `SUMMARY:${escText('בדרך שלי – זמן לתרגל')}`,
    `DESCRIPTION:${escText('כמה דקות בשבילך: שלב בתוכנית, נשימה, יומן או צעד בסולם.' + (url ? '\n' + url : ''))}`,
    ...(url ? [`URL:${url}`] : []),
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escText('בדרך שלי – זמן לתרגל')}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

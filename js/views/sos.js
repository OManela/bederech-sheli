import { store, uid } from '../store.js';
import { $, esc, icon, topbar, toast, go, fmtDate, rangeField, num } from '../ui.js';
import { SOS_INTRO, SOS_LOOP, IMAGINAL, personalizeSegs } from '../content/scripts.js';
import { playScript, voiceStatus, keepAwake, breathTone, unlockAudio, wakeLockSupported } from '../audio.js';

// ---------- SOS while driving ----------
export function renderSOS() {
  let player = null, toneTimer = null, overlay = null;

  const stopAll = () => {
    if (player) { player.stop(); player = null; }
    clearTimeout(toneTimer);
    keepAwake(false);
    if (overlay) { overlay.remove(); overlay = null; }
  };

  return {
    html: `
      ${topbar('מצב SOS לנסיעה', { back: '#/tools' })}
      <div class="card accent">
        <h2>מפעילים לפני שזזים</h2>
        <ol style="margin:0;padding-inline-start:1.2em">
          <li>הגבירי את הווליום (או חברי לרמקול של הרכב).</li>
          <li>לחצי "התחילי" והניחי את הטלפון בתושבת.</li>
          <li>המסך יתעמעם, וקול שקט ילווה אותך מדי פעם.</li>
          <li><b>לא נוגעים בטלפון בזמן הנסיעה.</b> בסוף – נגיעה במסך מפסיקה.</li>
        </ol>
      </div>
      <div class="card" id="voice-card"><p class="muted small" style="margin:0">בודקת את הקול בעברית…</p></div>
      <button class="sos-btn" id="sos-start" style="min-height:84px;font-size:1.4rem">${icon('play')} התחילי</button>
      <p class="small muted center">המצב משלב נשימה איטית, קרקוע ותזכורות שהחרדה עולה ויורדת. ברבות הזמן, נסי גם נסיעות בלעדיו.</p>`,
    mount(root) {
      let hebrew = true;
      voiceStatus().then(v => {
        // If the browser doesn't list voices (some iOS home-screen apps), still try speaking; tones take over if it fails.
        hebrew = v.hebrew || v.unknown;
        $('#voice-card', root).innerHTML = v.unknown
          ? `<p class="small" style="margin:0">ההקראה תתחיל בקול בעברית. אם הקול לא יעבוד, המצב יעבור אוטומטית לצלילי נשימה (צליל עולה – שאיפה, יורד – נשיפה).</p>`
          : v.hebrew
          ? `<p class="small" style="margin:0">${icon('check', 'width="16" height="16" style="vertical-align:-3px;color:var(--good)"')} קול בעברית זמין${v.name ? ` (${esc(v.name)})` : ''}.${wakeLockSupported() ? '' : ' <span class="muted">המסך עלול לכבות – כדאי להאריך את זמן הנעילה האוטומטית בהגדרות האייפון.</span>'}</p>`
          : `<p class="small" style="margin:0"><b>לא נמצא קול בעברית במכשיר.</b> המצב יעבוד עם צלילי נשימה בלבד (צליל עולה – שאיפה, יורד – נשיפה). אפשר להוסיף קול: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית.</p>`;
      });

      $('#sos-start', root).onclick = () => {
        unlockAudio();
        keepAwake(true);
        overlay = document.createElement('div');
        overlay.className = 'sos-screen';
        overlay.innerHTML = `<div class="pulse"></div><p>נשימה איטית. עיניים על הכביש.</p><p class="small" style="opacity:.45;margin-top:40px">נגיעה במסך – עצירה</p>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => { stopAll(); toast('מצב SOS הופסק. כל הכבוד'); });

        const tones = () => {
          const cycle = (kind) => {
            breathTone(kind, kind === 'in' ? 4 : 6);
            toneTimer = setTimeout(() => cycle(kind === 'in' ? 'out' : 'in'), (kind === 'in' ? 4 : 6) * 1000 + 300);
          };
          cycle('in');
        };
        if (hebrew) {
          const name = store.get().name;
          player = playScript(personalizeSegs(SOS_INTRO, name), {
            loop: personalizeSegs(SOS_LOOP, name),
            onFail: () => { player = null; if (overlay) tones(); },
          });
        } else {
          tones();
        }
      };
      return stopAll;
    },
  };
}

// ---------- imaginal exposure ----------
export function renderImaginalList() {
  const s = store.get();
  const hist = [...(s.imaginal || [])].reverse().slice(0, 12);
  return {
    html: `
      ${topbar('חשיפה בדמיון', { back: '#/tools' })}
      <div class="card accent"><p style="margin:0"><b>להאזנה בבית בלבד – לעולם לא בזמן נהיגה.</b> שבי בנוחות, ותני לחרדה לעלות בלי לברוח מהתמונה. המטרה היא להישאר, לא להירגע.</p></div>
      <div class="card"><ul class="list">${IMAGINAL.map(sc => {
        const n = (s.imaginal || []).filter(h => h.script === sc.id).length;
        return `<li><a class="list-item" href="#/imaginal/${sc.id}">
          <span class="num-dot">${icon('play', 'width="16" height="16"')}</span>
          <div class="grow"><div class="title">${sc.title}</div><div class="small muted">כ-${sc.minutes} דקות</div></div>
          ${n ? `<span class="badge">${n}×</span>` : ''}
          <span class="chev">${icon('chev', 'width="18" height="18"')}</span></a></li>`;
      }).join('')}</ul></div>
      ${hist.length ? `<div class="card"><h2>ההאזנות שלי</h2>${hist.map(h => {
        const sc = IMAGINAL.find(x => x.id === h.script);
        return `<div class="kv"><span>${sc ? sc.title : ''} <span class="small muted">${fmtDate(h.date)}</span></span><b>לפני ${h.before} · שיא ${h.peak} · סוף ${h.end}</b></div>`;
      }).join('')}</div>` : ''}
      <p class="small muted">מומלץ לחזור על אותה הקלטה כמה פעמים, עד שהחרדה בשיא יורדת בערך בחצי – ואז לעבור להקלטה הבאה, או לצעד המקביל בכביש.</p>`,
  };
}

export function renderImaginal({ id }) {
  const sc = IMAGINAL.find(x => x.id === id);
  if (!sc) { setTimeout(() => go('#/imaginal')); return { html: '' }; }
  let player = null;
  let before = 30;
  return {
    html: `
      ${topbar(sc.title, { back: '#/imaginal' })}
      <div id="im"></div>`,
    mount(root) {
      const box = $('#im', root);
      const stage1 = () => {
        box.innerHTML = `
          <div class="card">
            ${rangeField({ id: 'im-before', label: 'כמה חרדה את מרגישה עכשיו, לפני? (0–100)', min: 0, max: 100, step: 5, value: before })}
          </div>
          <button class="btn primary block" id="im-play">${icon('play')} התחילי להאזין</button>
          <p class="small muted center" style="margin-top:10px">ההקראה בקול מובנה של המכשיר. אפשר לעצום עיניים – הטקסט יוצג גם על המסך.</p>`;
        $('#im-play', box).onclick = () => { before = num('im-before'); stage2(); };
      };
      const stage2 = () => {
        keepAwake(true);
        box.innerHTML = `
          <div class="card" style="min-height:240px;display:flex;align-items:center;justify-content:center">
            <p id="im-cap" class="center" style="font-size:1.25rem;margin:0">…</p>
          </div>
          <div class="bar"><i id="im-bar" style="width:0"></i></div>
          <button class="btn block" id="im-stop" style="margin-top:14px">סיימתי / עצירה</button>`;
        const cap = $('#im-cap', box), bar = $('#im-bar', box);
        player = playScript(sc.segments, {
          onSegment: (i, text) => { cap.textContent = text; bar.style.width = `${((i + 1) / sc.segments.length) * 100}%`; },
          onEnd: () => stage3(),
          onFail: () => {
            cap.innerHTML = 'הקול לא התחיל לדבר. בדקי שמתג השקט כבוי והווליום מוגבר, ונסי שוב.<br><a href="#/settings">בדיקת הקול בהגדרות</a>';
          },
        });
        $('#im-stop', box).onclick = () => { player.stop(); stage3(); };
      };
      const stage3 = () => {
        keepAwake(false);
        player = null;
        box.innerHTML = `
          <div class="card">
            <h2>איך היה?</h2>
            ${rangeField({ id: 'im-peak', label: 'כמה חרדה הרגשת בשיא? (0–100)', min: 0, max: 100, step: 5, value: Math.min(100, before + 20) })}
            ${rangeField({ id: 'im-end', label: 'וכמה בסוף? (0–100)', min: 0, max: 100, step: 5, value: before })}
          </div>
          <button class="btn primary block" id="im-save">שמרי</button>`;
        $('#im-save', box).onclick = () => {
          const rec = { id: uid(), date: new Date().toISOString(), script: sc.id, before, peak: num('im-peak'), end: num('im-end') };
          store.update(x => { (x.imaginal = x.imaginal || []).push(rec); });
          toast(rec.end < rec.peak ? 'החרדה ירדה מהשיא בזמן שנשארת. זה בדיוק הלימוד' : 'נשמר. כל הכבוד שנשארת עד הסוף');
          go('#/imaginal');
        };
      };
      stage1();
      return () => { if (player) player.stop(); keepAwake(false); };
    },
  };
}

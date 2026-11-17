# בדרך שלי

אפליקציה אישית בעברית להתמודדות עם פחד מנהיגה בכבישים רחבים, המבוססת על עקרונות טיפול קוגניטיבי-התנהגותי מקוון (ICBT).
האפליקציה משלימה את הטיפול הפסיכולוגי ואינה מחליפה אותו.

## התקנה באייפון

1. פתחי את כתובת האפליקציה ב-**Safari** (לא בכרום).
2. לחצי על כפתור השיתוף (ריבוע עם חץ למעלה).
3. בחרי **"הוסף למסך הבית"** ולחצי "הוסף".
4. מעכשיו האפליקציה נפתחת מהאייקון שעל מסך הבית, במסך מלא, וגם בלי אינטרנט.

> כל המידע נשמר **רק בטלפון**. שום דבר לא נשלח לשרת. מומלץ לשמור גיבוי מדי פעם: הגדרות ← שמירת גיבוי.

## בדיקה ראשונה באייפון (רשימת בדיקה)

- [ ] האפליקציה נפתחת ממסך הבית, בלי שורת הכתובת של ספארי.
- [ ] **קול בעברית:** הגדרות באפליקציה ← "השמיעי דוגמה". אם אין קול, באייפון: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית, והורידי קול (למשל כרמית).
- [ ] **מצב SOS:** ברכב חונה, לחצי "התחילי", ובדקי שהקול נשמע ושהמסך לא כבה. אם המסך כבה: הגדרות האייפון ← תצוגה ובהירות ← נעילה אוטומטית ← זמן ארוך יותר.
- [ ] אם לא שומעים כלום: בדקי את הווליום, וגם את מתג השקט בצד הטלפון.
- [ ] **תזכורות:** הגדרות באפליקציה ← "הוסיפי ליומן" ← "הוסף הכול". אם הקובץ לא נפתח מהאפליקציה, פתחי את הכתובת בספארי ונסי משם.
- [ ] **מצב טיסה:** פתחי את האפליקציה במצב טיסה – היא צריכה לעבוד.

## מה יש בפנים

- **תוכנית של 8 שלבים:** הבנת החרדה, הגוף (נשימה וחשיפה לתחושות), מחשבות, התנהגויות ביטחון, סולם חשיפה, התקף בזמן נהיגה, ושמירה על ההישגים.
- **סולם חשיפה** אישי, עם **יומן נסיעות** לפני ואחרי ("ציפית ל-70, בפועל 45").
- **יומן מחשבות**, כרטיס התמודדות, נשימה איטית, קרקוע 5-4-3-2-1, ותוכניות אישיות.
- **מצב SOS קולי** לנסיעה (מפעילים לפני שזזים, בלי מגע במסך), וגם **חשיפה בדמיון** להאזנה בבית.
- **בדיקה שבועית**, גרפי התקדמות ו**סיכום לשיתוף** עם הפסיכולוגית (לבחירתה של המשתמשת).

---

## Developer notes (English)

A static PWA: plain HTML, CSS and ES modules, with no build step and no dependencies.

**Run locally:** `python -m http.server 5321` in this folder, then open http://localhost:5321.
On localhost the service worker is turned off so edits show immediately. Add `?sw=1` to test offline mode.

**Hosting:** the app needs HTTPS for the service worker and the home-screen install. Any static host works, for example GitHub Pages or Netlify. All paths are relative, so it can live in a subfolder.

**Updating:** after changing any file, bump `VERSION` in `sw.js`. The phone picks up the new version on the next launch; sometimes it takes a second launch.

| Path | Purpose |
|---|---|
| `js/content/modules.js` | All lesson text (Hebrew, feminine forms), thinking traps, interoceptive exercises, example ladder |
| `js/content/scripts.js` | SOS and imaginal-exposure voice scripts |
| `js/store.js` | State schema (versioned JSON in `localStorage`), backup export and import |
| `js/audio.js` | `speechSynthesis` (he-IL), Web Audio breathing tones, wake lock |
| `js/ics.js` | Weekly reminder `.ics` with VALARM (iOS web apps can't schedule notifications without a push server) |
| `js/views/*` | One module per screen; each returns `{ html, mount(root) → cleanup }` |
| `icons/` | App icons (180, 192 and 512 px) |

// Section 7 QA against the text read back from the finished Canva design (canva/canva-readback.txt)
const fs = require('fs');
const c = require('./copy.json');
const ids = Object.keys(c.emails);
const pages = fs.readFileSync(__dirname + '/canva/canva-readback.txt', 'utf8').split('|\n|\n').filter((s) => s.trim());
const CODES = ['NEWSLETTER10', 'PRETTY10', 'GIFT10', 'SPECIAL10', 'FAMILY10'];
const allowedCodes = { W: ['NEWSLETTER10'], AC3: ['PRETTY10'], AC4: ['PRETTY10'], BA3: ['GIFT10'], BA4: ['GIFT10'], PP2: ['SPECIAL10'], PP4: ['FAMILY10'] };
const SKIP = new Set(['file', 'flow', 'timing', 'subject', 'preview', 'url', 'section_url', 'needs_signoff', 'tiles', 'icon', 'dynamic_note', 'feed_note', 'reviews']);
const strs = (o, k, acc = []) => {
  if (SKIP.has(k)) return acc;
  if (typeof o === 'string') acc.push(o);
  else if (Array.isArray(o)) o.forEach((x) => strs(x, null, acc));
  else if (o && typeof o === 'object') Object.entries(o).forEach(([kk, v]) => strs(v, kk, acc));
  return acc;
};
let fails = 0;
if (pages.length !== 16) { console.log(`FAIL page count ${pages.length}`); fails++; }
pages.forEach((pg, i) => {
  const id = ids[i]; const e = c.emails[id]; const errs = [];
  const lines = pg.split('\n').map((l) => l.trim()).filter(Boolean);
  const req = strs(e);
  if (e.dynamic_note) req.push(c.shared.notes[e.dynamic_note]);
  if (e.feed_note) req.push(c.shared.notes[e.feed_note]);
  (e.reviews || []).forEach((r) => req.push(c.reviews[r].text, c.reviews[r].name, c.reviews[r].date));
  const allowed = new Set([...strs(e), ...strs(c.shared), ...Object.values(c.reviews).flatMap((r) => [r.text, r.name, r.date])]);
  for (const s of req) if (!lines.includes(s)) errs.push(`missing: "${s.slice(0, 50)}"`);
  for (const l of lines) if (!allowed.has(l)) errs.push(`not in copy.json: "${l.slice(0, 50)}"`);
  if (/[–—]|--/.test(pg)) errs.push('dash found');
  if (!lines.includes(c.shared.signoff)) errs.push('no "Sarah x"');
  const ok = allowedCodes[id] || allowedCodes[id[0]] || [];
  const bad = CODES.filter((k) => pg.includes(k) && !ok.includes(k));
  if (bad.length) errs.push(`wrong codes ${bad}`);
  if (errs.length) fails++;
  console.log(`${errs.length ? 'FAIL' : 'PASS'} page ${i + 1} ${id}${errs.length ? '\n  - ' + errs.join('\n  - ') : ''}`);
});
console.log(fails ? `${fails} failure(s)` : 'CANVA TEXT QA PASSED');
process.exit(fails ? 1 : 0);

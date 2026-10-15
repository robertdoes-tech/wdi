// Automated QA (spec section 7). Run after build.js and render.js. Exits 1 on any failure.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const c = require('./copy.json');

const CODES = ['NEWSLETTER10', 'PRETTY10', 'GIFT10', 'SPECIAL10', 'FAMILY10'];
const ALLOWED_CODES = (id) =>
  id.startsWith('W') ? ['NEWSLETTER10']
    : id === 'AC3' || id === 'AC4' ? ['PRETTY10']
    : id === 'BA3' || id === 'BA4' ? ['GIFT10']
    : id === 'PP2' ? ['SPECIAL10']
    : id === 'PP4' ? ['FAMILY10'] : [];
// Keys that are metadata, links or references, not rendered copy
const SKIP = new Set(['file', 'flow', 'timing', 'subject', 'preview', 'url', 'section_url', 'needs_signoff', 'tiles', 'icon', 'dynamic_note', 'feed_note', 'reviews']);
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function required(e) {
  const out = [];
  const walk = (v, k) => {
    if (SKIP.has(k)) return;
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, vv]) => walk(vv, kk));
  };
  walk(e);
  if (e.dynamic_note) out.push(c.shared.notes[e.dynamic_note]);
  if (e.feed_note) out.push(c.shared.notes[e.feed_note]);
  (e.reviews || []).forEach((r) => out.push(c.reviews[r].text, c.reviews[r].name, c.reviews[r].date));
  return out;
}
function allStrings(o, acc = []) {
  if (typeof o === 'string') acc.push(o);
  else if (Array.isArray(o)) o.forEach((x) => allStrings(x, acc));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => allStrings(x, acc));
  return acc;
}
const pngWidth = (f) => fs.readFileSync(f).readUInt32BE(16);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 600, height: 1000 } });
  const results = [];
  let fails = 0;
  for (const [id, e] of Object.entries(c.emails)) {
    const errs = [];
    await page.goto('file://' + path.join(__dirname, 'emails', `${id}.html`), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const d = await page.evaluate(() => {
      const root = document.querySelector('.email');
      const texts = [];
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const s = w.currentNode.nodeValue.replace(/\s+/g, ' ').trim(); if (s) texts.push(s); }
      const navy = [];
      for (const el of root.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.backgroundColor === 'rgb(30, 40, 67)' || /30,\s*40,\s*67/.test(cs.backgroundImage)) navy.push(el.tagName);
      }
      const dyn = [...root.querySelectorAll('[data-block="dynamic"]')].map((el) => ({ h: el.getBoundingClientRect().height, text: el.textContent }));
      const logo = [...root.querySelectorAll('img')].map((i) => i.getBoundingClientRect().width);
      // Top-level blocks with visible text, in order
      const order = [...root.querySelectorAll('[data-block]')].filter((el) => !el.parentElement.closest('[data-block]')).map((el) => el.dataset.block);
      // Text that spills outside its code box or button
      const spill = [];
      for (const box of root.querySelectorAll('[data-block="code"], .btn, .dyn, .topbar, .tile')) {
        const br = box.getBoundingClientRect();
        const tw = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        while (tw.nextNode()) {
          if (!tw.currentNode.nodeValue.trim()) continue;
          const rg = document.createRange(); rg.selectNodeContents(tw.currentNode);
          const r = rg.getBoundingClientRect();
          if (r.left < br.left - 1 || r.right > br.right + 1 || r.top < br.top - 1 || r.bottom > br.bottom + 1) spill.push(tw.currentNode.nodeValue.trim().slice(0, 30));
        }
      }
      return { texts, navy, dyn, logo, order, spill, full: root.textContent };
    });
    const allowed = new Set([...allStrings(e), ...allStrings(c.shared), ...Object.values(c.reviews).flatMap((r) => [r.text, r.name, r.date])].map(norm));
    // 1 dashes
    if (/[–—]|--/.test(d.full)) errs.push('dash found in rendered text');
    // 2 sign-off directly before footer
    const signIdx = d.order.lastIndexOf('signoff');
    if (signIdx < 0 || d.order[signIdx + 1] !== 'footer' || d.order[d.order.length - 1] !== 'footer') errs.push(`sign-off not directly before footer: ${d.order.join(' > ')}`);
    if (!d.texts.includes(c.shared.signoff)) errs.push('missing "Sarah x"');
    // 3 copy: every required string rendered; every rendered string comes from copy.json
    for (const s of required(e)) if (!d.texts.includes(norm(s))) errs.push(`missing copy: "${s.slice(0, 60)}"`);
    for (const s of d.texts) if (!allowed.has(s)) errs.push(`text not in copy.json: "${s.slice(0, 60)}"`);
    // 4 codes
    const found = CODES.filter((k) => d.full.includes(k));
    const bad = found.filter((k) => !ALLOWED_CODES(id).includes(k));
    if (bad.length) errs.push(`wrong code(s): ${bad.join(', ')}`);
    // 5 navy backgrounds
    if (d.navy.length) errs.push(`navy background on ${d.navy.length} element(s)`);
    // 6 export width
    const png = path.join(__dirname, 'exports', `${e.file}.png`);
    if (!fs.existsSync(png)) errs.push('export missing');
    else if (pngWidth(png) !== 1200) errs.push(`export width ${pngWidth(png)} != 1200`);
    // 7 dynamic blocks labelled and 500 to 700 px tall in export
    for (const b of d.dyn) {
      if (!b.text.includes(c.shared.labels.dynamic)) errs.push('dynamic block unlabelled');
      if (b.h * 2 < 500 || b.h * 2 > 700) errs.push(`dynamic block ${b.h * 2}px tall in export`);
    }
    // text overflow
    for (const sp of d.spill) errs.push(`text spills outside its box: "${sp}"`);
    // 10 logo
    for (const lw of d.logo) if (lw * 2 > 300) errs.push(`logo ${lw * 2}px wide in export`);
    results.push({ id, file: e.file, codes: found, dynamic_px: d.dyn.map((b) => b.h * 2), ok: !errs.length, errs });
    if (errs.length) fails++;
    console.log(`${errs.length ? 'FAIL' : 'PASS'} ${id}${errs.length ? '\n  - ' + errs.join('\n  - ') : ''}`);
  }
  // 8 reviews must match reviews.txt exactly
  const rtxt = fs.readFileSync(path.join(__dirname, 'reviews.txt'), 'utf8');
  for (const [k, r] of Object.entries(c.reviews)) {
    if (!rtxt.includes(r.text) || !rtxt.includes(`Name: ${r.name}`) || !rtxt.includes(`Date: ${r.date}`)) { fails++; console.log(`FAIL review ${k} differs from reviews.txt`); }
  }
  // 9 contact sheet
  if (!fs.existsSync(path.join(__dirname, 'exports', 'contact-sheet.png'))) { fails++; console.log('FAIL contact-sheet.png missing'); }
  fs.writeFileSync(path.join(__dirname, 'exports', 'qa-report.json'), JSON.stringify(results, null, 2));
  await browser.close();
  console.log(fails ? `\n${fails} failure(s)` : '\nALL CHECKS PASSED');
  process.exit(fails ? 1 : 0);
})();

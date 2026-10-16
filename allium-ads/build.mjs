// Allium static ads: fill each template from copy.json, render with headless
// Chromium, run QA, write PNGs and a contact sheet.
//
//   node build.mjs                  everything
//   node build.mjs --only=01,08     some ads
//   node build.mjs --sizes=1350     some sizes
//   node build.mjs --qa-only        copy QA only, no rendering
//
// Exits 1 if any QA check fails (the PNGs are still written so the failure
// can be seen, and failures are outlined in red on the contact sheet).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanCopy, scanText } from './qa/claims.mjs';
import { pageQa } from './qa/page-qa.mjs';
import { contactSheet } from './qa/contact-sheet.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SIZES = { 1350: [1080, 1350], 1080: [1080, 1080], 1920: [1080, 1920] };
const sizes = args.sizes ? String(args.sizes).split(',') : Object.keys(SIZES).sort((a, b) => (a === '1350' ? -1 : b === '1350' ? 1 : a - b));
const only = args.only ? String(args.only).split(',') : null;

const content = JSON.parse(fs.readFileSync(path.join(root, 'copy.json'), 'utf8'));
const bottles = JSON.parse(fs.readFileSync(path.join(root, 'assets/cut/bottles.json'), 'utf8'));
const G = content.global;

// ---------- copy QA (runs before anything renders) ----------
const copyErrors = scanCopy(content);
if (copyErrors.length) {
  console.error('\nCOPY QA FAILED');
  for (const e of copyErrors) console.error('  x', e);
  process.exit(1);
}
console.log('copy QA passed');
if (args['qa-only']) process.exit(0);

// ---------- tiny template filler ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const get = (o, p) => p.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
// "." is the current #each item, ".field" a field of it, anything else is a path from the root context
const val = (ctx, p) => (p === '.' ? ctx['.'] : p.startsWith('.') ? get(ctx['.'], p.slice(1)) : get(ctx, p));

function bottleHtml(asset, role) {
  const m = bottles[asset];
  if (!m) throw new Error(`unknown bottle asset ${asset}`);
  const probes = m.wordmarks.map(b => `<i class="wm-probe" style="left:${b.x * 100}%;top:${b.y * 100}%;width:${b.w * 100}%;height:${b.h * 100}%"></i>`).join('');
  return `<figure class="bottle b-${role}" data-asset="${asset}" style="aspect-ratio:${m.w}/${m.h}"><div class="glow"></div><div class="contact"></div><img src="assets/cut/${asset}.png" alt="">${probes}</figure>`;
}

const STAR = '<path d="M12 2.6l2.75 6.1 6.65.6-5.03 4.4 1.5 6.5L12 16.8l-5.87 3.4 1.5-6.5-5.03-4.4 6.65-.6z" fill="#fff"/>';
function trustpilotHtml() {
  const r = G.trustpilot.rating;
  const sq = i => {
    const fill = Math.max(0, Math.min(1, r - i));
    return `<svg viewBox="0 0 24 24"><rect width="24" height="24" fill="#dcdce6"/><rect width="${24 * fill}" height="24" fill="#00b67a"/>${STAR}</svg>`;
  };
  return `<div class="tp"><div class="tp-head"><svg viewBox="0 0 24 24"><path d="M12 1.5l2.9 7.1 7.6.5-5.9 4.9 1.9 7.4L12 17.3l-6.5 4.1 1.9-7.4-5.9-4.9 7.6-.5z" fill="#00b67a"/></svg>${esc(G.trustpilot.name)}</div><div class="tp-stars">${[0, 1, 2, 3, 4].map(sq).join('')}</div><div class="tp-text">${esc(G.trustpilot.text)}</div></div>`;
}

function fill(tpl, ctx) {
  tpl = tpl.replace(/{{#each ([\w.]+)}}([\s\S]*?){{\/each}}/g, (_, p, inner) =>
    (val(ctx, p) || []).map((item, i) => fill(inner, { ...ctx, '.': item, '@i': i + 1 })).join(''));
  tpl = tpl.replace(/{{#if ([\w.]+)}}([\s\S]*?){{\/if}}/g, (_, p, inner) => (val(ctx, p) ? fill(inner, ctx) : ''));
  tpl = tpl.replace(/{{bottle ([\w.]+) (\w+)}}/g, (_, p, role) => bottleHtml(val(ctx, p), role));
  tpl = tpl.replace(/{{trustpilot}}/g, trustpilotHtml);
  tpl = tpl.replace(/{{@i}}/g, () => ctx['@i']);
  tpl = tpl.replace(/{{([\w.]+)}}/g, (_, p) => {
    const v = val(ctx, p);
    if (v == null) throw new Error(`missing copy for {{${p}}}`);
    return esc(v);
  });
  return tpl;
}

function page(tplName, ctx) {
  const tpl = fs.readFileSync(path.join(root, 'templates', `${tplName}.html`), 'utf8');
  const body = fill(tpl, ctx);
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><base href="../../">
<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="components.css"></head>
<body data-cw="${ctx.cw}" data-size="${ctx.size}" data-product="${ctx.product}" data-ad="${ctx.id}"><div class="canvas">
${body}
<div class="grain"></div></div></body></html>`;
}

// ---------- jobs ----------
const jobs = [];
for (const ad of content.ads) {
  if (only && !only.includes(ad.id)) continue;
  for (const v of ad.variants) for (const cw of v.colourways) for (const size of sizes) {
    const name = `allium_ad${ad.id}_${v.product}_${cw}_${size}`;
    jobs.push({ name, ad, v, cw, size });
  }
}

const outDir = path.join(root, 'out');
const htmlDir = path.join(root, 'build', 'html');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(htmlDir, { recursive: true });

const exe = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars'] });
const report = [];
let failed = 0;
const t0 = Date.now();

for (const job of jobs) {
  const { name, ad, v, cw, size } = job;
  const [W, H] = SIZES[size];
  const ctx = { ...v, copy: v.copy, g: G, cw, size, id: ad.id };
  const htmlPath = path.join(htmlDir, `${name}.html`);
  fs.writeFileSync(htmlPath, page(ad.template, ctx));

  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  p.on('requestfailed', r => pageErrors.push(`failed to load ${r.url()}`));
  await p.goto('file://' + htmlPath);
  await p.evaluate(async () => {
    // load every face up front so a missing file fails QA even on ads that do not use it
    await Promise.all(['400 20px "EB Garamond"', 'italic 400 20px "EB Garamond"', '400 20px Roboto', '500 20px Roboto', '700 20px Montserrat'].map(f => document.fonts.load(f)));
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  });
  const res = await p.evaluate(pageQa, {
    size, legal: G.legal, bottles,
    source: v.copy.source || null,
    requireYear: v.copy.source && /YouGov/.test(v.copy.source) ? '2022' : null,
  });
  const errors = [...pageErrors, ...res.errors, ...scanText(res.text).map(e => `rendered text: ${e}`)];
  await p.screenshot({ path: path.join(outDir, `${name}.png`), clip: { x: 0, y: 0, width: W, height: H } });
  await p.close();

  if (errors.length) failed++;
  report.push({ name, ad: ad.id, product: v.product, colourway: cw, size, ok: !errors.length, errors, contrast: res.contrast });
  console.log(`${errors.length ? 'FAIL' : ' ok '} ${name}${errors.length ? '\n       ' + errors.join('\n       ') : ''}`);
}

const placeholders = Object.entries(bottles).filter(([, m]) => m.placeholder).map(([k]) => k);
fs.writeFileSync(path.join(root, 'build', 'qa-report.json'), JSON.stringify({ built: new Date().toISOString(), placeholders, failed, report }, null, 2));

if (!args['no-sheet'] && !only && !args.sizes) {
  await contactSheet(browser, { root, outDir, content, report, placeholders });
  console.log('contact sheet: out/allium_contact_sheet.png');
}
await browser.close();

console.log(`\n${jobs.length} renders in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${failed} failed QA`);
if (placeholders.length) console.warn(`WARNING placeholder bottle renders in use for: ${placeholders.join(', ')}. Drop the real files in /assets and run npm run assets.`);
process.exit(failed ? 1 : 0);

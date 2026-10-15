// Step 1: open the live portal, log in, and report which trade-account screens exist and work.
// Read-only apart from adding one item to the basket; it never submits an order.
//   node pipeline/audit.mjs <slug> [--write]   (--write saves the suggested `audit.confirmed` into the config)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadConfig, placeholderFields, chromeExe } from './lib/config.mjs';
import { Actor, CURSOR_SCRIPT, pageFlags } from './lib/actor.mjs';

const [slug, ...rest] = process.argv.slice(2);
const WRITE = rest.includes('--write');
const cfg = loadConfig(slug);

const missing = placeholderFields(cfg).filter(f => f !== 'logo_path');
if (missing.length) {
  console.log(`SKIP ${cfg.company_name}: still a placeholder (${missing.join(', ')}). Fill in configs/${cfg.slug}.json.`);
  process.exit(2);
}

const CHECKS = [
  { key: 'login', label: 'Login' },
  { key: 'pricing', label: 'Customer-specific pricing', link: /products|catalogue|catalog|shop|browse|range|price ?list/i, page: /your price|trade price|account price|your pricing|net price|discount|contract price/i, needs: /£\s?\d/ },
  { key: 'search_browse', label: 'Search / browse', link: /products|catalogue|catalog|shop|browse|range|categor/i, el: 'input[type=search], input[placeholder*=search i], input[aria-label*=search i]' },
  { key: 'basket', label: 'Basket', link: /basket|cart|trolley/i, button: /add to (basket|cart|order)|^add$/i },
  { key: 'delivery_collection', label: 'Delivery vs collection', page: /deliver(y)?[\s\S]{0,200}collect(ion)?|collect(ion)?[\s\S]{0,200}deliver(y)?/i },
  { key: 'submit_order', label: 'Submit order', button: /place order|submit order|confirm order|send order|complete order|checkout/i },
  { key: 'past_orders', label: 'Past orders', link: /order history|my orders|past orders|previous orders|^orders$|your orders/i },
  { key: 'reorder', label: 'One-click reorder', button: /re-?order|order again|repeat order|buy again/i },
  { key: 'invoices_balance', label: 'Invoices / account balance', link: /invoice|statement|account|balance/i, page: /invoice|statement|balance|credit limit|amount due|outstanding/i },
];

const dir = path.join(cfg.outDir, 'audit');
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: chromeExe() });
const ctx = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: 1 });
await ctx.addInitScript(CURSOR_SCRIPT(cfg.brand_colour || '#2B7FFF'));
const page = await ctx.newPage();
const consoleErrors = [], httpErrors = [];
page.on('console', m => m.type() === 'error' && consoleErrors.push(`${page.url()} — ${m.text().slice(0, 200)}`));
page.on('response', r => r.status() >= 400 && httpErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`));
const actor = new Actor(page, cfg, { log: console.log });
const results = Object.fromEntries(CHECKS.map(c => [c.key, { label: c.label, status: 'not found', notes: [], shots: [], flags: [] }]));
let shotN = 0;
async function shot(key, note) {
  const f = `${String(++shotN).padStart(2, '0')}-${key}.png`;
  await page.screenshot({ path: path.join(dir, f) });
  const r = results[key];
  r.shots.push(f);
  if (note) r.notes.push(note);
  r.flags.push(...(await pageFlags(page)));
  return f;
}
const set = (key, status, note) => { results[key].status = status; if (note) results[key].notes.push(note); };
const bodyText = () => page.evaluate(() => document.body.innerText);

async function findClickable(re, roles = ['link', 'button', 'tab', 'menuitem']) {
  for (const role of roles) {
    const loc = page.getByRole(role, { name: re });
    const n = await loc.count();
    for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible()) return loc.nth(i);
  }
  return null;
}
async function openVia(re, home) {
  if (home) await page.goto(home, { waitUntil: 'networkidle' }).catch(() => {});
  const el = await findClickable(re);
  if (!el) return null;
  const name = (await el.innerText().catch(() => '')).trim().split('\n')[0];
  await el.click({ timeout: 8000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
  return name || String(re);
}

// ---- login
console.log(`Auditing ${cfg.company_name} → ${cfg.live_url}`);
const res = await page.goto(cfg.live_url, { waitUntil: 'networkidle' }).catch(e => ({ status: () => `ERR ${e.message}` }));
await shot('login', `landing page HTTP ${res?.status?.()} at ${page.url()}`);
try {
  if (!(await page.locator('input[type=password]').count())) {
    const via = await openVia(/log ?in|sign ?in|trade login|account/i);
    if (via) results.login.notes.push(`opened login via "${via}"`);
  }
  await actor.login({ recorded: false });
  await page.waitForTimeout(1200);
  const stillLogin = await page.locator('input[type=password]').count();
  if (stillLogin) { set('login', 'broken', 'password field still showing after submit — login failed or selectors wrong'); }
  else set('login', 'works', `logged in, now at ${page.url()}`);
} catch (e) { set('login', 'broken', `login error: ${e.message.split('\n')[0]}`); }
const home = page.url();
await shot('login', 'first screen after login (thumbnail candidate)');

if (results.login.status === 'works') {
  const nav = await page.evaluate(() => [...document.querySelectorAll('a, button, [role=link], [role=tab]')]
    .filter(e => e.offsetParent).map(e => e.innerText.trim().replace(/\s+/g, ' ')).filter(t => t && t.length < 40));
  results.login.notes.push(`visible navigation: ${[...new Set(nav)].slice(0, 30).join(' | ')}`);

  // ---- catalogue: browse, search, pricing
  const via = await openVia(CHECKS[1].link, home);
  const text = await bodyText();
  const prices = (text.match(/£\s?\d[\d,]*\.?\d*/g) || []).slice(0, 6);
  if (via) set('search_browse', 'works', `catalogue opened via "${via}"`);
  if (prices.length) {
    const cue = text.match(CHECKS[1].page);
    set('pricing', cue ? 'works' : 'needs check', `prices shown (${prices.join(', ')})${cue ? `; customer-pricing cue "${cue[0]}"` : '; no "your price / trade price" wording found — confirm prices are per-customer'}`);
    await shot('pricing');
  }
  const catalogue = page.url();

  // ---- basket (adds one item, never submits)
  const add = await findClickable(CHECKS[3].button, ['button', 'link']);
  if (add) {
    await add.click().catch(() => {}); await page.waitForTimeout(1200);
    set('basket', 'works', 'added one item to basket');
  }

  // ---- search, using a word from the first product name unless the config names a term
  const search = page.locator(CHECKS[2].el).first();
  if (await search.count() && await search.isVisible()) {
    set('search_browse', 'works', 'search box present');
    const heading = await page.locator('main h2, main h3, h2, h3').first().innerText().catch(() => '');
    const term = cfg.audit_search_term || (heading.match(/[A-Za-z]{4,}/) || ['a'])[0];
    await search.fill(term); await search.press('Enter').catch(() => {});
    await page.waitForTimeout(1200);
    const hits = await page.getByText(new RegExp(term, 'i')).count();
    results.search_browse.notes.push(`searched "${term}" → ${hits} matching elements`);
    await shot('search_browse');
    await page.goto(catalogue, { waitUntil: 'networkidle' }).catch(() => {});
  } else await shot('search_browse');
  const bvia = await openVia(CHECKS[3].link);
  if (bvia) { set('basket', results.basket.status === 'works' ? 'works' : 'needs check', `basket opened via "${bvia}"`); }
  if (add || bvia) await shot('basket');
  const btext = await bodyText();
  const dc = btext.match(CHECKS[4].page);
  if (dc) { set('delivery_collection', 'works', `found "${dc[0].replace(/\s+/g, ' ').slice(0, 80)}"`); await shot('delivery_collection'); }
  const submit = await findClickable(CHECKS[5].button, ['button', 'link']);
  if (submit) {
    set('submit_order', 'needs check', `button "${(await submit.innerText()).trim()}" present (not clicked by the audit)`);
    const s2 = await findClickable(/checkout|continue/i, ['button', 'link']);
    if (s2 && /checkout/i.test(await s2.innerText())) {
      await s2.click().catch(() => {}); await page.waitForTimeout(1200);
      const t2 = await bodyText();
      const dc2 = t2.match(CHECKS[4].page);
      if (dc2 && results.delivery_collection.status !== 'works') set('delivery_collection', 'works', `found on checkout: "${dc2[0].replace(/\s+/g, ' ').slice(0, 80)}"`);
      await shot('submit_order', 'checkout page');
    } else await shot('submit_order');
  }

  // ---- past orders + reorder
  const ovia = await openVia(CHECKS[6].link, home);
  if (ovia) {
    const t = await bodyText();
    const empty = /no orders|haven't placed|nothing here/i.test(t);
    set('past_orders', empty ? 'needs check' : 'works', `opened via "${ovia}"${empty ? ' — list is empty' : ''}`);
    await shot('past_orders');
    const re = await findClickable(CHECKS[7].button, ['button', 'link']);
    if (re) { set('reorder', 'works', `"${(await re.innerText()).trim()}" button on orders page (not clicked)`); await re.hover().catch(() => {}); await shot('reorder'); }
  }
  if (results.reorder.status === 'not found') {
    await page.goto(home, { waitUntil: 'networkidle' }).catch(() => {});
    const re = await findClickable(CHECKS[7].button, ['button', 'link']);
    if (re) { set('reorder', 'works', `"${(await re.innerText()).trim()}" on home screen`); await shot('reorder'); }
  }

  // ---- invoices / balance
  const ivia = await openVia(/invoice|statement|balance/i, home) || await openVia(/my account|account/i, home);
  const itext = await bodyText();
  const ic = itext.match(CHECKS[8].page);
  if (ic) { set('invoices_balance', 'works', `opened via "${ivia || 'home'}", found "${ic[0]}"`); await shot('invoices_balance'); }
}
await browser.close();

// ---- report
const pageFlagsAll = Object.values(results).flatMap(r => r.flags);
const confirmed = Object.entries(results).filter(([, r]) => r.status === 'works').map(([k]) => k);
const needs = Object.entries(results).filter(([, r]) => r.status === 'needs check').map(([k]) => k);
const dropped = cfg.steps.map((s, i) => ({ s, line: cfg.script[i] }))
  .filter(({ s }) => (s.requires || []).some(r => !confirmed.includes(r)));
let md = `# Audit: ${cfg.company_name}\n\n${cfg.live_url} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n\n` +
  `Automated first pass. "needs check" means the screen is there but a person has to confirm it behaves (look at the screenshot).\n\n` +
  `| Screen | Status | Notes | Screenshots |\n|---|---|---|---|\n` +
  Object.values(results).map(r => `| ${r.label} | **${r.status}** | ${r.notes.join('<br>').replace(/\|/g, '/')} | ${r.shots.map(s => `[${s}](${s})`).join(' ')} |`).join('\n') +
  `\n\n## Red flags on screen\n\n${pageFlagsAll.length ? [...new Set(pageFlagsAll)].map(f => `- ${f}`).join('\n') : '- none found by text scan (still eyeball the screenshots)'}\n` +
  `\n## Console / HTTP errors\n\n${[...new Set([...httpErrors, ...consoleErrors])].slice(0, 25).map(e => `- ${e}`).join('\n') || '- none'}\n` +
  `\n## Effect on the video\n\nSteps dropped if the confirmed list below is approved as-is:\n\n${dropped.map(({ s, line }) => `- **${s.name}** (needs ${s.requires.filter(r => !confirmed.includes(r)).join(', ')}): "${line}"`).join('\n') || '- none'}\n` +
  (needs.length ? `\nCheck by hand before approving: ${needs.join(', ')}. Add them to \`confirmed\` if they're fine.\n` : '') +
  `\nPaste into \`configs/${cfg.slug}.json\` once reviewed (or rerun with \`--write\`), then set \`approved\` to true:\n\n\`\`\`json\n"audit": ${JSON.stringify({ approved: false, confirmed, dropped_steps: [] }, null, 2)}\n\`\`\`\n`;
fs.writeFileSync(path.join(dir, 'AUDIT.md'), md);
fs.writeFileSync(path.join(dir, 'audit.json'), JSON.stringify({ results, httpErrors, consoleErrors, confirmed }, null, 2));
if (WRITE) {
  const raw = JSON.parse(fs.readFileSync(cfg.configFile, 'utf8'));
  raw.audit = { ...(raw.audit || {}), approved: false, confirmed };
  fs.writeFileSync(cfg.configFile, JSON.stringify(raw, null, 2) + '\n');
}
console.log(md);
console.log(`\nReport: ${path.relative(process.cwd(), path.join(dir, 'AUDIT.md'))}`);

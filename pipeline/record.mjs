// Step 3: record each walkthrough step as its own clip, long enough for its voice line.
//   node pipeline/record.mjs <slug>          (--test skips the placeholder/audit gates, for the local test portal only)
// Needs the voiceover first (clip length comes from build/<slug>/vo/*.json) and an approved audit.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { loadConfig, activeSteps, placeholderFields, chromeExe } from './lib/config.mjs';
import { Actor, Screencast, CURSOR_SCRIPT, pageFlags, EDITOR_HOSTS } from './lib/actor.mjs';

const args = Object.fromEntries(process.argv.slice(3).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const cfg = loadConfig(process.argv[2]);
if (!args.test) {
  const missing = placeholderFields(cfg).filter(f => f !== 'logo_path');
  if (missing.length) { console.log(`SKIP ${cfg.company_name}: placeholder ${missing.join(', ')}`); process.exit(2); }
  if (!cfg.audit?.approved) { console.log(`STOP ${cfg.company_name}: audit not approved yet. Run audit.mjs, review AUDIT.md, set audit.approved=true.`); process.exit(3); }
}
// record_url: a stand-in to record instead of live_url (e.g. stills of the portal when the live site can't be reached)
if (cfg.record_url) { console.log(`Recording from stand-in ${cfg.record_url} (live site: ${cfg.live_url})`); cfg.live_url = cfg.record_url; }
const steps = activeSteps(cfg);
const clipDir = path.join(cfg.buildDir, 'clips');
const voDir = path.join(cfg.buildDir, 'vo');
fs.mkdirSync(clipDir, { recursive: true });
const id = s => `${String(s.index + 1).padStart(2, '0')}-${s.name}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: chromeExe(), args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const ctx = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: cfg.record_scale, locale: 'en-GB', timezoneId: 'Europe/London' });
await ctx.addInitScript(CURSOR_SCRIPT(cfg.brand_colour || '#2B7FFF'));
const page = await ctx.newPage();
const pageErrors = [];
page.on('response', r => r.status() >= 400 && r.request().resourceType() === 'document' && pageErrors.push(`${r.status()} ${r.url()}`));
const actor = new Actor(page, cfg, { log: console.log });
await page.goto(cfg.live_url, { waitUntil: 'networkidle' });

// thumbnail background: the portal's home screen without the drawn cursor
async function homeShot() {
  const hide = v => page.evaluate(v => { const c = document.getElementById('__dc'); if (c) c.style.visibility = v; }, v).catch(() => {});
  await hide('hidden');
  await page.screenshot({ path: path.join(cfg.buildDir, 'home.png'), scale: 'css' });
  await hide('visible');
}

for (const step of steps) {
  const vo = path.join(voDir, `${id(step)}.json`);
  if (!fs.existsSync(vo)) throw new Error(`no voiceover for ${id(step)} — run voice.py first`);
  const { duration } = JSON.parse(fs.readFileSync(vo, 'utf8'));
  const need = duration + cfg.timing.vo_lead + cfg.timing.vo_tail;
  console.log(`● ${id(step)}  (voice ${duration.toFixed(2)}s)`);

  if (step.start_url) await page.goto(actor.url(step.start_url), { waitUntil: 'networkidle' }).catch(() => {});
  await actor.run(step.setup || []);
  await sleep(400);

  const cast = new Screencast(page);
  const urls = new Set([page.url()]);
  const onNav = f => f === page.mainFrame() && urls.add(f.url());
  page.on('framenavigated', onNav);
  pageErrors.length = 0;
  await cast.start();
  actor.t0 = Date.now(); actor.events = [{ t: 0, type: 'cursor', x: actor.pos[0], y: actor.pos[1] }];
  await sleep(250);
  await actor.run(step.actions || []);
  if (step.zoom_target && !actor.events.some(e => e.type === 'focus')) {
    const loc = await actor.locate(step.zoom_target).catch(() => null);
    if (loc) { await actor.reveal(loc); actor.mark('focus', { box: await actor.box(loc), zoom: step.zoom ?? null, kind: 'hold' }); }
    else console.warn(`  ! zoom_target not found: ${step.zoom_target}`);
  }
  const acted = actor.now();
  // gentle idle drift so a long hold doesn't look frozen
  const holdUntil = Math.max(need, acted + (step.hold_ms ?? 900) / 1000);
  while (actor.now() < holdUntil - 0.05) {
    const left = holdUntil - actor.now();
    if (left > 1.6 && step.idle_drift !== false) {
      const [x, y] = actor.pos;
      await actor.moveTo(x + (actor.rand() - 0.5) * 60, y + (actor.rand() - 0.5) * 40);
      await sleep(Math.min(900, (left - 1) * 1000));
    } else await sleep(left * 1000);
  }
  const { t0, t1, frames } = await cast.stop();
  page.off('framenavigated', onNav);

  if (step.thumbnail) await homeShot();
  const flags = [...new Set([...(await pageFlags(page)), ...[...urls].filter(u => EDITOR_HOSTS.test(new URL(u).hostname)).map(u => `editor URL visited: ${u}`), ...pageErrors.map(e => `HTTP ${e}`)])];
  if (flags.length) console.warn(`  ! ${flags.join('\n  ! ')}`);

  // frames → constant-frame-rate clip
  const fdir = path.join(clipDir, `${id(step)}_frames`);
  fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir);
  if (!frames.length) throw new Error('screencast produced no frames');
  const list = [];
  frames.forEach((f, i) => {
    const name = `${String(i).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(fdir, name), Buffer.from(f.data, 'base64'));
    const next = i + 1 < frames.length ? frames[i + 1].t : t1;
    const start = i === 0 ? t0 : f.t;
    list.push(`file '${name}'`, `duration ${Math.max(0.001, (next - start) / 1000).toFixed(4)}`);
  });
  list.push(`file '${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  fs.writeFileSync(path.join(fdir, 'list.txt'), list.join('\n'));
  const W = cfg.viewport.width * cfg.record_scale, H = cfg.viewport.height * cfg.record_scale;
  const out = path.join(clipDir, `${id(step)}.mp4`);
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(fdir, 'list.txt'),
    '-vf', `fps=${cfg.fps},scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', out], { stdio: 'inherit' });
  if (ff.status) throw new Error('ffmpeg failed');
  fs.rmSync(fdir, { recursive: true, force: true });
  const gaps = frames.slice(1).map((f, i) => f.t - frames[i].t).sort((a, b) => a - b);
  const fpsMoving = gaps.length ? Math.round(1000 / gaps[Math.floor(gaps.length * 0.25)]) : 0;
  const meta = { step: step.name, capture_fps: fpsMoving, duration: (t1 - t0) / 1000, acted, frames: frames.length, viewport: cfg.viewport, scale: cfg.record_scale, events: actor.events, flags, urls: [...urls] };
  fs.writeFileSync(path.join(clipDir, `${id(step)}.json`), JSON.stringify(meta));
  console.log(`  → ${path.relative(process.cwd(), out)}  ${meta.duration.toFixed(2)}s, ${frames.length} frames, ~${fpsMoving}fps while moving`);
}
if (!fs.existsSync(path.join(cfg.buildDir, 'home.png'))) {
  await page.goto(cfg.live_url, { waitUntil: 'networkidle' }).catch(() => {});
  await homeShot();
}
await browser.close();

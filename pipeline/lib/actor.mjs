// Drives a live portal like a person would: a visible cursor that glides (eased, never jumps),
// human typing cadence, smooth scrolling, and a short pause after every action.
// Every move and zoom-worthy moment is logged so post can zoom/pan and reframe the square cut.
import { resolveSecret } from './config.mjs';

// Injected into every page: a drawn cursor (headless Chromium has none) that follows real
// mouse events, plus a click ripple. Position survives navigations via sessionStorage.
export const CURSOR_SCRIPT = (colour) => `(() => {
  if (window.__demoCursor) return; window.__demoCursor = true;
  const mount = () => {
    if (!document.body) return requestAnimationFrame(mount);
    const s = document.createElement('style');
    s.textContent = \`#__dc{position:fixed;left:0;top:0;width:34px;height:34px;z-index:2147483647;pointer-events:none;
      transform-origin:4px 3px;transition:transform .12s ease-out;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))}
      #__dc.down{transform:scale(.82)}
      .__dr{position:fixed;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;z-index:2147483646;pointer-events:none;
      border:4px solid ${colour};animation:__dr .55s ease-out forwards}
      @keyframes __dr{from{transform:scale(.2);opacity:.9}to{transform:scale(1.25);opacity:0}}\`;
    document.head.appendChild(s);
    const c = document.createElement('div'); c.id = '__dc';
    c.innerHTML = '<svg viewBox="0 0 34 34" width="34" height="34"><path d="M4 3 L4 27 L10.5 21 L14.8 30.5 L19 28.6 L14.8 19.4 L23.5 19.4 Z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    const place = (x, y) => { c.style.left = (x - 4) + 'px'; c.style.top = (y - 3) + 'px'; };
    const saved = JSON.parse(sessionStorage.getItem('__dcpos') || 'null') || [window.innerWidth * 0.62, window.innerHeight * 0.58];
    place(...saved);
    addEventListener('mousemove', e => { place(e.clientX, e.clientY); sessionStorage.setItem('__dcpos', JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener('mousedown', e => {
      c.classList.add('down');
      const r = document.createElement('div'); r.className = '__dr'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.appendChild(r); setTimeout(() => r.remove(), 700);
    }, true);
    addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  mount();
})();`;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Actor {
  constructor(page, cfg, { log = () => {} } = {}) {
    this.page = page; this.cfg = cfg; this.log = log;
    this.pause = cfg.timing.action_pause_ms;
    this.pos = [cfg.viewport.width * 0.62, cfg.viewport.height * 0.58];
    this.t0 = Date.now();
    this.events = [];   // { t, type, ... } relative to t0 (seconds)
    this.seed = 7;
  }
  now() { return (Date.now() - this.t0) / 1000; }
  rand() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  mark(type, extra = {}) { this.events.push({ t: this.now(), type, ...extra }); }

  url(u) { return new URL(u, this.cfg.live_url).toString(); }

  async locate(sel) {
    const loc = this.page.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout: 15000 });
    return loc;
  }

  async box(sel) {
    const loc = typeof sel === 'string' ? await this.locate(sel) : sel;
    const b = await loc.boundingBox();
    if (!b) throw new Error(`no bounding box for ${sel}`);
    return b;
  }

  async moveTo(x, y) {
    const [x0, y0] = this.pos;
    const dist = Math.hypot(x - x0, y - y0);
    if (dist < 2) return;
    const ms = Math.min(1000, Math.max(380, 280 + dist * 0.5));
    // slight arc, like a wrist, rather than a ruler-straight line
    const bow = Math.min(60, dist * 0.08) * (this.rand() > 0.5 ? 1 : -1);
    const nx = -(y - y0) / dist, ny = (x - x0) / dist;
    const start = Date.now();
    for (;;) {
      const k = Math.min(1, (Date.now() - start) / ms), e = ease(k), arc = Math.sin(Math.PI * e) * bow;
      const px = x0 + (x - x0) * e + nx * arc, py = y0 + (y - y0) * e + ny * arc;
      await this.page.mouse.move(px, py);
      this.events.push({ t: this.now(), type: 'cursor', x: px, y: py });
      if (k >= 1) break;
      await sleep(12);
    }
    this.pos = [x, y];
  }

  // Bring an element into view with a smooth wheel scroll instead of a jump.
  async reveal(loc) {
    const vh = this.cfg.viewport.height;
    for (let i = 0; i < 40; i++) {
      const b = await loc.boundingBox();
      if (!b) return;
      const mid = b.y + b.height / 2;
      if (mid > vh * 0.18 && mid < vh * 0.78) return;
      const delta = Math.max(-160, Math.min(160, mid - vh * 0.45));
      await this.page.mouse.wheel(0, delta);
      await sleep(28);
      const after = await loc.boundingBox();
      if (after && Math.abs(after.y - b.y) < 1) return;  // page can't scroll further
    }
  }

  async pointAt(sel, zoom) {
    const loc = typeof sel === 'string' ? await this.locate(sel) : sel;
    await this.reveal(loc);
    const b = await this.box(loc);
    if (zoom) this.mark('focus', { box: b, zoom: typeof zoom === 'number' ? zoom : null, kind: 'act' });
    const x = b.x + b.width * (0.42 + this.rand() * 0.16), y = b.y + b.height * (0.4 + this.rand() * 0.2);
    await this.moveTo(x, y);
    return loc;
  }

  async scroll(dy) {
    const steps = Math.max(6, Math.round(Math.abs(dy) / 40));
    for (let i = 0; i < steps; i++) {
      const k = ease((i + 1) / steps) - ease(i / steps);
      await this.page.mouse.wheel(0, dy * k);
      await sleep(22);
    }
  }

  async login({ recorded = true } = {}) {
    const L = this.cfg.login_selectors || {};
    const user = L.user || 'input[type=email], input[name*=user i], input[name*=email i], input[autocomplete=username], input[type=text]';
    const pass = L.password || 'input[type=password]';
    const submit = L.submit || 'button[type=submit], input[type=submit], button:has-text("Log in"), button:has-text("Sign in")';
    const u = resolveSecret(this.cfg.demo_login.user), p = resolveSecret(this.cfg.demo_login.password);
    if (!recorded) {
      await this.page.locator(user).first().fill(u);
      await this.page.locator(pass).first().fill(p);
      await Promise.all([this.page.waitForLoadState('networkidle').catch(() => {}), this.page.locator(submit).first().click()]);
      return;
    }
    await this.run([{ type: user, text: u }, { type: pass, text: p, secret: true }, { click: submit, zoom: true }]);
  }

  // The action DSL used by configs. See pipeline/README.md for the full list.
  async run(actions = []) {
    for (const a of actions) {
      this.log(`  · ${JSON.stringify(a.secret ? { ...a, text: '•••' } : a)}`);
      if (a.goto !== undefined) {
        await this.page.goto(this.url(a.goto), { waitUntil: 'networkidle' }).catch(() => {});
        // stills pages redraw on hashchange: wait until the new route is drawn, not the old one still on screen
        await this.page.waitForFunction(() => !('ready' in document.body.dataset) || document.body.dataset.ready === location.hash.replace('#/', ''),
          null, { timeout: 5000 }).catch(() => {});
      } else if (a.login) {
        await this.login({ recorded: a.login !== 'instant' });
      } else if (a.click) {
        const loc = await this.pointAt(a.click, a.zoom);
        await sleep(120);
        // click where the cursor is resting (it's already on the target), like a person would
        void loc;
        await this.page.mouse.click(...this.pos);
        await this.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      } else if (a.hover) {
        await this.pointAt(a.hover, a.zoom);
      } else if (a.type) {
        const loc = await this.pointAt(a.type, a.zoom);
        await this.page.mouse.click(...this.pos);
        if (a.clear !== false) await loc.fill('');
        // human cadence, but long strings (emails) are capped at ~1.3s so they don't outrun the voice line
        const per = Math.min(1, 1300 / (a.text.length * 75));
        for (const ch of a.text) { await this.page.keyboard.type(ch); await sleep((45 + this.rand() * 55) * per); }
      } else if (a.fill) {
        await (await this.locate(a.fill)).fill(a.text);
      } else if (a.press) {
        await this.page.keyboard.press(a.press);
        await this.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      } else if (a.select) {
        await this.pointAt(a.select, a.zoom);
        await (await this.locate(a.select)).selectOption(a.value);
      } else if (a.check) {
        const loc = await this.pointAt(a.check, a.zoom);
        await loc.check().catch(() => loc.click());
      } else if (a.scroll !== undefined) {
        await this.scroll(a.scroll);
      } else if (a.scroll_to) {
        await this.reveal(await this.locate(a.scroll_to));
      } else if (a.focus) {
        // zoom on something without touching it (e.g. a price)
        const loc = await this.locate(a.focus);
        await this.reveal(loc);
        this.mark('focus', { box: await this.box(loc), zoom: a.zoom ?? null, kind: 'hold' });
      } else if (a.wait !== undefined) {
        await sleep(a.wait); continue;
      } else if (a.wait_for) {
        await this.locate(a.wait_for); continue;
      } else if (a.eval) {
        await this.page.evaluate(a.eval); continue;
      } else {
        throw new Error(`unknown action ${JSON.stringify(a)}`);
      }
      await sleep(a.pause ?? this.pause);
    }
  }
}

// Records a step as its own clip using Chromium's screencast (full-quality JPEG frames
// with timestamps), so frame timing is exact and the clip can be re-timed to the voiceover.
export class Screencast {
  constructor(page) { this.page = page; this.frames = []; }
  async start() {
    this.cdp = await this.page.context().newCDPSession(this.page);
    const vp = this.page.viewportSize();
    this.cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
      this.frames.push({ t: Date.now(), data });
      await this.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    this.t0 = Date.now();
    const scale = (await this.page.evaluate(() => devicePixelRatio)) || 1;
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: vp.width * scale, maxHeight: vp.height * scale, everyNthFrame: 1 });
  }
  async stop() {
    await this.cdp.send('Page.stopScreencast').catch(() => {});
    this.t1 = Date.now();
    await this.cdp.detach().catch(() => {});
    return { t0: this.t0, t1: this.t1, frames: this.frames };
  }
}

// Text on screen that should never reach a client video.
export const RED_FLAGS = [
  [/lorem ipsum|dolor sit amet/i, 'lorem ipsum'],
  [/\btest(ing)?\s*(product|item|user|customer|company|account|order|data)\b|\btest@|\btestuser\b/i, 'test data'],
  [/\b(asdf|qwerty|foobar|dummy)\b/i, 'junk text'],
  [/\b(TODO|TBC|FIXME)\b/, 'TODO/TBC'],
  [/\bplaceholder\b|\bsample (product|text)\b/i, 'placeholder text'],
  [/example\.com/i, 'example.com'],
  [/\bundefined\b|\bNaN\b|\[object Object\]/, 'code leak (undefined/NaN)'],
  [/£\s?0\.00\b/, '£0.00 price'],
  [/coming soon|under construction/i, 'unfinished ("coming soon")'],
  [/\b404\b|not found|internal server error|something went wrong|application error/i, 'error page'],
  [/made with replit|replit/i, 'Replit branding'],
];
export const EDITOR_HOSTS = /(^|\.)replit\.com$|\.replit\.dev$|\.repl\.co$|\.picard\.replit\.dev$/i;

export async function pageFlags(page) {
  const flags = [];
  const host = new URL(page.url()).hostname;
  if (EDITOR_HOSTS.test(host)) flags.push(`Replit editor/dev host on screen (${host})`);
  const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  for (const [re, label] of RED_FLAGS) {
    const m = text.match(re);
    if (m) {
      const i = text.search(re);
      flags.push(`${label}: "…${text.slice(Math.max(0, i - 30), i + 50).replace(/\s+/g, ' ').trim()}…"`);
    }
  }
  const broken = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.offsetParent).map(i => i.src).slice(0, 5)).catch(() => []);
  if (broken.length) flags.push(`broken images: ${broken.join(', ')}`);
  return flags;
}

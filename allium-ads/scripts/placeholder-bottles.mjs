// Renders stand-in bottle PNGs (transparent) for layout work while the real
// renders are unavailable. Real files dropped into /assets always win: see
// scripts/prep_assets.py. Also records the wordmark box of each render so the
// build can prove the wordmark is never cropped.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'generated');
fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const fontUrl = f => 'file://' + path.join(root, 'fonts', f);

const products = {
  purus: { name: 'PURUS', line: 'antioxidant formula' },
  motus: { name: 'MOTUS', line: 'curated joint formula' },
};

const bottle = (key, extra = '') => `
<div class="bottle" data-key="${key}" style="${extra}">
  <div class="cap"><div class="ribs"></div></div>
  <div class="collar"></div>
  <div class="body">
    <div class="label">
      <div class="wm"><div class="allium">allium.</div><div class="pname">${products[key].name}</div></div>
      <div class="rule"></div>
      <div class="line">${products[key].line}</div>
      <div class="meta">60 capsules &nbsp;|&nbsp; food supplement</div>
    </div>
  </div>
</div>`;

const css = `
@font-face{font-family:Montserrat;font-weight:700;src:url(${fontUrl('montserrat-latin-700-normal.woff2')})}
@font-face{font-family:Roboto;font-weight:400;src:url(${fontUrl('roboto-latin-400-normal.woff2')})}
@font-face{font-family:Roboto;font-weight:500;src:url(${fontUrl('roboto-latin-500-normal.woff2')})}
@font-face{font-family:'EB Garamond';font-style:italic;src:url(${fontUrl('eb-garamond-latin-400-italic.woff2')})}
html,body{margin:0;background:transparent}
.stage{position:relative;display:inline-flex;padding:20px;align-items:flex-end;justify-content:center}
.bottle{position:relative;width:860px;height:1900px;display:flex;flex-direction:column;align-items:center}
.cap{width:600px;height:330px;border-radius:34px 34px 14px 14px;position:relative;overflow:hidden;
  background:linear-gradient(90deg,#050505 0%,#2b2b2b 18%,#151515 34%,#0a0a0a 60%,#262626 84%,#050505 100%)}
.ribs{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 5px,rgba(0,0,0,.25) 5px 12px)}
.collar{width:640px;height:40px;background:linear-gradient(90deg,#d8d3ca,#f4f1ea 35%,#fbfaf6 50%,#e6e1d8 80%,#cfc9be);
  border-radius:6px}
.body{flex:1;width:860px;border-radius:120px 120px 70px 70px;position:relative;overflow:hidden;
  background:linear-gradient(90deg,#d9d4ca 0%,#efebe3 10%,#fbfaf6 32%,#fdfcfa 45%,#f3efe7 70%,#e2ddd3 90%,#cdc7bc 100%)}
.label{position:absolute;left:0;right:0;top:300px;bottom:120px;background:#fdfcfa;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.04);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}
.label::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(90deg,rgba(0,0,0,.16) 0%,rgba(0,0,0,.05) 12%,rgba(255,255,255,0) 35%,rgba(255,255,255,.14) 46%,rgba(0,0,0,0) 62%,rgba(0,0,0,.07) 86%,rgba(0,0,0,.18) 100%)}
.wm{display:flex;flex-direction:column;align-items:center}
.allium{font:700 168px/1 Montserrat;letter-spacing:-6px;color:#000}
.pname{font:500 64px/1 Roboto;letter-spacing:22px;margin:40px 0 0 22px;color:#000}
.rule{width:120px;height:3px;background:#000;margin:70px 0 50px}
.line{font:italic 62px/1 'EB Garamond';color:#222}
.meta{font:400 34px/1 Roboto;letter-spacing:4px;color:#333;margin-top:200px}
`;

const pages = {
  purus: `<div class="stage">${bottle('purus')}</div>`,
  motus: `<div class="stage">${bottle('motus')}</div>`,
  purus_and_motus: `<div class="stage" style="gap:0">${bottle('purus', 'z-index:2;margin-right:-60px')}${bottle('motus', 'transform:scale(.94);transform-origin:bottom center;z-index:1')}</div>`,
};

const browser = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
const meta = {};
for (const [name, html] of Object.entries(pages)) {
  const page = await browser.newPage({ viewport: { width: 1900, height: 2000 } });
  await page.setContent(`<!doctype html><style>${css}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  const stage = await page.$('.stage');
  const info = await page.evaluate(() => {
    const s = document.querySelector('.stage').getBoundingClientRect();
    const boxes = [...document.querySelectorAll('.wm')].map(el => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - s.left) / s.width, y: (r.top - s.top) / s.height, w: r.width / s.width, h: r.height / s.height };
    });
    return { w: s.width, h: s.height, wordmarks: boxes };
  });
  await stage.screenshot({ path: path.join(out, `${name}.png`), omitBackground: true });
  meta[name] = info;
  await page.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'bottles.json'), JSON.stringify(meta, null, 2));
console.log('placeholder bottles written to', out);

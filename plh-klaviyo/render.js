// Playwright: emails/*.html -> exports/*.png at 1200 px (600 CSS x2), plus contact-sheet.png
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const c = require('./copy.json');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const exp = path.join(__dirname, 'exports');
  fs.mkdirSync(exp, { recursive: true });
  for (const [id, e] of Object.entries(c.emails)) {
    await page.goto('file://' + path.join(__dirname, 'emails', `${id}.html`), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(exp, `${e.file}.png`), fullPage: true });
    console.log('rendered', e.file);
  }
  // Contact sheet: all 16 side by side, small
  const imgs = Object.values(c.emails).map((e) =>
    `<figure><img src="${e.file}.png"><figcaption>${e.file.replace('PLH_', '')}</figcaption></figure>`).join('');
  const sheet = path.join(exp, '_contact.html');
  fs.writeFileSync(sheet, `<!doctype html><html><head><style>
    body{margin:0;padding:24px;background:#f4f4f4;font:600 13px Arial;display:flex;gap:14px;align-items:flex-start;width:max-content}
    figure{margin:0;width:150px} img{width:150px;display:block;box-shadow:0 1px 4px rgba(0,0,0,.2)} figcaption{text-align:center;margin-top:6px;color:#1E2843}
  </style></head><body>${imgs}</body></html>`);
  const sp = await browser.newPage({ deviceScaleFactor: 2 });
  await sp.goto('file://' + sheet, { waitUntil: 'load' });
  await sp.screenshot({ path: path.join(exp, 'contact-sheet.png'), fullPage: true });
  fs.unlinkSync(sheet);
  await browser.close();
  console.log('contact sheet done');
})();

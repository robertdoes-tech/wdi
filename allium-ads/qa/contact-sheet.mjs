// One PNG of every render, a row per ad variant, so the set can be judged as a family.
import fs from 'node:fs';
import path from 'node:path';

export async function contactSheet(browser, { root, outDir, content, report, placeholders }) {
  const byName = new Map(report.map(r => [r.name, r]));
  const ROW_H = 300;
  const rows = [];
  for (const ad of content.ads) for (const v of ad.variants) {
    const groups = v.colourways.map(cw => {
      const cells = ['1350', '1080', '1920'].map(size => {
        const name = `allium_ad${ad.id}_${v.product}_${cw}_${size}`;
        const r = byName.get(name);
        if (!r) return '';
        return `<figure class="${r.ok ? '' : 'bad'}"><img src="${path.join(outDir, name + '.png')}" style="height:${ROW_H}px"><figcaption>${size}${r.ok ? '' : ' QA FAIL'}</figcaption></figure>`;
      }).join('');
      return `<div class="cw"><div class="cwname">${cw}</div><div class="cells">${cells}</div></div>`;
    }).join('');
    rows.push(`<section><h2><b>Ad ${ad.id}</b> ${ad.title}${ad.variants.length > 1 ? `, ${v.product}` : ''}</h2><div class="groups">${groups}</div></section>`);
  }
  const fails = report.filter(r => !r.ok).length;
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Roboto;font-weight:400;src:url(${path.join(root, 'fonts/roboto-latin-400-normal.woff2')})}
@font-face{font-family:Roboto;font-weight:500;src:url(${path.join(root, 'fonts/roboto-latin-500-normal.woff2')})}
@font-face{font-family:Montserrat;font-weight:700;src:url(${path.join(root, 'fonts/montserrat-latin-700-normal.woff2')})}
body{margin:0;padding:56px 64px;background:#e9e4da;font-family:Roboto;color:#111;width:max-content}
header{display:flex;align-items:baseline;gap:28px;margin-bottom:36px}
header .mark{font:700 44px Montserrat;letter-spacing:-.045em}
header p{font-size:20px;color:#3d3830}
.warn{background:#111;color:#f6f2ea;padding:10px 16px;border-radius:6px;font-size:18px}
section{margin-bottom:34px}
h2{font-weight:400;font-size:20px;margin:0 0 12px}h2 b{font-weight:500;margin-right:8px}
.groups{display:flex;gap:34px}
.cwname{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:#5a544b;margin-bottom:8px}
.cells{display:flex;gap:10px;align-items:flex-start}
figure{margin:0}figure img{display:block;box-shadow:0 1px 3px rgba(0,0,0,.18)}
figcaption{font-size:13px;color:#5a544b;margin-top:5px}
figure.bad img{outline:6px solid #d00}figure.bad figcaption{color:#d00;font-weight:500}
</style><header><div class="mark">allium.</div><p>Static ads for Meta, contact sheet. ${report.length} renders, ${fails ? fails + ' failing QA' : 'all passing QA'}.</p>
${placeholders.length ? `<div class="warn">Bottle renders are placeholders (${placeholders.join(', ')}). Not for publishing.</div>` : ''}</header>
${rows.join('\n')}`;
  const file = path.join(root, 'build', 'contact-sheet.html');
  fs.writeFileSync(file, html);
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto('file://' + file);
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  const dims = await p.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
  await p.setViewportSize({ width: dims.w, height: dims.h });
  await p.screenshot({ path: path.join(outDir, 'allium_contact_sheet.png'), fullPage: true });
  await p.close();
}

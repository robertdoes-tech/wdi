// One 1080x1080 PDF, one page per ad, for import into Canva as an editable design.
// Uses the pages build.mjs already rendered (run `node build.mjs --sizes=1080` first).
// Grain is dropped: Canva flattens blend modes, so add texture there if wanted.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// one colourway per ad: the product's signature colour, with cream and the brand colours spread across the set
const PICKS = [
  'ad01_purus_forest', 'ad02_purus_cream', 'ad03_motus_terracotta', 'ad04_motus_cream', 'ad05_range_espresso',
  'ad06_range_sage', 'ad07_range_stone', 'ad08_range_forest', 'ad09_motus_terracotta', 'ad10_range_espresso',
];
const tmp = path.join(root, 'build', 'pdf');
fs.mkdirSync(tmp, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
const parts = [];
for (const pick of PICKS) {
  const html = path.join(root, 'build', 'html', `allium_${pick}_1080.html`);
  if (!fs.existsSync(html)) throw new Error(`missing ${html}: run node build.mjs --sizes=1080`);
  const p = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  await p.goto('file://' + html);
  await p.addStyleTag({ content: '.grain{display:none!important} @page{size:1080px 1080px;margin:0} html,body{overflow:hidden}' });
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  const out = path.join(tmp, `${pick}.pdf`);
  await p.pdf({ path: out, width: '1080px', height: '1080px', printBackground: true, pageRanges: '1' });
  parts.push(out);
  await p.close();
}
await browser.close();
const dest = path.join(root, 'out', 'allium_ads_1080_canva.pdf');
execFileSync('pdfunite', [...parts, dest]);
console.log(dest);

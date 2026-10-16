// One-off: rebuilds assets/southern-gas-supplies/logo.{svg,png} (recreated from the shopfront sign).
// node pipeline/tools/sgs-logo.mjs <cabin-latin-500-normal.woff2> assets/southern-gas-supplies/logo 500
// Builds the Southern Gas logo SVG (font embedded) and a transparent PNG.
import fs from 'node:fs';
import { chromium } from 'playwright';
const [fontFile, outBase, weight = 500] = process.argv.slice(2);
const font = fs.readFileSync(fontFile).toString('base64');
const BLUE = '#2E8FD6', RED = '#D52B2E';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 820" width="1000" height="820">
  <defs>
    <style>@font-face{font-family:SGSLogo;font-weight:${weight};src:url(data:font/woff2;base64,${font}) format("woff2")}</style>
    <path id="arc" d="M 112 712 A 402 402 0 1 1 888 712"/>
  </defs>
  <text font-family="SGSLogo" font-weight="${weight}" font-size="98" fill="${BLUE}" letter-spacing="0.5">
    <textPath href="#arc" startOffset="50%" text-anchor="middle">Southern Gas Installations</textPath>
  </text>
  <g>
    <path fill="${BLUE}" d="M394,538 C340,614 328,706 380,760 C416,797 462,808 497,806 C464,788 435,761 419,724 C402,686 393,620 394,538 Z"/>
    <path fill="${BLUE}" d="M621,448 C674,550 692,667 656,737 C626,792 565,808 503,806 C544,787 583,756 601,714 C621,664 626,560 621,448 Z"/>
    <path fill="${RED}" d="M489,316 C562,398 611,510 597,626 C587,706 546,756 500,790 C452,750 415,690 414,614 C413,520 474,432 489,316 Z"/>
  </g>
</svg>`;
fs.writeFileSync(outBase + '.svg', svg);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 820 }, deviceScaleFactor: 2 });
await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(200);
await p.locator('svg').screenshot({ path: outBase + '.png', omitBackground: true });
await b.close();

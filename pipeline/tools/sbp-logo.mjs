// One-off: rebuilds assets/southern-building-products/logo.{svg,png}, recreated from the portal header (Michroma font).
// node pipeline/tools/sbp-logo.mjs <michroma-latin-400-normal.woff2> assets/southern-building-products/logo
import fs from 'node:fs';
import { chromium } from 'playwright';
const [fontFile, outBase] = process.argv.slice(2);
const font = fs.readFileSync(fontFile).toString('base64');
const GREEN = '#1E6B4B', RED = '#C1212B';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 500" width="640" height="500">
  <defs><style>@font-face{font-family:SBPLogo;src:url(data:font/woff2;base64,${font}) format("woff2")}</style>
    <clipPath id="band"><rect x="70" y="40" width="500" height="92"/></clipPath></defs>
  <rect x="70" y="40" width="500" height="92" fill="${GREEN}"/>
  <polyline points="52,150 320,34 588,150" fill="none" stroke="#fff" stroke-width="26" clip-path="url(#band)"/>
  <polygon points="128,152 320,76 512,152" fill="${RED}"/>
  <text x="320" y="282" text-anchor="middle" font-family="SBPLogo" font-size="122" fill="${RED}" stroke="${RED}" stroke-width="13" stroke-linejoin="round" letter-spacing="8">SBP</text>
  <text x="320" y="368" text-anchor="middle" font-family="SBPLogo" font-size="56" fill="${GREEN}" stroke="${GREEN}" stroke-width="6" stroke-linejoin="round" letter-spacing="3">SOUTHERN</text>
  <text x="320" y="418" text-anchor="middle" font-family="SBPLogo" font-size="25.5" fill="${GREEN}" stroke="${GREEN}" stroke-width="1.6" letter-spacing="1.5">BUILDING PRODUCTS</text>
</svg>`;
fs.writeFileSync(outBase + '.svg', svg);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 640, height: 500 }, deviceScaleFactor: 2 });
await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
await p.locator('svg').screenshot({ path: outBase + '.png', omitBackground: true });
await b.close();

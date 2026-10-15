// Builds canva/PLH_KLAVIYO_FLOWS.html: all 16 emails as Canva pages (self-contained, absolute asset URLs)
const fs = require('fs');
const path = require('path');
const c = require('./copy.json');
const L = require('./layouts');
const RAW = 'https://raw.githubusercontent.com/robertdoes-tech/wdi/claude/stoic-knuth-fvuuxn/plh-klaviyo/assets/logo.png';
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(c.emails);
const css = fs.readFileSync(path.join(__dirname, 'tokens.css'), 'utf8').replace('body {\n  width: 600px;', 'body {\n  width: 600px;');
// Double every px value and SVG width/height so the page is a true 1200 CSS px (fonts included)
const x2 = (str) => str
  .replace(/(-?\d*\.?\d+)px/g, (m, n) => `${+(n * 2).toFixed(2)}px`)
  .replace(/(<svg[^>]*?\s)width="([\d.]+)"/g, (m, a, n) => `${a}width="${n * 2}"`)
  .replace(/(<svg[^>]*?\s)height="([\d.]+)"/g, (m, a, n) => `${a}height="${n * 2}"`)
  .replace(/(<img[^>]*?\s)width="([\d.]+)"/g, (m, a, n) => `${a}width="${n * 2}"`);
const pages = only.map((id) => {
  const e = c.emails[id];
  return `<section data-document-role="page" data-label="${id}" class="email">${x2(L[id](c, e)).replace(/\.\.\/assets\/logo\.png/g, RAW)}</section>`;
}).join('\n');
fs.mkdirSync(path.join(__dirname, 'canva'), { recursive: true });
const out = path.join(__dirname, 'canva', process.argv[3] || 'PLH_KLAVIYO_FLOWS.html');
fs.writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><title>PLH | KLAVIYO FLOWS</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Roboto:wght@400;500;700&display=block">
<style>${x2(css)}</style></head><body>${pages}</body></html>`);
console.log('wrote', out);

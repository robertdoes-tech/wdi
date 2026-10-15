// Renders emails/*.html from copy.json + layouts.js. Run: node build.js
const fs = require('fs');
const path = require('path');
const c = require('./copy.json');
const L = require('./layouts');
const { t } = require('./partials/util');

const FONTS = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Roboto:wght@400;500;700&family=Noto+Color+Emoji&display=block';
const out = path.join(__dirname, 'emails');
fs.mkdirSync(out, { recursive: true });

for (const [id, e] of Object.entries(c.emails)) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=600">
<title>${t(e.file)}</title>
<!-- subject: ${t(e.subject)} | preview: ${t(e.preview)} -->
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="../tokens.css">
<style>.review-text, .body { font-family: 'Roboto', 'Noto Color Emoji', Arial, sans-serif; }</style>
</head><body><div class="email" data-email="${id}">${L[id](c, e)}</div></body></html>
`;
  fs.writeFileSync(path.join(out, `${id}.html`), html);
}
console.log(`built ${Object.keys(c.emails).length} emails`);

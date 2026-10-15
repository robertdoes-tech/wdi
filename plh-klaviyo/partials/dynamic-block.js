const { t } = require('./util');
// Klaviyo dynamic block / product feed placeholder. Height in CSS px (export is 2x).
const dyn = (c, noteKey, { height = 300, lp = false, style = '' } = {}) =>
  `<div class="dyn ${lp ? 'lp' : ''}" data-block="dynamic" style="height:${height}px;${style}"><div class="dyn-label">${t(c.shared.labels.dynamic)}</div><div class="dyn-note">${t(c.shared.notes[noteKey])}</div></div>`;

// Recommended products space: same dashed style, with empty slots for the count.
dyn.feed = (c, noteKey, { slots = 3, lp = false } = {}) =>
  `<div class="dyn ${lp ? 'lp' : ''}" data-block="feed" style="padding:24px 20px;">
    <div style="display:grid;grid-template-columns:repeat(${slots},1fr);gap:12px;width:100%;margin-bottom:16px">${Array.from({ length: slots },
      () => `<div style="aspect-ratio:1/1;border:1.5px dashed #C76363;background:${lp ? '#FFFFFF' : '#FFE8E8'}"></div>`).join('')}</div>
    <div class="dyn-label">${t(c.shared.labels.feed)}</div><div class="dyn-note">${t(c.shared.notes[noteKey])}</div>
  </div>`;
module.exports = dyn;

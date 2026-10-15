const { t } = require('./util');
const icons = require('./icons');
module.exports = (c) => `<div class="perks" data-block="perks">${c.shared.perks
  .map((p) => `<div class="perk"><div class="perk-icon">${icons[p.icon](34)}</div><div class="perk-text">${t(p.text)}</div></div>`)
  .join('')}</div>`;

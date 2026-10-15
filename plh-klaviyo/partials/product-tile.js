const { t } = require('./util');
// Placeholder tile (products.json endpoint unreachable, so no invented names or prices).
module.exports = (c, { badge = '', style = '' } = {}) =>
  `<div class="tile" data-block="tile" style="${style}"><span class="tile-label">${t(c.shared.labels.product_tile)}</span>${badge}</div>`;

const { t } = require('./util');
module.exports = (c) => {
  const [a, b, u] = c.shared.footer;
  const sep = `<span class="sep">${t(c.shared.footer_separator)}</span>`;
  return `<div class="footer" data-block="footer"><span>${t(a)}</span>${sep}<span>${t(b)}</span>${sep}<span class="unsub">${t(u)}</span></div>`;
};

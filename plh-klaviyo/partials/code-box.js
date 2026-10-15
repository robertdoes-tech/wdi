const { t } = require('./util');
// Standard code box: light pink fill, 2px pink border, three lines.
module.exports = (code, extraClass = '', style = '') => {
  const [label, value, desc] = code;
  return `<div class="codebox ${extraClass}" data-block="code" style="${style}"><div class="code-label">${t(label)}</div><div class="code-code">${t(value)}</div><div class="code-desc">${t(desc)}</div></div>`;
};

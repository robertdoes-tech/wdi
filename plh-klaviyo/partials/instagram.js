const { t } = require('./util');
const icons = require('./icons');
module.exports = (c) => {
  const ig = c.shared.instagram;
  return `<div class="insta" data-block="instagram">
    <div style="display:flex;justify-content:center;gap:10px;align-items:center">${icons.sprig(46, true)}${icons.heart(22)}${icons.sprig(46)}</div>
    <div class="insta-text">${t(ig.text)}</div>
    <div class="btn-wrap"><a class="btn" href="${t(ig.url)}">${t(ig.button)}</a></div>
  </div>`;
};

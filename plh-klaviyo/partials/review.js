const { t } = require('./util');
const icons = require('./icons');
// Review card: Google logo, 5 gold stars, name, exact text, date. Copied verbatim from reviews.txt.
module.exports = (c, id, { style = '' } = {}) => {
  const r = c.reviews[id];
  const stars = Array.from({ length: r.stars }, () => icons.star(16)).join('');
  return `<div class="review" data-block="review" data-review="${id}" style="${style}">
    <div class="review-head"><div class="review-stars">${stars}</div>${icons.google(20)}</div>
    <div class="review-text">${t(r.text)}</div>
    <div class="review-meta"><span class="review-name">${t(r.name)}</span><span class="review-date">${t(r.date)}</span></div>
  </div>`;
};

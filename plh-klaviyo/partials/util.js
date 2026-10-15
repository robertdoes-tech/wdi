// Escape copy for HTML. Every visible string passes through t() so text stays verbatim.
const t = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (site, url) => (url.startsWith('/') ? site + url : url);
module.exports = { t, href };

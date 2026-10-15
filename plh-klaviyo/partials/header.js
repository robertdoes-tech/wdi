const { t } = require('./util');
module.exports = (c) => `<div class="header" data-block="header"><img src="../assets/logo.png" alt="${t(c.shared.logo_alt)}" width="150"><div class="rule"></div></div>`;

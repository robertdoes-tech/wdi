// One layout per email. Copy comes only from copy.json (passed in as `c`), never typed here.
const { t, href } = require('./partials/util');
const icons = require('./partials/icons');
const header = require('./partials/header');
const topbar = require('./partials/topbar');
const perks = require('./partials/perks');
const instagram = require('./partials/instagram');
const signoff = require('./partials/signoff');
const footer = require('./partials/footer');
const codeBox = require('./partials/code-box');
const dyn = require('./partials/dynamic-block');
const tile = require('./partials/product-tile');
const review = require('./partials/review');

const P = '#C76363';
const gap = (h = 40) => `<div style="height:${h}px"></div>`;
const btn = (c, b, cls = '') => `<div class="btn-wrap"><a class="btn ${cls}" href="${t(href(c.site, b.url))}"><span>${t(b.text)}</span></a></div>`;
const h1 = (text, { cls = '', style = '' } = {}) => `<div class="h1 ${cls}" style="${style}">${t(text)}</div>`;
const p = (text, style = '') => `<div class="body" style="${style}">${t(text)}</div>`;
const sec = (inner, style = '') => `<div class="sec" style="${style}">${inner}</div>`;
const label = (text, style = '') =>
  `<div style="display:flex;align-items:center;justify-content:center;gap:12px;${style}">${icons.sprig(40, true)}<div class="label">${t(text)}</div>${icons.sprig(40)}</div>`;
const tiles = (c, n, cols, opts = {}) =>
  `<div class="grid g${cols}">${Array.from({ length: n }, () => tile(c, opts)).join('')}</div>`;
// Shared closing sequence: sign-off always sits directly above the footer.
const close = (c, pre = '') => `${pre}${gap(40)}${signoff(c)}${gap(40)}${footer(c)}`;

const L = {};

// W1: Letter with gift tag
L.W1 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(48)}
${sec(h1(e.headline, { style: 'font-size:58px;text-align:center' }))}
${gap(8)}
<div style="position:relative;width:360px;margin:0 auto;">
  <svg width="360" height="64" viewBox="0 0 360 64" fill="none" stroke="${P}" stroke-width="2" stroke-linecap="round">
    <path d="M180 64C180 40 196 30 222 24c22-5 40-2 52-14 8-8-4-16-12-8-6 6 2 16 14 14"/>
  </svg>
  <div data-block="code" style="background:#FFE8E8;border:2px solid ${P};border-radius:120px 120px 10px 10px;padding:66px 24px 34px;text-align:center;position:relative;margin-top:-12px">
    <div style="position:absolute;top:20px;left:50%;width:22px;height:22px;margin-left:-11px;border-radius:50%;background:#fff;border:2px solid ${P}"></div>
    <div class="code-label">${t(e.code[0])}</div><div class="code-code" style="letter-spacing:0.1em">${t(e.code[1])}</div><div class="code-desc">${t(e.code[2])}</div>
  </div>
</div>
${gap(36)}
${sec(p(e.body, 'text-align:center'))}
${gap(32)}${btn(c, e.button)}${gap(56)}
${label(e.section_label)}${gap(22)}
${sec(tiles(c, e.tiles, 2))}
${gap(56)}${perks(c)}${gap(48)}${instagram(c)}
${close(c)}`;

// W2: Editorial story (header first, split photo left 60%)
L.W2 = (c, e) => `
${header(c)}${gap(24)}${topbar(e.topbar)}
<div style="display:flex;min-height:430px">
  <div class="imgph" style="width:60%"><span>${t(e.image_label)}</span></div>
  <div style="width:40%;background:#FFE8E8;padding:36px 24px;display:flex;flex-direction:column;justify-content:center">
    ${icons.sprig(56)}${gap(14)}
    ${h1(e.headline, { style: 'font-size:46px' })}
  </div>
</div>
${gap(40)}
${sec(p(e.body))}
${gap(52)}${label(e.section_label)}${gap(22)}
<div class="sec"><div class="grid g4">${e.categories.map((cat) => `
  <div style="text-align:center">
    <div style="height:170px;background:#FFE8E8;border:1.5px solid ${P};border-radius:70px 70px 0 0;display:flex;align-items:center;justify-content:center"><span class="tile-label" style="font-size:8px">${t(c.shared.labels.product_tile)}</span></div>
    <div style="font-weight:700;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin-top:10px;line-height:1.4">${t(cat)}</div>
  </div>`).join('')}</div></div>
${gap(36)}${btn(c, e.button)}${gap(20)}
${sec(`<div class="small" style="text-align:center">${t(e.small_line)}</div>`)}
${gap(48)}${perks(c)}
${close(c)}`;

// W3: Perks first (2x2 hero grid, no separate perks strip)
L.W3 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(44)}
${sec(h1(e.headline, { style: 'text-align:center' }))}${gap(28)}
<div class="bg-lp" style="padding:40px;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${e.perks4.map((pk) => `
    <div style="background:#fff;padding:30px 20px;text-align:center;border:1px solid ${P}">
      <div style="display:flex;justify-content:center;margin-bottom:14px">${icons[pk.icon](60)}</div>
      <div style="font-size:15px;font-weight:500;line-height:1.45">${t(pk.text)}</div>
    </div>`).join('')}</div>
</div>
${gap(36)}${sec(p(e.body, 'text-align:center'))}${gap(48)}
${label(e.section_label)}${gap(22)}
${sec(tiles(c, e.tiles, 4))}
${gap(32)}${btn(c, e.button)}${gap(56)}
${sec(`<div data-block="review" data-review="${e.reviews[0]}" style="background:#FFE8E8;padding:40px 40px 32px;position:relative;text-align:center">
  <div style="display:flex;justify-content:center;margin-bottom:18px">${icons.quote(54)}</div>
  <div style="display:flex;justify-content:center;gap:3px;margin-bottom:14px">${Array.from({ length: c.reviews[e.reviews[0]].stars }, () => icons.star(18)).join('')}</div>
  <div style="font-size:16px;line-height:1.65">${t(c.reviews[e.reviews[0]].text)}</div>
  <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:18px">${icons.google(18)}<span class="review-name">${t(c.reviews[e.reviews[0]].name)}</span><span class="review-date">${t(c.reviews[e.reviews[0]].date)}</span></div>
</div>`)}
${gap(48)}${instagram(c)}
${close(c)}`;

// W4: Coupon ticket
L.W4 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(44)}
${sec(h1(e.headline, { cls: 'pink', style: 'text-align:center' }))}${gap(32)}
${sec(`<div data-block="code" style="display:flex;height:150px;position:relative;filter:drop-shadow(0 2px 0 rgba(199,99,99,0.15))">
  <div style="width:140px;background:${P};display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px">
    ${icons.gift(40).replace(/stroke="#C76363"/, 'stroke="#FFFFFF"')}
    <div class="code-label" style="color:#fff">${t(e.code[0])}</div>
  </div>
  <div style="flex:1;background:#FFE8E8;border:2px solid ${P};border-left:3px dashed ${P};display:flex;flex-direction:column;align-items:center;justify-content:center">
    <div class="code-code" style="font-size:34px">${t(e.code[1])}</div><div class="code-desc">${t(e.code[2])}</div>
  </div>
  <div style="position:absolute;left:128px;top:-12px;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${P};clip-path:inset(50% 0 0 0)"></div>
  <div style="position:absolute;left:128px;bottom:-12px;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${P};clip-path:inset(0 0 50% 0)"></div>
</div>`)}
${gap(36)}${sec(p(e.body, 'text-align:center'))}${gap(52)}
${label(e.section_label)}${gap(22)}
${sec(tiles(c, e.tiles, 3))}
${gap(36)}${btn(c, e.button)}${gap(52)}${perks(c)}
${close(c)}`;

// AC1: Handwritten note card
L.AC1 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(52)}
<div style="position:relative;margin:0 48px">
  <div style="position:absolute;inset:6px -4px -6px 4px;background:#fff;border:1px solid ${P};transform:rotate(1.6deg)"></div>
  <div style="position:relative;background:#FFE8E8;padding:58px 40px 44px;box-shadow:0 10px 24px rgba(199,99,99,0.22);text-align:center">
    <svg style="position:absolute;top:-16px;left:50%;margin-left:-70px" width="140" height="34" viewBox="0 0 140 34"><g transform="rotate(-4 70 17)"><rect x="4" y="5" width="132" height="24" fill="${P}" opacity="0.55"/><path d="M4 5l4 4-4 4 4 4-4 4 4 4-4 4M136 5l-4 4 4 4-4 4 4 4-4 4 4 4" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M20 10h100M20 24h100" stroke="#fff" stroke-width="1" stroke-dasharray="3 5" opacity="0.7"/></g></svg>
    ${h1(e.headline, { style: 'font-size:48px' })}${gap(18)}
    ${p(e.body)}
    ${gap(18)}<div style="display:flex;justify-content:flex-end">${icons.heart(26)}</div>
  </div>
</div>
${gap(56)}${sec(dyn(c, e.dynamic_note, { height: 320 }))}
${gap(32)}${btn(c, e.button)}${gap(28)}
${sec(`<div class="small" style="text-align:center;max-width:420px;margin:0 auto">${t(e.help_line)}</div>`)}
${gap(48)}${perks(c)}
${close(c)}`;

// AC2: Delivery progress
L.AC2 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(44)}
${sec(h1(e.headline, { style: 'text-align:center;font-size:48px' }))}${gap(30)}
${sec(`<div style="position:relative;height:110px;margin:0 10px">
  <div style="position:absolute;left:0;right:30px;top:62px;height:14px;border-radius:7px;background:#FFE8E8;border:1.5px solid ${P}"></div>
  <div style="position:absolute;left:0;width:72%;top:62px;height:14px;border-radius:7px;background:${P}"></div>
  <div style="position:absolute;left:calc(72% - 26px);top:14px">${icons.van(46)}</div>
  <div style="position:absolute;right:0;top:20px;text-align:center;width:64px">
    <svg width="20" height="34" viewBox="0 0 20 34" style="margin:0 auto" fill="none" stroke="${P}" stroke-width="2" stroke-linecap="round"><path d="M3 33V3"/><path d="M3 4h14l-4 5 4 5H3" fill="#FFE8E8"/></svg>
  </div>
  <div style="position:absolute;right:6px;top:84px;font-weight:700;font-size:15px;color:${P}">${t(e.progress_marker)}</div>
</div>`)}
${gap(22)}${sec(p(e.body, 'text-align:center'))}${gap(40)}
${sec(dyn(c, e.dynamic_note, { height: 280 }))}${gap(52)}
${label(e.section_label)}${gap(20)}
${sec(dyn.feed(c, e.feed_note, { slots: 3, lp: true }))}
${gap(36)}${btn(c, e.button)}
${close(c, gap(12))}`;

// AC3: Proof sandwich (only left-aligned hero)
L.AC3 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(48)}
${sec(`<div style="border-left:4px solid ${P};padding-left:22px">
  ${h1(e.headline, { style: 'text-align:left' })}${gap(14)}
  ${p(e.body, 'text-align:left')}
</div>`)}
${gap(40)}${sec(dyn(c, e.dynamic_note, { height: 290, lp: true }))}${gap(44)}
${sec(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">${e.reviews.map((r) => review(c, r, { style: 'padding:20px 18px' })).join('')}</div>`)}
${gap(44)}
${sec(`<div data-block="code" style="display:flex;align-items:center;justify-content:space-between;background:#FFE8E8;border:2px solid ${P};border-radius:999px;padding:12px 30px">
  <div class="code-label">${t(e.code[0])}</div>
  <div class="code-code" style="font-size:28px;margin:0">${t(e.code[1])}</div>
  <div class="code-desc" style="font-size:14px">${t(e.code[2])}</div>
</div>`)}
${gap(18)}${sec(p(e.code_line, 'text-align:center'))}
${gap(30)}${btn(c, e.button, 'pill')}${gap(52)}${perks(c)}
${close(c)}`;

// AC4: Gift wrapped (ribbon panel, hanging tag, removable seasonal banner)
L.AC4 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(52)}
<div style="position:relative;margin:0 40px;background:#FFE8E8;padding:120px 40px 48px;text-align:center;overflow:visible">
  <div style="position:absolute;left:0;right:0;top:44px;height:22px;background:${P}"></div>
  <svg style="position:absolute;left:50%;top:8px;margin-left:-60px" width="120" height="90" viewBox="0 0 120 90" fill="#FFE8E8" stroke="${P}" stroke-width="3" stroke-linejoin="round">
    <path d="M60 46C40 20 12 14 10 30c-2 14 26 20 50 16z"/><path d="M60 46c20-26 48-32 50-16 2 14-26 20-50 16z"/>
    <path d="M56 48L40 86l10-6 6 9 4-41zM64 48l16 38-10-6-6 9-4-41z" fill="${P}"/>
    <circle cx="60" cy="46" r="8" fill="${P}"/>
  </svg>
  <div style="position:relative">
    ${h1(e.headline, { style: 'font-size:50px' })}${gap(16)}
    ${p(e.body)}
  </div>
</div>
${gap(48)}${sec(dyn(c, e.dynamic_note, { height: 290 }))}${gap(40)}
<div style="position:relative;width:520px;margin:0 auto;padding:36px 0 0 80px">
<div data-block="code" style="position:relative;width:440px;height:150px">
  <svg style="position:absolute;left:0;top:0" width="440" height="150" viewBox="0 0 440 150"><path d="M2 75L52 2H438V148H52z" fill="#FFE8E8" stroke="${P}" stroke-width="2" stroke-linejoin="round"/><circle cx="38" cy="75" r="9" fill="#fff" stroke="${P}" stroke-width="2"/></svg>
  <svg style="position:absolute;left:-70px;top:-36px" width="120" height="130" viewBox="0 0 120 130" fill="none" stroke="${P}" stroke-width="2" stroke-linecap="round"><path d="M108 111C80 104 40 92 26 58 16 32 30 8 52 4"/></svg>
  <div style="position:absolute;left:70px;right:10px;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
    <div class="code-label">${t(e.code[0])}</div><div class="code-code">${t(e.code[1])}</div><div class="code-desc">${t(e.code[2])}</div>
  </div>
</div>
</div>
${gap(18)}${sec(p(e.code_line, 'text-align:center'))}
${gap(30)}${btn(c, e.button)}${gap(48)}
<div data-block="seasonal" style="margin:0 40px;border:2px dashed ${P};padding:6px">
  <div style="font-weight:700;font-size:9px;letter-spacing:0.2em;color:${P};text-align:right;padding:2px 6px 6px">${t(c.shared.labels.removable)}</div>
  <div style="background:${P};color:#fff;text-align:center;padding:22px 16px;display:flex;align-items:center;justify-content:center;gap:14px">
    ${icons.sprig(44, true).replace(/#C76363/g, '#FFFFFF')}
    <span style="font-weight:700;font-size:15px;letter-spacing:0.22em">${t(e.seasonal_banner)}</span>
    ${icons.sprig(44).replace(/#C76363/g, '#FFFFFF')}
  </div>
</div>
${gap(52)}${instagram(c)}
${close(c)}`;

// BA1: Single spotlight (minimal, arch frame)
L.BA1 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(72)}
${sec(h1(e.headline, { style: 'text-align:center;font-size:56px' }))}${gap(14)}
${sec(p(e.body, 'text-align:center;max-width:380px;margin:0 auto'))}${gap(52)}
<div style="margin:0 auto;width:420px;border:1px solid ${P};border-radius:210px 210px 0 0;padding:18px 18px 18px">
  ${dyn(c, e.dynamic_note, { height: 350, style: 'border-radius:192px 192px 0 0' })}
</div>
${gap(44)}${btn(c, e.button)}${gap(80)}${perks(c)}
${close(c)}`;

// BA2: Main plus three (dynamic left, copy right on light pink)
L.BA2 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(40)}
<div style="display:flex;margin:0 40px;align-items:stretch">
  <div style="width:50%">${dyn(c, e.dynamic_note, { height: 320 })}</div>
  <div style="width:50%;background:#FFE8E8;padding:30px 26px;display:flex;flex-direction:column;justify-content:center">
    ${h1(e.headline, { style: 'font-size:42px' })}${gap(14)}
    ${p(e.body, 'font-size:15px')}
  </div>
</div>
${gap(36)}
${sec(`<div style="display:flex;align-items:center;gap:14px"><div style="flex:1;height:1px;background:${P}"></div>${icons.heart(22)}<div style="flex:1;height:1px;background:${P}"></div></div>`)}
${gap(36)}${sec(dyn.feed(c, e.feed_note, { slots: 3 }))}
${gap(36)}${btn(c, e.button)}${gap(52)}${perks(c)}
${close(c)}`;

// BA3: Bestseller wall (slim reminder strip at top)
L.BA3 = (c, e) => {
  const ribbon = `<div style="position:absolute;top:10px;left:-4px;background:${P};color:#fff;font-weight:700;font-size:8px;letter-spacing:0.16em;padding:4px 10px 4px 8px;clip-path:polygon(0 0,100% 0,92% 50%,100% 100%,0 100%)">${t(c.shared.labels.bestseller_ribbon)}</div>`;
  return `
${topbar(e.topbar)}${header(c)}${gap(28)}
${sec(`<div class="dyn lp" data-block="dynamic" style="height:250px;flex-direction:row;justify-content:flex-start;gap:24px;padding:20px 28px">
  <div style="width:200px;height:200px;border:1.5px dashed ${P};background:#fff;flex:none"></div>
  <div style="text-align:left"><div class="dyn-label">${t(c.shared.labels.dynamic)}</div><div class="dyn-note">${t(c.shared.notes[e.dynamic_note])}</div></div>
</div>`)}
${gap(48)}${sec(h1(e.headline, { style: 'text-align:center' }))}${gap(14)}
${sec(p(e.body, 'text-align:center'))}${gap(44)}
${label(e.section_label)}${gap(22)}
${sec(tiles(c, e.tiles, 3, { badge: ribbon }))}
${gap(44)}${sec(review(c, e.reviews[0]))}
${gap(44)}${sec(codeBox(e.code))}
${gap(18)}${sec(p(e.code_line, 'text-align:center'))}
${gap(30)}${btn(c, e.button)}
${close(c, gap(16))}`;
};

// BA4: Visit the shop (photo hero with overlaid headline card)
L.BA4 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(28)}
<div style="position:relative;height:460px">
  <div class="imgph" style="height:460px;align-items:flex-start;padding-top:70px"><span>${t(e.image_label)}</span></div>
  <div style="position:absolute;left:70px;right:70px;bottom:40px;background:#fff;padding:30px 28px;text-align:center;box-shadow:0 6px 20px rgba(199,99,99,0.2)">
    ${h1(e.headline, { style: 'font-size:46px' })}
  </div>
</div>
${gap(40)}${sec(p(e.body, 'text-align:center'))}${gap(30)}
<div style="margin:0 auto;width:380px;border:1px solid ${P};padding:16px 20px;display:flex;align-items:center;gap:14px">
  <div style="width:52px;height:52px;border-radius:50%;background:#FFE8E8;display:flex;align-items:center;justify-content:center;flex:none">${icons.pin(30)}</div>
  <div style="font-weight:500;font-size:15px;line-height:1.4">${t(e.address)}</div>
</div>
${gap(44)}${sec(dyn(c, e.dynamic_note, { height: 300, lp: true }))}
${gap(44)}${sec(codeBox(e.code))}
${gap(18)}${sec(p(e.code_line, 'text-align:center'))}
${gap(30)}${btn(c, e.button)}${gap(52)}${instagram(c)}
${close(c)}`;

// PP1: Thank you card (double rule card, vertical timeline, Instagram only)
L.PP1 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(48)}
<div style="margin:0 40px;border:5px double ${P};padding:10px">
  <div style="border:1px solid ${P};padding:48px 40px 44px;text-align:center">
    <div style="display:flex;justify-content:center;gap:6px;align-items:center">${icons.sprig(50, true)}${icons.heart(20)}${icons.sprig(50)}</div>${gap(16)}
    ${h1(e.headline, { cls: 'pink', style: 'font-size:66px' })}${gap(20)}
    ${p(e.body)}
  </div>
</div>
${gap(56)}${label(e.section_label)}${gap(30)}
<div style="width:340px;margin:0 auto;position:relative">
  <div style="position:absolute;left:11px;top:14px;bottom:14px;width:2px;background:${P}"></div>
  ${e.timeline.map((s, i) => `<div style="display:flex;align-items:center;gap:20px;position:relative;${i < e.timeline.length - 1 ? 'margin-bottom:34px' : ''}">
    <div style="width:24px;height:24px;border-radius:50%;background:${i === 0 ? P : '#FFE8E8'};border:2px solid ${P};flex:none"></div>
    <div style="font-size:17px;font-weight:500">${t(s)}</div>
  </div>`).join('')}
</div>
${gap(60)}${instagram(c)}
${close(c)}`;

// PP2: Review ask plus care guide
L.PP2 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(44)}
<div style="display:flex;justify-content:center;gap:10px">${Array.from({ length: 5 }, () => icons.starOutline(46)).join('')}</div>
${gap(20)}${sec(h1(e.headline, { style: 'text-align:center' }))}${gap(14)}
${sec(p(e.body, 'text-align:center'))}${gap(30)}${btn(c, e.button, 'pill')}${gap(52)}
${label(e.section_label)}${gap(20)}
<div class="bg-lp" style="margin:0 40px;padding:10px 28px">
  ${e.care_tips.map((ct, i) => `<div style="display:flex;align-items:center;gap:20px;padding:18px 0;${i ? `border-top:1px solid ${P}` : ''}">
    <div style="width:56px;height:56px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none">${icons[ct.icon](30)}</div>
    <div style="font-size:15px;line-height:1.55">${t(ct.text)}</div></div>`).join('')}
</div>
${gap(44)}${sec(codeBox(e.code))}
${gap(18)}${sec(p(e.code_line, 'text-align:center'))}${gap(52)}
${label(e.section_label_2)}${gap(20)}
${sec(dyn.feed(c, e.feed_note, { slots: 3 }))}
${close(c, gap(8))}`;

// PP3: Welcome back banner (heart, NEW corner labels)
L.PP3 = (c, e) => {
  const badge = `<div style="position:absolute;top:0;right:0;background:${P};color:#fff;font-weight:700;font-size:10px;letter-spacing:0.2em;padding:6px 10px">${t(c.shared.labels.new_label)}</div>`;
  return `
${topbar(e.topbar)}${header(c)}${gap(36)}
<div class="bg-lp" style="padding:44px 40px 46px;text-align:center;position:relative">
  <div style="display:flex;justify-content:center">${icons.heartDrawn(96)}</div>${gap(10)}
  ${h1(e.headline, { cls: 'pink', style: 'font-size:56px' })}
</div>
${gap(36)}${sec(p(e.body, 'text-align:center;max-width:440px;margin:0 auto'))}${gap(52)}
${label(e.section_label)}${gap(22)}
${sec(tiles(c, e.tiles, 2, { badge }))}
${gap(36)}${btn(c, e.button)}${gap(52)}${perks(c)}
${close(c)}`;
};

// PP4: Regulars club card
L.PP4 = (c, e) => `
${topbar(e.topbar)}${header(c)}${gap(44)}
${sec(h1(e.headline, { style: 'text-align:center' }))}${gap(14)}
${sec(p(e.body, 'text-align:center'))}${gap(28)}${btn(c, e.button, 'ghost')}${gap(48)}
<div data-block="code" style="width:440px;height:260px;margin:0 auto;background:${P};border-radius:18px;padding:26px 30px;color:#fff;position:relative;box-shadow:0 12px 26px rgba(199,99,99,0.35);overflow:hidden">
  <svg style="position:absolute;right:-40px;bottom:-50px;opacity:0.18" width="220" height="220" viewBox="0 0 36 36" fill="none" stroke="#fff" stroke-width="1.5"><path d="M18 30C8 23 4 18 4 12.5 4 8.5 7 6 10.5 6c3 0 5.5 2 7.5 5 2-3 4.5-5 7.5-5C29 6 32 8.5 32 12.5 32 18 28 23 18 30z"/></svg>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div style="font-weight:700;font-size:11px;letter-spacing:0.22em">${t(e.club_label)}</div>
    ${icons.heart(22).replace(/#C76363/g, '#FFFFFF')}
  </div>
  <div style="position:absolute;left:30px;right:30px;bottom:26px">
    <div class="code-label" style="color:#fff;opacity:0.85">${t(e.code[0])}</div>
    <div class="code-code" style="color:#fff;font-size:40px">${t(e.code[1])}</div>
    <div class="code-desc" style="color:#fff">${t(e.code[2])}</div>
  </div>
  <div style="position:absolute;left:30px;top:80px;width:46px;height:34px;border-radius:6px;border:1.5px solid rgba(255,255,255,0.7)"></div>
</div>
${gap(20)}${sec(p(e.code_line, 'text-align:center'))}${gap(52)}
${label(e.section_label)}${gap(22)}
${sec(tiles(c, e.tiles, 4))}
${gap(36)}
${sec(`<div style="display:flex;align-items:center;justify-content:center;gap:12px">${icons.heart(22)}<div class="small">${t(e.instagram_line)}</div></div>`)}
${gap(28)}${btn(c, e.button2)}
${close(c, gap(12))}`;

module.exports = L;

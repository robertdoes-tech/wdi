// Runs inside the rendered page (passed to page.evaluate, so it must be self
// contained). Checks, per render:
//   - WCAG AA contrast of every text run against what is actually behind it
//     (backgrounds, panels, opacity, and the radial glow), 4.5:1, or 3:1 over 40px
//   - text stays on canvas; on 1920 it stays out of the top 14% and bottom 20%
//   - no text box overflows or sits on a bottle or other visual
//   - each bottle wordmark is fully on canvas, unclipped and uncovered
//   - legal footer present, exact, 20px or larger
//   - stat source line present and readable (and the YouGov year)
//   - fonts and images loaded
export function pageQa(opts) {
  const errors = [];
  const canvas = document.querySelector('.canvas');
  const C = canvas.getBoundingClientRect();
  const W = C.width, H = C.height;

  const parse = s => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const over = (top, bot) => ({
    r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1,
  });
  const lum = c => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const hit = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  const inside = (a, b, tol = 0.5) => a.left >= b.left - tol && a.right <= b.right + tol && a.top >= b.top - tol && a.bottom <= b.bottom + tol;
  const label = el => (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ` "${el.textContent.trim().slice(0, 40)}"`;

  // fonts
  for (const f of ['400 20px "EB Garamond"', '400 20px Roboto', '700 20px Montserrat'])
    if (!document.fonts.check(f)) errors.push(`font not loaded: ${f}`);
  for (const img of document.images) if (!img.naturalWidth) errors.push(`image not loaded: ${img.src}`);

  // visuals text must not sit on
  const visuals = [...canvas.querySelectorAll('.bottle img, [data-visual]')].map(el => ({ el, r: el.getBoundingClientRect() }));
  const glows = [...canvas.querySelectorAll('.glow')].map(el => {
    const r = el.getBoundingClientRect();
    return { cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, rad: r.width / 2, c: parse(getComputedStyle(el).backgroundImage) };
  });
  const canvasBg = parse(getComputedStyle(canvas).backgroundColor);

  function background(el, rect) {
    const layers = [];
    for (let e = el; e && e !== canvas.parentElement; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let bg = canvasBg;
    if (!layers.length || layers[layers.length - 1].a < 1) {
      // glow sits on the canvas, under any panel
      for (const g of glows) {
        if (!g.c) continue;
        const nx = Math.max(rect.left, Math.min(g.cx, rect.right)), ny = Math.max(rect.top, Math.min(g.cy, rect.bottom));
        const d = Math.hypot(nx - g.cx, ny - g.cy);
        if (d < g.rad) bg = over({ ...g.c, a: g.c.a * (1 - d / g.rad) }, bg);
      }
    }
    for (const l of layers.reverse()) bg = l.a >= 1 ? l : over(l, bg);
    return bg;
  }
  function opacity(el) { let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; }

  // collect text runs
  const walker = document.createTreeWalker(canvas, NodeFilter.SHOW_TEXT);
  const runs = new Map();
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (!n.textContent.trim()) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const el = n.parentElement;
    if (!runs.has(el)) runs.set(el, []);
    runs.get(el).push(...rects);
  }

  const contrast = [];
  const textBoxes = [];
  for (const [el, rects] of runs) {
    const cs = getComputedStyle(el);
    const svg = el instanceof SVGElement;
    const size = svg ? el.getBoundingClientRect().height / 0.75 : parseFloat(cs.fontSize);
    let fg = parse(svg ? cs.fill : cs.color);
    fg = { ...fg, a: fg.a * opacity(el) };
    const box = rects.reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) }),
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const bg = background(el, box);
    const fgOn = over(fg, bg);
    const cr = ratio(fgOn, bg);
    const need = size > 40 ? 3 : 4.5;
    contrast.push({ el: label(el), size: Math.round(size), ratio: +cr.toFixed(2), need });
    if (cr < need) errors.push(`contrast ${cr.toFixed(2)}:1 < ${need}:1 on ${label(el)} (${Math.round(size)}px)`);
    textBoxes.push({ el, box });

    if (!inside(box, { left: 24, top: 24, right: W - 24, bottom: H - 24 })) errors.push(`text off canvas or within 24px of the edge: ${label(el)}`);
    if (opts.size === '1920' && (box.top < H * 0.14 || box.bottom > H * 0.80)) errors.push(`1920 safe zone: ${label(el)} spans ${Math.round(box.top)} to ${Math.round(box.bottom)}px`);
    if (!svg && el.scrollWidth > el.clientWidth + 2 && cs.display !== 'inline') errors.push(`text overflows its box: ${label(el)}`);
    for (const v of visuals) if (hit(box, v.r) && !el.closest('[data-qa-over]')) errors.push(`text sits on a visual (${v.el.closest('[data-asset]')?.dataset.asset || v.el.className || v.el.tagName}): ${label(el)}`);
  }

  // text boxes must not collide with each other (different blocks)
  for (let i = 0; i < textBoxes.length; i++) for (let j = i + 1; j < textBoxes.length; j++) {
    const a = textBoxes[i], b = textBoxes[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    if (hit(a.box, b.box)) errors.push(`text collision: ${label(a.el)} / ${label(b.el)}`);
  }

  // wordmarks on bottles
  for (const fig of canvas.querySelectorAll('.bottle')) {
    for (const p of fig.querySelectorAll('.wm-probe')) {
      const r = p.getBoundingClientRect();
      if (!inside(r, { left: 0, top: 0, right: W, bottom: H })) errors.push(`bottle wordmark cropped by the canvas (${fig.dataset.asset})`);
      for (let e = fig.parentElement; e && e !== canvas; e = e.parentElement) {
        if (getComputedStyle(e).overflow !== 'visible' && !inside(r, e.getBoundingClientRect())) errors.push(`bottle wordmark clipped by ${e.className} (${fig.dataset.asset})`);
      }
      for (const t of textBoxes) if (hit(r, t.box)) errors.push(`text covers the ${fig.dataset.asset} wordmark: ${label(t.el)}`);
      for (const v of canvas.querySelectorAll('[data-visual]')) if (hit(r, v.getBoundingClientRect()) && getComputedStyle(v).zIndex > getComputedStyle(fig).zIndex) errors.push(`visual covers the ${fig.dataset.asset} wordmark`);
    }
  }

  // legal footer
  const legal = canvas.querySelector('.legal');
  if (!legal) errors.push('legal footer missing');
  else {
    if (legal.textContent.trim() !== opts.legal) errors.push('legal footer wording changed');
    if (parseFloat(getComputedStyle(legal).fontSize) < 20) errors.push('legal footer under 20px');
    if (getComputedStyle(legal).fontFamily.split(',')[0].replace(/"/g, '').trim() !== 'Roboto') errors.push('legal footer not set in Roboto');
  }

  // stat source line
  if (opts.source) {
    const src = [...canvas.querySelectorAll('.source')].find(e => e.textContent.includes(opts.source));
    if (!src) errors.push(`source line "${opts.source}" missing`);
    else {
      if (parseFloat(getComputedStyle(src).fontSize) < 20) errors.push('source line under 20px');
      if (opts.requireYear && !src.textContent.includes(opts.requireYear)) errors.push(`source line missing year ${opts.requireYear}`);
    }
  }

  return { errors: [...new Set(errors)], contrast, text: canvas.innerText };
}

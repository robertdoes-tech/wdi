// WDI showreel — one paused GSAP timeline + per-frame procedural layers.
// Every time below is in seconds on the 45 s edit (120 BPM, bar = 2 s).
const FPS = 30, DUR = 45;
const $ = s => document.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
const fx = [];                 // per-frame functions f(t)
const hits = [];               // camera shake impulses [time, strength]
const flashes = [];            // white flash [time, strength]
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 4);
const easeIO = (x) => { x = clamp(x); return x < .5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2; };
function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// scene visibility windows
const windows = [];
function show(id, a, b) { windows.push([$('#' + id), a, b]); }
fx.push(t => windows.forEach(([el, a, b]) => el.style.visibility = (t >= a && t < b) ? 'visible' : 'hidden'));

// word pop synced to VO
function pop(el, t, opt = {}) {
  tl.fromTo(el, { yPercent: opt.y ?? 70, opacity: 0, filter: 'blur(14px)', scale: opt.s ?? 1 },
    { yPercent: 0, opacity: 1, filter: 'blur(0px)', scale: 1, duration: opt.d ?? .55, ease: opt.ease ?? 'expo.out' }, t);
}
// brand stack wipe: three slanted bars (the logo's stripes) cover at t, uncover after
const wipes = [];
function wipe(t, hold = .08) { wipes.push([t, hold]); }
fx.push(t => $$('#wipe div').forEach((b, i) => {
  let x = -130;
  wipes.forEach(([w, h]) => {
    const a = w - .32 + i * .035, c = w + h + i * .035;
    if (t >= a && t < c) x = -130 + 130 * Math.pow(clamp((t - a) / .32), 3);
    else if (t >= c && t < c + .42) x = 130 * (1 - Math.pow(1 - clamp((t - c) / .42), 3));
  });
  b.style.transform = `skewY(-8deg) translateX(${x}%)`;
}));
const hit = (t, s = 1) => hits.push([t, s]);
const flash = (t, s = .6) => flashes.push([t, s]);

// counters
function counter(el, t0, t1, to, fmt) {
  fx.push(t => { const k = easeIO((t - t0) / (t1 - t0)); el.textContent = fmt(Math.round(to * k)); });
}

// ---------------------------------------------------------------- background life
fx.push(t => {
  $('#grid').style.setProperty('--gy', ((t * 40) % 80) + 'px');
  const g = $('#glow');
  g.style.transform = `translate(${Math.sin(t * .35) * 120}px,${Math.cos(t * .27) * 60}px) scale(${1 + .08 * Math.sin(t * .6)})`;
});

// split plain text into .w spans
function split(el) {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  return $$('.w', el);
}

// ================================================================ S1 0–4  "Referrals built your business. But referrals don't scale."
show('s1', 0, 4.05);
{
  const a = split($('#s1a'));
  [0.43, 1.09, 1.35, 1.51].forEach((t, i) => pop(a[i], t - .06));
  tl.to('#s1a', { yPercent: -40, opacity: 0, filter: 'blur(10px)', duration: .35, ease: 'power2.in' }, 1.95);
  const b = $('#s1b');
  b.innerHTML = '<span class="w">But</span> <span class="w">referrals</span> ' + b.querySelector('#noscale').outerHTML;
  const bw = $$('.w', b);
  [2.23, 2.37, 3.03].forEach((t, i) => pop(bw[i], t - .06));
  tl.set('#s1b', { opacity: 0 }, 0).set('#s1b', { opacity: 1 }, 2.1);
  // chart draws up, then flatlines on "don't scale"
  const line = $('#cline'), L = line.getTotalLength();
  gsap.set(line, { strokeDasharray: L, strokeDashoffset: L });
  tl.to(line, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, .25);
  tl.fromTo('#cfill', { opacity: 0 }, { opacity: 1, duration: 1.2 }, .6);
  tl.fromTo('#cflat', { opacity: 0, scaleX: 0, svgOrigin: '800 190' }, { opacity: 1, scaleX: 1, duration: 1.1, ease: 'power2.out' }, 2.35);
  tl.to('#cdot', { attr: { cx: 1340, cy: 222 }, fill: '#F87171', duration: 1.1, ease: 'power2.out' }, 2.35);
  fx.push(t => {
    if (t < 2.35) { const k = clamp((t - .25) / 1.6); const p = line.getPointAtLength(L * easeIO(k)); $('#cdot').setAttribute('cx', p.x); $('#cdot').setAttribute('cy', p.y); }
    // glitch on "scale"
    const g = t > 3.35 && t < 3.75 ? (rand(Math.floor(t * 30))() - .5) * 26 : 0;
    $('#chart').style.transform = `translateX(${g}px)`;
    $('#noscale').style.transform = `translateX(${-g * .6}px)`;
    $('#noscale').style.textShadow = g ? `${g * .4}px 0 #3B82F6, ${-g * .4}px 0 #F87171` : 'none';
  });
  tl.to('#chart', { opacity: .35, filter: 'saturate(.3)', duration: .3 }, 3.35);
  hit(3.35, .5);
  tl.fromTo('#s1', { scale: 1 }, { scale: 1.07, duration: 4, ease: 'none' }, 0);
}
wipe(4.0);

// ================================================================ S2 4–8.5  logo slam + "outbound sales for Irish B2B firms"
show('s2', 3.98, 8.55);
{
  $$('#bigmark .mb').forEach((g, i) => tl.fromTo(g, { x: -90 - i * 40, y: 30 - i * 25, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .7, ease: 'expo.out' }, 4.0 + i * .06));
  $$('#bigword .w').forEach((w, i) => tl.fromTo(w, { yPercent: 90, opacity: 0, rotateX: -70 }, { yPercent: 0, opacity: 1, rotateX: 0, duration: .7, ease: 'expo.out' }, 4.06 + i * .07));
  tl.fromTo('#lockup', { scale: 1.25 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 4.0);
  tl.fromTo('#ring', { width: 10, height: 10, opacity: 1 }, { width: 2400, height: 2400, opacity: 0, borderWidth: 1, duration: 1.0, ease: 'expo.out' }, 4.0);
  hit(4.0, 1.4); flash(4.0, .55);
  tl.to('#lockup', { x: -640, y: -390, scale: .26, duration: .7, ease: 'expo.inOut' }, 5.35);
  tl.to('#lockup', { opacity: 0, duration: .25 }, 5.85);
  tl.fromTo('#hero', { rotateY: 40, rotateX: 14, z: -900, x: 500, opacity: 0 }, { rotateY: 18, rotateX: 6, z: 0, x: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }, 5.5);
  tl.to('#hero', { rotateY: 10, rotateX: 3, z: 80, duration: 1.9, ease: 'none' }, 6.6);
  pop('#s2chip', 5.72, { y: 120 });
  const cw = $$('#s2cap .w');
  [5.87, 6.39, 6.77, 7.01, 7.37, 7.89].forEach((t, i) => pop(cw[i], t - .06, { y: 90 }));
  tl.to(['#hero', '#s2cap', '#s2chip'], { z: 700, scale: 1.6, opacity: 0, filter: 'blur(20px)', duration: .32, ease: 'power3.in' }, 8.2);
}

// ================================================================ S3 8.5–14  €100m+ / 1,000+
show('s3', 8.45, 14.05);
{
  const host = $('#bars3'), r = rand(11);
  const bars = [];
  for (let i = 0; i < 34; i++) {
    const d = document.createElement('div');
    const h = 18 + 82 * Math.pow(i / 33, 1.4) * (.75 + .25 * r());
    d.style.cssText = `flex:1;height:${h}%;border-radius:8px 8px 0 0;background:linear-gradient(180deg,rgba(59,130,246,.55),rgba(69,73,217,.05));transform-origin:50% 100%`;
    host.appendChild(d); bars.push(d);
  }
  tl.fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: 1.2, stagger: .03, ease: 'expo.out' }, 8.55);
  tl.to(bars, { scaleY: 0, duration: .5, stagger: .01, ease: 'power3.in' }, 11.5);
  tl.fromTo('#st1', { scale: 1.5, opacity: 0, filter: 'blur(30px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: .7 }, 8.5);
  counter($('#n100'), 8.9, 10.35, 100, n => `€${n}m${n === 100 ? '+' : ''}`);
  tl.to('#st1', { y: -260, opacity: 0, filter: 'blur(16px)', duration: .4, ease: 'power3.in' }, 11.6);
  hit(8.5, .8);
  tl.fromTo('#st2', { y: 260, opacity: 0, filter: 'blur(16px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .6 }, 11.95);
  counter($('#n1000'), 12.2, 13.5, 1000, n => n.toLocaleString('en') + (n === 1000 ? '+' : ''));
  const cal = $('#cal'), cells = [];
  for (let i = 0; i < 400; i++) { const c = document.createElement('i'); c.style.cssText = 'display:block;width:18px;height:18px;border-radius:4px;background:rgba(147,180,255,.1)'; cal.appendChild(c); cells.push(c); }
  const order = cells.map((c, i) => [c, rand(i * 7 + 3)()]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  fx.push(t => {
    const k = easeIO((t - 12.2) / 1.3) * 400;
    order.forEach((c, i) => { const on = i < k; c.style.background = on ? (i % 9 === 0 ? '#7FB2FF' : '#3B82F6') : 'rgba(147,180,255,.1)'; c.style.boxShadow = on && i > k - 12 ? '0 0 14px #7FB2FF' : 'none'; });
  });
  tl.fromTo('#cal', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .5 }, 12.05);
  hit(12.0, .5);
  tl.to(['#st2', '#cal'], { scale: 1.4, opacity: 0, filter: 'blur(18px)', duration: .3, ease: 'power3.in' }, 13.75);
}

// ================================================================ S4 14–21  sectors: Steel · Pharma · Plant hire · Security → wall
show('s4', 13.98, 21.1);
{
  const ids = ['steel', 'pharma', 'plant', 'security'];
  const words = ['STEEL', 'PHARMA', 'PLANT HIRE', 'SECURITY'];
  const T = [14.0, 15.0, 16.0, 17.0];
  $('#k-pharma').style.width = '540px';
  $$('#s4 .card').forEach(c => { c.style.left = '50%'; c.style.top = '46%'; gsap.set(c, { xPercent: -50, yPercent: -50, opacity: 0 }); });
  ids.forEach((id, i) => {
    const el = '#k-' + id, t = T[i], side = i % 2 ? 1 : -1;
    tl.fromTo(el, { scale: 2.1, rotate: side * 8, rotateY: side * 30, opacity: 0, filter: 'blur(18px)' },
      { scale: 1, rotate: side * -2, rotateY: 0, opacity: 1, filter: 'blur(0px)', duration: .5, ease: 'expo.out', immediateRender: false }, t - .04);
    if (i < 3) tl.to(el, { x: side * 640, scale: .55, rotateY: side * -28, opacity: .55, filter: 'blur(3px)', duration: .55, ease: 'expo.inOut' }, t + .9);
    hit(t, .7);
  });
  fx.push(t => {
    let i = -1; T.forEach((x, k) => { if (t >= x - .04) i = k; });
    const el = $('#bigword4');
    el.textContent = i >= 0 && t < 18 ? words[i] : '';
    const k = i >= 0 ? ease((t - T[i]) / .6) : 0;
    el.style.transform = `translateX(${(1 - k) * 260 + (t - (T[i] || 0)) * -60}px) scale(${1.15 - .15 * k})`;
    el.style.opacity = k;
  });
  // the wall
  const wall = ['coatings', 'pharma', 'steel', 'insulation', 'security', 'plant', 'scaffold'];
  wall.forEach((id, i) => {
    const o = i - 3;
    tl.to('#k-' + id, { x: o * 292, y: -120 + Math.abs(o) * 16, z: -Math.abs(o) * 90, rotateY: -o * 7, rotate: 0, scale: ['steel', 'security', 'plant'].includes(id) ? .38 : .44, opacity: 1, filter: 'blur(0px)', duration: .9, ease: 'expo.out' }, 17.85 + Math.abs(o) * .04);
  });
  tl.to('#s4 .card', { x: '-=70', duration: 3, ease: 'none' }, 18.75);
  const tw = $$('#s4t .w');
  [18.09, 18.41, 19.19, 19.41, 20.05].forEach((t, i) => pop(tw[i], t - .06, { y: 80 }));
  tl.fromTo('#strike', { scaleX: 0 }, { scaleX: 1, duration: .25, ease: 'power2.out' }, 20.35);
  hit(18.0, .6);
}
wipe(21.0);

// ================================================================ S5 21–28  "Then we automate the admin. Dockets. CRMs. Timesheets. 500 hours… gone."
show('s5', 20.98, 28.05);
{
  tl.fromTo('#svc', { rotateY: -28, rotateX: 8, x: 380, z: -400, opacity: 0 }, { rotateY: -14, rotateX: 4, x: 0, z: 0, opacity: 1, duration: 1, ease: 'expo.out' }, 21.0);
  tl.to('#svc', { rotateY: -6, z: 120, duration: 1.0, ease: 'none' }, 22.0);
  const w = $$('#s5t .w');
  [21.1, 21.5, 21.74, 22.12, 22.28].forEach((t, i) => pop(w[i], t - .06, { y: 90 }));
  tl.set(['#svc', '#s5t'], { opacity: 0 }, 22.85);
  // three hard cuts locked to the words
  const shots = [['#sh-dock', 22.85, 23.6], ['#sh-crm', 23.6, 24.45], ['#sh-ts', 24.45, 25.3]];
  shots.forEach(([id, a, b], i) => {
    gsap.set(id, { opacity: 0 });
    tl.fromTo(id, { opacity: 1, scale: 1.25, rotate: i % 2 ? 2 : -2, filter: 'blur(14px)' }, { scale: 1, rotate: 0, filter: 'blur(0px)', duration: .35, ease: 'expo.out', immediateRender: false }, a);
    tl.to(id, { scale: 1.06, duration: b - a - .35, ease: 'none' }, a + .35);
    tl.set(id, { opacity: 0 }, b);
    hit(a, .55);
  });
  tl.fromTo('#sh-dock img', { y: 0 }, { y: -90, duration: .75, ease: 'none' }, 22.85);
  tl.fromTo('#sh-ts img', { scale: 1, transformOrigin: '23% 57%' }, { scale: 2.1, duration: .7, ease: 'expo.inOut' }, 24.5);
  fx.push(t => {
    const tags = [[22.85, 'Dockets'], [23.6, 'CRMs'], [24.45, 'Timesheets']];
    let s = ''; tags.forEach(([x, n]) => { if (t >= x) s = n; });
    $('#tag5t').textContent = s;
    $('#tag5').style.opacity = t >= 22.85 && t < 25.3 ? 1 : 0;
  });
  [22.85, 23.6, 24.45].forEach(t => tl.fromTo('#tag5 .chip', { scale: .7 }, { scale: 1, duration: .35, ease: 'back.out(3)', immediateRender: false }, t));

  // 500+ hours of paperwork… gone
  tl.fromTo('#h500', { opacity: 0, scale: .6, filter: 'blur(20px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .6 }, 25.3);
  counter($('#n500'), 25.5, 26.6, 500, n => n + (n === 500 ? '+' : ''));
  const host = $('#papers'), papers = [], r = rand(5);
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.style.cssText = `position:absolute;left:0;top:0;width:150px;height:196px;border-radius:6px;background:#EEF2F8;box-shadow:0 18px 40px rgba(0,0,0,.45);padding:20px 16px;display:flex;flex-direction:column;gap:11px`;
    p.innerHTML = '<b style="height:12px;width:60%;background:#C9D3E3;border-radius:3px"></b>' + Array.from({ length: 6 }, () => `<b style="height:7px;width:${55 + r() * 45}%;background:#D9E0EC;border-radius:3px"></b>`).join('');
    host.appendChild(p);
    papers.push({ el: p, a: r() * Math.PI * 2, R: 560 + r() * 380, w: (.25 + r() * .35) * (r() < .5 ? -1 : 1), rot: r() * 360, vr: (r() - .5) * 120, d: r() * .4, z: .6 + r() * .6 });
  }
  const GONE = 27.68;
  fx.push(t => {
    papers.forEach(p => {
      const k = ease((t - 25.35 - p.d) / .8);
      const a = p.a + t * p.w;
      let x = 960 + Math.cos(a) * p.R * (1.2 - .2 * k), y = 520 + Math.sin(a) * p.R * .52;
      let s = p.z * k, o = k;
      if (t >= GONE) { const g = clamp((t - GONE) / .22); x += (x - 960) * g * .8; y += (y - 520) * g * .8; s *= 1 - g; o *= 1 - g; }
      p.el.style.transform = `translate(${x - 75}px,${y - 98}px) rotate(${p.rot + p.vr * t}deg) scale(${s})`;
      p.el.style.opacity = o;
    });
  });
  tl.to('#gone', { color: '#34D399', duration: .1 }, GONE);
  tl.fromTo('#h500', { scale: 1.1 }, { scale: 1, duration: .3, immediateRender: false }, GONE);
  hit(GONE, .9); flash(GONE, .35);
  tl.to('#h500', { scale: 3, opacity: 0, filter: 'blur(30px)', duration: .3, ease: 'power3.in' }, 27.75);
}

// ================================================================ S6 28–35  product showcase
show('s6', 27.98, 35.05);
{
  const imgs = ['docketpro', 'trade-portals', 'website-features', 'before-after', 'how-it-works', 'dockets-who'];
  const car = $('#carousel');
  imgs.forEach((n, i) => {
    const d = document.createElement('div');
    d.className = 'shot';
    d.style.cssText = `left:-560px;top:-320px;width:1120px;height:640px;transform:rotateY(${i * 60}deg) translateZ(1180px);backface-visibility:hidden`;
    d.innerHTML = `<img src="img/${n}.jpg" style="object-position:top">`;
    car.appendChild(d);
  });
  gsap.set(car, { z: -1200 });
  tl.fromTo(car, { rotateY: 150, rotateX: -6 }, { rotateY: -30, rotateX: 4, duration: 2.1, ease: 'power2.inOut' }, 27.95);
  tl.fromTo(car, { opacity: 0 }, { opacity: 1, duration: .25 }, 27.95);
  tl.set(car, { opacity: 0 }, 30.0);
  hit(28.0, 1.3); flash(28.0, .5);

  // impact bars fill
  gsap.set('#impact', { opacity: 0 });
  const ib = $('#impbars');
  [[29.1, 33.7], [47.7, 52.3], [66.3, 70.9]].forEach(([a, b], i) => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:10.4%;width:80.6%;top:${a - .4}%;height:${b - a + .8}%;background:#16284A;border-radius:12px;transform-origin:100% 50%`;
    ib.appendChild(d);
    tl.fromTo(d, { scaleX: 1 }, { scaleX: 0, duration: .9, ease: 'expo.inOut', immediateRender: false }, 30.3 + i * .25);
  });
  tl.fromTo('#impact', { opacity: 1, scale: 1.2, rotateX: 18, y: 80 }, { scale: 1, rotateX: 0, y: 0, duration: .7, immediateRender: false }, 30.0);
  tl.to('#impact', { scale: 1.12, duration: 1.3, ease: 'none' }, 30.7);
  tl.set('#impact', { opacity: 0 }, 32.0);
  hit(30.0, .6);

  // rapid cuts on the beat
  const cuts = [['dockets-who', 'Digital dockets'], ['trade-portals', 'Trade portals'], ['website-features', 'Websites'], ['how-it-works', 'How it works'], ['crm-build', 'Custom CRM'], ['dockets-time', 'Hours saved']];
  const host = $('#cuts');
  cuts.forEach(([n, label], i) => {
    const d = document.createElement('div');
    d.className = 'shot';
    d.style.cssText = 'left:210px;top:120px;width:1500px;height:760px;opacity:0';
    d.innerHTML = `<img src="img/${n}.jpg">`;
    host.appendChild(d);
    const t = 32.0 + i * .5, dir = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]][i];
    tl.set(d, { opacity: 1 }, t);
    tl.fromTo(d, { x: dir[0] * 260, y: dir[1] * 160, scale: 1.18, filter: 'blur(10px)' }, { x: 0, y: 0, scale: 1, filter: 'blur(0px)', duration: .3, ease: 'expo.out', immediateRender: false }, t);
    tl.to(d, { scale: 1.05, duration: .2, ease: 'none' }, t + .3);
    if (i < cuts.length - 1) tl.set(d, { opacity: 0 }, t + .5);
    hit(t, .35);
  });
  tl.to(host.lastElementChild, { scale: .6, opacity: 0, filter: 'blur(14px)', duration: .45, ease: 'power3.in' }, 34.55);
  fx.push(t => {
    let s = 'Product showcase';
    if (t >= 30) s = 'Measurable impact';
    cuts.forEach(([, l], i) => { if (t >= 32 + i * .5) s = l; });
    $('#tag6t').textContent = s;
    $('#tag6').style.opacity = t < 34.6 ? 1 : 0;
  });
  [28.0, 30.0, 32.0, 32.5, 33.0, 33.5, 34.0, 34.5].forEach(t => tl.fromTo('#tag6 .chip', { scale: .75 }, { scale: 1, duration: .3, ease: 'back.out(3)', immediateRender: false }, t));
}

// ================================================================ S7 35–38  clients
show('s7', 34.98, 38.05);
{
  const names = ['ECCH · East Cork Crane Hire', 'AllTask Solutions', 'SSG Coatings', 'Kore Insulation', 'LES Loughryan', 'ProCraft', 'Hugh Courtney Ltd', 'Shannonside Galvanizing', 'Walform'];
  const host = $('#clients');
  names.forEach((n, i) => {
    const d = document.createElement('div');
    d.style.cssText = 'height:180px;border-radius:20px;background:linear-gradient(160deg,rgba(30,58,102,.75),rgba(18,35,61,.75));border:1.5px solid rgba(147,180,255,.18);display:flex;align-items:center;justify-content:center;text-align:center;padding:0 30px;font-weight:700;font-size:44px;letter-spacing:-.01em';
    d.textContent = n;
    host.appendChild(d);
    tl.fromTo(d, { rotateX: -90, opacity: 0, y: 40 }, { rotateX: 0, opacity: 1, y: 0, duration: .6, ease: 'expo.out' }, 35.1 + i * .125);
  });
  pop('#trusted', 35.0, { y: 80 });
  tl.to('#clients', { scale: 1.06, duration: 2.6, ease: 'none' }, 35.2);
  tl.to(['#clients', '#trusted'], { opacity: 0, filter: 'blur(14px)', duration: .3, ease: 'power2.in' }, 37.7);
  hit(35.0, .5);
}

// ================================================================ S8 38–45  end card
wipe(38.0);
show('s8', 37.98, 45.1);
{
  $$('#endmark .mb').forEach((g, i) => tl.fromTo(g, { x: -90 - i * 40, y: 30 - i * 25, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .7 }, 38.0 + i * .06));
  tl.fromTo('#endword', { opacity: 0, x: -40, filter: 'blur(12px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: .6 }, 38.12);
  tl.fromTo('#endlock', { scale: 1.2 }, { scale: 1, duration: 1.2 }, 38.0);
  hit(38.0, 1.1); flash(38.0, .4);
  pop('#endtag', 38.7, { y: 60 });
  tl.fromTo('#cta', { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: 'back.out(2)' }, 39.1);
  tl.fromTo('#cursor', { x: 0, y: 0, opacity: 0 }, { opacity: 1, duration: .2 }, 39.3);
  tl.to('#cursor', { x: -330, y: -265, duration: .8, ease: 'power3.inOut' }, 39.35);
  tl.to('#cursor', { scale: .82, duration: .08, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 40.2);
  tl.fromTo('#ripple', { scale: 0, opacity: 1 }, { scale: 4, opacity: 0, duration: .6, ease: 'expo.out', immediateRender: false }, 40.24);
  tl.to('#cta', { scale: .95, background: '#2563EB', duration: .08, yoyo: true, repeat: 1 }, 40.2);
  tl.to('#cursor', { x: -250, y: -150, opacity: 0, duration: .6, ease: 'power2.in' }, 40.8);
  const url = 'thisiswdi.com';
  fx.push(t => {
    const k = clamp((t - 41.0) / 1.2);
    $('#urlt').textContent = url.slice(0, Math.round(k * url.length));
    $('#caret').style.opacity = t < 41 ? 0 : (Math.floor(t * 2.5) % 2 ? .15 : 1);
  });
  tl.to('#s8', { opacity: 0, duration: .7, ease: 'power1.in' }, 44.3);
}

// ================================================================ global: camera, flash, grain
const grain = $('#grain'), gctx = grain.getContext('2d'), gimg = gctx.createImageData(480, 270);
fx.push(t => {
  let x = 0, y = 0, r = 0;
  hits.forEach(([h, s]) => { const d = t - h; if (d >= 0 && d < .5) { const a = s * Math.exp(-d * 9); x += Math.sin(d * 85) * 14 * a; y += Math.cos(d * 70) * 10 * a; r += Math.sin(d * 60) * .25 * a; } });
  const zoom = 1 + .006 * Math.sin(t * .8);
  $('#cam').style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${zoom})`;
  let f = 0; flashes.forEach(([h, s]) => { const d = t - h; if (d >= 0 && d < .6) f = Math.max(f, s * Math.exp(-d * 8)); });
  $('#flash').style.opacity = f;
  const R = rand(Math.floor(t * FPS) * 97 + 1), D = gimg.data;
  for (let i = 0; i < D.length; i += 4) { const v = R() * 255; D[i] = D[i + 1] = D[i + 2] = v; D[i + 3] = 255; }
  gctx.putImageData(gimg, 0, 0);
});

window.renderFrame = f => { const t = f / FPS; tl.seek(t, false); fx.forEach(fn => fn(t)); };
window.ready = document.fonts.ready.then(() => Promise.all($$('img').map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))).then(() => { renderFrame(0); return true; });
// realtime preview when opened directly in a browser
if (!navigator.webdriver) window.ready.then(() => { const t0 = performance.now(); (function loop() { renderFrame(Math.floor(((performance.now() - t0) / 1000 % DUR) * FPS)); requestAnimationFrame(loop); })(); });

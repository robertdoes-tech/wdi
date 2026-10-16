// Claims QA (brief section 4 and the fact rules in section 3).
// scanText checks any string; scanCopy walks copy.json and adds the
// structural rules (headline length, verbatim reviews, stat wording).

// Exact strings the brief requires that would otherwise trip a rule.
const ALLOWED = [
  'AXA Health Joint Pain Report, 2025',                                        // contains "Pain"
  '30-day satisfaction guarantee on first orders, no return obligation',       // the only permitted "guarantee"
];

const BANNED = [
  [/\bfix(es|ed|ing)?\b/i, 'fixes'],
  [/\bcur(e|es|ed|ing)\b/i, 'cures'],
  [/\btreat(s|ed|ing|ment)?\b/i, 'treats'],
  [/\bheal(s|ed|ing)?\b/i, 'heals'],
  [/\breliev(e|es|ed|ing)\b|\brelief\b/i, 'relieves'],
  [/\beras(e|es|ed|ing)\b/i, 'erases'],
  [/\bclinical(ly)?\b/i, 'clinically proven / clinically dosed'],
  [/\bdoctors?\b/i, 'doctor'],
  [/\bdos(e|es|ed|ing|age)\b/i, 'dose or dosing'],
  [/\bbest\b/i, 'best'],
  [/\bnumber (one|1)\b|\bno\.? ?1\b|#1\b/i, 'number one'],
  [/\bdetox/i, 'detox'],
  [/\banti[\s-]?ag(e|eing|ing)\b/i, 'anti-ageing'],
  [/\bpain(s|ful)?\b/i, 'pain'],
  [/\barthrit/i, 'arthritis'],
  [/\binflam/i, 'inflammation'],
  [/\b(in|within|after) (just |only )?\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?)\b/i, 'timed result'],
  [/\b(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fifteen|twenty)[\s-]+(active |key |powerful |natural )?ingredients?\b/i, 'ingredient count'],
  [/\b\d+[\s-]*in[\s-]*1\b/i, 'ingredient count'],
  [/\bmost expensive\b|\bpremium[\s-]priced\b|\bpriciest\b/i, 'premium-priced claim'],
  [/\bguarantee/i, 'guarantee outside the permitted sentence'],
  [/\bverified\b/i, '"verified" (reviews are unprompted, not verified)'],
  [/\bproven\b|\bscientifically\b|\bclinically\b|\bcertified by\b|\bendorsed\b|\bapproved by\b/i, 'third-party verification claim'],
  [/\bfor concentration\b|\benergy\b|\benergis/i, 'outcome claim from reviews'],
  [/\baching\b|\brecovery\b|\bnails?\b/i, 'outcome claim from reviews'],
  [/[£$€]\s?\d/, 'price'],
  [/★★★★★|\b5 stars?\b|\bfive stars?\b/i, 'five stars'],
  [/\b4\.8\b/, 'on-site 4.8 rating'],
  [/—/, 'em dash'],
  [/\b(ALLIUM)\b/, 'all caps (only product names may be capitalised)'],
];

export function scanText(text) {
  let t = String(text);
  for (const a of ALLOWED) t = t.split(a).join(' ');
  // "Vegetarian Society certified" is a facility/product certification the brief lists; allow it.
  t = t.replace(/Vegetarian Society certified/g, ' ');
  const hits = [];
  for (const [re, label] of BANNED) {
    const m = t.match(re);
    if (m) hits.push(`banned (${label}): "${m[0]}"`);
  }
  // all caps words other than product names and acronyms the facts use
  const caps = t.match(/\b[A-Z]{4,}\b/g) || [];
  const okCaps = new Set(['PURUS', 'MOTUS', 'MHRA', 'HPMC', 'FSSC']);
  for (const w of caps) if (!okCaps.has(w)) hits.push(`all caps word "${w}"`);
  return hits;
}

const REVIEWS = new Map([
  ['Tom Parker', ['Definitely worth while for office-based professionals!', 'smart branded box with beautiful presentation']],
  ['T Digital', ['Great packaging quality and ingredient formula', 'Definitely worth a try!']],
  ['Siména', ['highly recommend taking this supplement!']],
]);
const STATS = {
  YouGov: { text: '1 in 8 Britons feel tired all the time', source: 'YouGov, January 2022' },
  AXA: { text: 'Almost 3 in 10 UK adults get knee stiffness in the morning or after inactivity', source: 'AXA Health Joint Pain Report, 2025' },
};

function strings(o, at = '', out = []) {
  if (typeof o === 'string') out.push([at, o]);
  else if (Array.isArray(o)) o.forEach((v, i) => strings(v, `${at}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) strings(v, at ? `${at}.${k}` : k, out);
  return out;
}

export function scanCopy(content) {
  const errs = [];
  for (const [at, s] of strings(content)) for (const h of scanText(s)) errs.push(`${at}: ${h}`);

  for (const ad of content.ads) ad.variants.forEach((v, vi) => {
    const where = `ad${ad.id} variant ${vi + 1}`;
    const c = v.copy;
    const head = c.headline || c.quote;
    if (head && head.trim().split(/\s+/).length > 9) errs.push(`${where}: headline over 9 words`);
    if (c.quote) {
      const ok = REVIEWS.get(c.author);
      if (!ok) errs.push(`${where}: reviewer "${c.author}" is not on the approved list`);
      else if (!ok.includes(c.quote)) errs.push(`${where}: review line is not an approved verbatim line`);
      if (!/Trustpilot/.test(c.platform || '')) errs.push(`${where}: review must be labelled as a Trustpilot review`);
    }
    const all = JSON.stringify(c);
    if (/Britons|tired all the time/.test(all)) {
      if (!all.includes(STATS.YouGov.text)) errs.push(`${where}: YouGov stat wording changed`);
      if (c.source !== STATS.YouGov.source) errs.push(`${where}: YouGov source line must read "${STATS.YouGov.source}"`);
    }
    if (/UK adults/.test(all) && /tired/.test(all)) errs.push(`${where}: say Britons, not UK adults, for the YouGov stat`);
    if (/knee stiffness/.test(all)) {
      if (!all.includes(STATS.AXA.text)) errs.push(`${where}: AXA stat wording changed`);
      if (c.source !== STATS.AXA.source) errs.push(`${where}: AXA source line must read "${STATS.AXA.source}"`);
    }
    if (/save 2\d%/.test(all) && !/Subscribe and save 20%\. Cancel anytime\.|save 28%/.test(all)) errs.push(`${where}: offer wording changed`);
  });
  if (content.global.trustpilot.rating !== 4.5) errs.push('Trustpilot rating must be the real 4.5');
  if (!/15 reviews/.test(content.global.trustpilot.text)) errs.push('Trustpilot review count must be the real 15');
  return errs;
}

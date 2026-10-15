// Loads configs/<slug>.json, fills in defaults, and works out every path a stage needs.
// Python stages use common.py, which mirrors this file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PIPELINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const ROOT = path.dirname(PIPELINE);
export const DEFAULTS = JSON.parse(fs.readFileSync(path.join(PIPELINE, 'defaults.json'), 'utf8'));

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  return out;
}

// "env:NAME" pulls a secret from the environment so it never has to sit in git.
export function resolveSecret(v) {
  if (typeof v === 'string' && v.startsWith('env:')) return process.env[v.slice(4)] ?? '';
  return v;
}

export function fileStem(name) {
  return name.replace(/&/g, 'And').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/)
    .map(w => w[0].toUpperCase() + w.slice(1)).join('');
}

const PLACEHOLDER = /^\s*$|\[|\]|TODO|TBC|placeholder|example\.(com|org)/i;
export function placeholderFields(cfg) {
  const bad = [];
  if (!/^https?:\/\//.test(cfg.live_url || '') || PLACEHOLDER.test(cfg.live_url)) bad.push('live_url');
  const u = resolveSecret(cfg.demo_login?.user), p = resolveSecret(cfg.demo_login?.password);
  if (!u || PLACEHOLDER.test(u)) bad.push('demo_login.user');
  if (!p || PLACEHOLDER.test(p)) bad.push('demo_login.password');
  if (!cfg.logo_path || PLACEHOLDER.test(cfg.logo_path) || !fs.existsSync(path.resolve(ROOT, cfg.logo_path))) bad.push('logo_path');
  return bad;
}

export function loadConfig(slugOrPath) {
  const file = slugOrPath.endsWith('.json') ? path.resolve(slugOrPath) : path.join(ROOT, 'configs', `${slugOrPath}.json`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cfg = merge(DEFAULTS, raw);
  cfg.voice = { ...cfg.voice, voice_id: raw.voice_id || cfg.voice.voice_id };
  cfg.intro_line ||= cfg.intro.line_template.replace('{company_name}', cfg.company_name);
  cfg.file_name ||= fileStem(cfg.company_name);
  cfg.configFile = file;
  cfg.outDir = path.join(ROOT, 'output', cfg.file_name);
  cfg.buildDir = path.join(ROOT, 'build', cfg.slug);
  cfg.abs = p => (p ? path.resolve(ROOT, p) : null);
  if (cfg.script.length !== cfg.steps.length)
    throw new Error(`${cfg.slug}: script has ${cfg.script.length} lines but there are ${cfg.steps.length} steps (one line per step)`);
  return cfg;
}

// Steps that survive the audit: a step is kept only if every screen it `requires` was confirmed.
export function activeSteps(cfg) {
  const confirmed = new Set(cfg.audit?.confirmed || []);
  const dropped = new Set(cfg.audit?.dropped_steps || []);
  return cfg.steps.map((s, i) => ({ ...s, index: i, line: cfg.script[i] }))
    .filter(s => !dropped.has(s.name) && (s.requires || []).every(r => confirmed.has(r)));
}

export const chromeExe = () => process.env.CHROME || undefined;

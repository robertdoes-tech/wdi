// One entry point for the whole pipeline.
//   node pipeline/demo.mjs <slug> audit      → audit report, then STOP for review
//   node pipeline/demo.mjs <slug> build      → voice → record → assemble → qa (needs audit.approved)
//   node pipeline/demo.mjs <slug> voice|record|assemble|qa   → a single stage
//   node pipeline/demo.mjs status            → every config and whether it's ready
// Extra flags are passed through (e.g. --dry-run to voice, --preview to assemble).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadConfig, placeholderFields, activeSteps, PIPELINE, ROOT } from './lib/config.mjs';

const [target, stage = 'build', ...flags] = process.argv.slice(2);
const run = (cmd, args) => {
  console.log(`\n$ ${cmd} ${args.map(a => path.isAbsolute(a) ? path.relative(ROOT, a) : a).join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status) process.exit(r.status);
};
const pass = names => flags.filter(f => names.some(n => f.startsWith(n)));

if (!target || target === 'status') {
  for (const f of fs.readdirSync(path.join(ROOT, 'configs')).filter(f => f.endsWith('.json') && !f.startsWith('_'))) {
    const cfg = loadConfig(f.replace('.json', ''));
    const ph = placeholderFields(cfg);
    const state = ph.length ? `placeholder: ${ph.join(', ')}` : !cfg.audit?.approved ? 'needs audit review' : `ready (${activeSteps(cfg).length}/${cfg.steps.length} steps)`;
    console.log(`${cfg.slug.padEnd(32)} ${state}`);
  }
  process.exit(0);
}

const cfg = loadConfig(target);
const ph = placeholderFields(cfg).filter(f => f !== 'logo_path' || stage !== 'audit');
const test = flags.includes('--test');
if (ph.length && !test) {
  console.log(`SKIP ${cfg.company_name}: still a placeholder (${ph.join(', ')}). Fill in configs/${cfg.slug}.json.`);
  process.exit(2);
}
const node = s => run('node', [path.join(PIPELINE, s), cfg.slug, ...pass(['--write', '--test'])]);
const py = (s, f = []) => run('python3', [path.join(PIPELINE, s), cfg.slug, ...pass(f)]);
const stages = {
  audit: () => node('audit.mjs'),
  voice: () => py('voice.py', ['--dry-run', '--force', '--line']),
  record: () => node('record.mjs'),
  assemble: () => py('assemble.py', ['--preview']),
  qa: () => py('qa.py'),
};
if (stage === 'build') {
  if (!cfg.audit?.approved && !test) {
    console.log(`STOP: ${cfg.company_name} audit isn't approved. Run "audit", review output/${cfg.file_name}/audit/AUDIT.md, then set audit.approved=true.`);
    process.exit(3);
  }
  for (const s of ['voice', 'record', 'assemble', 'qa']) stages[s]();
} else if (stages[stage]) stages[stage]();
else { console.log(`unknown stage ${stage}`); process.exit(1); }

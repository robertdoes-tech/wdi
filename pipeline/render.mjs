// Renders the template (intro, outro, captions, thumbnail) in headless Chromium.
// Same approach as showreel/render.mjs: seek a paused GSAP timeline frame by frame and pipe to ffmpeg.
//   node pipeline/render.mjs <job.json>
// job: { jobs: [{ mode, format, data, out }] }  cards → .mp4, caption/thumbnail → .png
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { PIPELINE, chromeExe } from './lib/config.mjs';

const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const browser = await chromium.launch({ executablePath: chromeExe(), args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars'] });
const pages = {};
async function pageFor(format) {
  if (pages[format]) return pages[format];
  const page = await browser.newPage({ viewport: { width: format === 'square' ? 1080 : 1920, height: 1080 } });
  page.on('pageerror', e => console.log('[template error]', e.message));
  await page.goto(pathToFileURL(path.join(PIPELINE, 'template', 'template.html')).href);
  return (pages[format] = page);
}
const fileUrl = p => (p ? pathToFileURL(p).href : null);
const info = [];
for (const j of job.jobs) {
  const page = await pageFor(j.format);
  const data = { ...j.data, mode: j.mode, format: j.format, logo: fileUrl(j.data.logo), wdi_logo: fileUrl(j.data.wdi_logo), home: fileUrl(j.data.home) };
  const { frames } = await page.evaluate(d => window.setup(d), data);
  const meta = await page.evaluate(() => ({ card: window.cardInfo, caption: window.captionInfo }));
  info.push({ out: j.out, ...meta });
  fs.mkdirSync(path.dirname(j.out), { recursive: true });
  if (j.mode === 'caption' || j.mode === 'thumbnail') {
    await page.evaluate(() => window.renderFrame(0));
    await page.screenshot({ path: j.out, omitBackground: j.mode === 'caption' });
    continue;
  }
  const fps = j.data.fps || 30;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(fps), j.out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < frames; f++) {
    await page.evaluate(f => window.renderFrame(f), f);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`  ${j.mode}/${j.format}: ${frames} frames → ${path.basename(j.out)}`);
}
await browser.close();
if (job.info) fs.writeFileSync(job.info, JSON.stringify(info, null, 1));

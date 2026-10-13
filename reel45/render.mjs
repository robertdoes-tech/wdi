import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const fps = 30, total = 45 * fps;
const exe = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: exe, args: ['--disable-web-security','--allow-file-access-from-files','--force-color-profile=srgb','--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto('file://' + path.resolve('public/index.html'));
await page.evaluate(() => window.ready);
if (args.stills) {
  for (const t of args.stills.split(',')) {
    const f = Math.round(parseFloat(t) * fps);
    await page.evaluate(f => window.renderFrame(f), f);
    await page.screenshot({ path: `${args.out || 'stills'}/f_${t}.jpg`, type: 'jpeg', quality: 85 });
  }
} else {
  const out = args.out || 'build/video.mp4';
  const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-r',String(fps), out], { stdio: ['pipe','inherit','inherit'] });
  const from = +(args.from || 0), to = +(args.to || total);
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await page.evaluate(f => window.renderFrame(f), f);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`frame ${f}/${to} ${((Date.now()-t0)/1000).toFixed(1)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close();

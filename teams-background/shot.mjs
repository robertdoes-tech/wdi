import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const dir=process.argv[2];
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
for(const v of ['light','dark']){await p.goto(`file://${dir}/bg.html#${v}`);await p.reload();await p.waitForTimeout(400);
 await p.screenshot({path:`${dir}/WDI-Teams-Background-${v}.png`});}
await b.close();

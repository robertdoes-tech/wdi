import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const dir=process.argv[2];
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
for(const v of ['office','navy','ribbon']){await p.goto(`file://${dir}/background.html#${v}`);await p.reload();await p.waitForTimeout(500);
 await p.screenshot({path:`${dir}/WDI-Teams-${v[0].toUpperCase()+v.slice(1)}.png`});}
await b.close();

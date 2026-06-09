import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const btn = page.getByRole('button', { name: /understand/i });
if (await btn.count()) { await btn.first().click().catch(() => {}); }
await page.waitForTimeout(300);
await page.screenshot({ path: process.env.TEMP + '\\mcloud-shots\\hero.png' });
console.log('done');
await browser.close();

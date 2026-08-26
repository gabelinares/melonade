import { chromium } from 'playwright';
const [url, out, n] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1440,height:520}, deviceScaleFactor:3 });
const p = await c.newPage();
await p.goto(url, { waitUntil:'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
for (let i = 0; i < Number(n); i++) await p.keyboard.press('Tab');
await p.waitForTimeout(200);
const label = await p.evaluate(() => {
  const el = document.activeElement;
  return el ? `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40)}"` : 'none';
});
console.log('focused:', label);
await p.screenshot({ path: out });
console.log('shot', out);
await b.close();

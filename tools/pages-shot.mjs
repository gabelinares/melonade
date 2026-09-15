import { chromium } from 'playwright';
const [url, outDir, scheme='dark'] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:1, colorScheme: scheme });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push('pageerror: '+e.message)); p.on('console', m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(url, { waitUntil:'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);
const navTo = async (label) => {
  await p.locator('.m-nav-item__label', { hasText: new RegExp(`^${label}$`) }).first().click();
  await p.mouse.move(700, 850);
  await p.waitForTimeout(500);
};
for (const label of (process.argv[5] || 'Recordings,CoBrowse,Spot,Issues').split(',')) {
  try { await navTo(label); } catch (e) { console.log('nav fail', label, e.message.slice(0,80)); continue; }
  await p.screenshot({ path: `${outDir}/${label.toLowerCase()}-${scheme}.png` });
}
console.log('errors:', errs.slice(0,5));
await b.close();

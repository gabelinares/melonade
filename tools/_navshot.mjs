import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4310/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${out}/open-${theme}.png` });
  // the pager, cropped
  await p.locator('.m-page__foot, footer').last().screenshot({ path: `${out}/pager-${theme}.png` }).catch(() => {});
  await p.click('.m-nav [aria-label="Collapse menu"]');
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/shut-${theme}.png` });
  await p.locator('.m-nav').screenshot({ path: `${out}/nav-${theme}.png` });
  if (theme === 'light') {
    await p.hover('.m-nav__scroll .m-nav__row:nth-of-type(2)');
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/flyout.png`, clip: { x: 0, y: 0, width: 460, height: 700 } });
    // mid-transition
    await p.click('.m-nav [aria-label="Expand menu"]');
    await p.waitForTimeout(90);
    await p.locator('.m-nav').screenshot({ path: `${out}/mid.png` });
  }
  await ctx.close();
}
await b.close();
console.log('ok');

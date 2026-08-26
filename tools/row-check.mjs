/* The row was rebuilt from a <button> into a div plus a stretched target, so
 * verify the behaviour it carried still works: clicking anywhere on a row
 * selects it, and clicking the flag opens the dialog INSTEAD of selecting. */
import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4320', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);

const titleOf = () => p.locator('.b-detail__title').first().innerText();
const before = await titleOf();

/* 1. Click the row where a person would: over the title. Playwright refuses to
      click the inner <span> because the stretched button intercepts pointer
      events, which is the pattern working correctly, so click the row itself and
      let the hit test land where a real cursor would. */
await p.locator('.b-row').nth(2).click({ position: { x: 200, y: 22 } });
await p.waitForTimeout(400);
const after = await titleOf();
console.log(`click row 3 title: detail went "${before.slice(0,28)}..." -> "${after.slice(0,28)}..."  changed=${before !== after}`);

// 2. selection marker moved
const selIdx = await p.evaluate(() =>
  [...document.querySelectorAll('.b-row')].findIndex((r) => r.classList.contains('is-selected')));
console.log(`selected row index: ${selIdx} (expected 2)`);

// 3. the flag opens the dialog and does NOT change selection
const selTitleBefore = await titleOf();
await p.locator('.b-row').nth(4).locator('.b-crit').click();
await p.waitForTimeout(600);
const dialogOpen = await p.locator('.mantine-Modal-content').count();
const selTitleAfter = await titleOf();
console.log(`flag on row 5: dialog open=${dialogOpen > 0}  selection unchanged=${selTitleBefore === selTitleAfter}`);

// 4. keyboard walk still works after the restructure
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
const kBefore = await titleOf();
await p.keyboard.press('j');
await p.waitForTimeout(300);
const kAfter = await titleOf();
console.log(`J key: moved=${kBefore !== kAfter}`);

console.log(`console errors: ${errs.length}`);
for (const e of [...new Set(errs)].slice(0,2)) console.log('   ' + e.slice(0,120));
await p.screenshot({ path: process.argv[2] });
console.log('shot', process.argv[2]);
await b.close();

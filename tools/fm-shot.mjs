/* Purpose-built: open the filter menu, optionally drill into a dimension, toggle
 * some options and park the cursor on an unselected one, so the shot shows the
 * selected state and the hover state at the same time. Reports what it actually
 * found rather than failing opaquely. */
import { chromium } from 'playwright';
const [url, out, dim, sel1, sel2, hoverOn, theme] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 820 }, deviceScaleFactor: 2, colorScheme: theme || 'light' });
const p = await c.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);

await p.getByRole('button', { name: /^Filters/ }).click();
await p.waitForTimeout(400);
const dims = await p.locator('[class*="fm__dim-label"]').allInnerTexts();
console.log('dimensions:', dims.join(' | '));

if (dim) {
  await p.locator('[class*="fm__dim-row"]', { hasText: dim }).first().click();
  await p.waitForTimeout(400);
  const opts = await p.locator('[role=menuitemcheckbox], [role=menuitemradio]').allInnerTexts();
  console.log('options:', opts.map((o) => o.replace(/\s+/g, ' ').trim()).join(' | '));
  for (const v of [sel1, sel2].filter(Boolean)) {
    await p.locator('[role=menuitemcheckbox], [role=menuitemradio]', { hasText: v }).first().click();
    await p.waitForTimeout(250);
  }
  if (hoverOn) {
    await p.locator('[role=menuitemcheckbox], [role=menuitemradio]', { hasText: hoverOn }).first().hover();
    await p.waitForTimeout(350);
  }
}
console.log('errors:', errs.length);
await p.screenshot({ path: out });
console.log('shot', out);
await b.close();

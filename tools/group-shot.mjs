/* antd has no grouping, so option A fakes it with synthetic rows that colSpan
 * the table. That is exactly the kind of thing that renders as a broken row, so
 * it gets looked at rather than assumed. */
import { chromium } from 'playwright';
const [url, out, choice] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);

await p.getByRole('button', { name: /^Display/ }).click();
await p.waitForTimeout(400);
// the antd Select opens a listbox; pick the option by its text
await p.locator('#dm-group').click();
await p.waitForTimeout(350);
await p.locator('.ant-select-item-option', { hasText: choice }).first().click();
await p.waitForTimeout(400);
await p.keyboard.press('Escape');
await p.mouse.click(700, 700);
await p.waitForTimeout(500);

const headers = await p.locator('[class*="issues__group"]').allInnerTexts();
console.log('group headers rendered:', headers.map((h) => h.replace(/\s+/g, ' ').trim()).join(' | ') || '(none)');
const badge = await p.getByRole('button', { name: /^Display/ }).innerText();
console.log('display badge:', JSON.stringify(badge.trim()));
console.log('errors:', errs.length);
for (const e of [...new Set(errs)].slice(0, 2)) console.log('  ' + e.slice(0, 130));
await p.screenshot({ path: out });
console.log('shot', out);
await b.close();

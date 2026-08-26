import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1440,height:860}, colorScheme:'dark' });
const p = await c.newPage();
await p.goto('http://localhost:4320', { waitUntil:'networkidle' });
await p.waitForTimeout(400);
await p.getByRole('button', { name: /^Filters/ }).click();
await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  const el = document.querySelector('.b-fm__input input');
  if (!el) return 'no input';
  const cs = getComputedStyle(el);
  const row = document.querySelector('.b-fm__search');
  const rcs = getComputedStyle(row);
  return {
    input: { pad: cs.paddingLeft, outline: `${cs.outlineStyle} ${cs.outlineWidth}`, shadow: cs.boxShadow, border: cs.borderLeftWidth, focused: document.activeElement === el },
    row: { outline: `${rcs.outlineStyle} ${rcs.outlineWidth}`, shadow: rcs.boxShadow },
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();

import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 800 } });
const p = await c.newPage();
await p.goto('http://localhost:4310', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.getByRole('button', { name: /^Display/ }).click();
await p.waitForTimeout(600);
const r = await p.evaluate(() => {
  const sels = document.querySelectorAll('.ant-select');
  const out = { count: sels.length, rows: [] };
  for (const s of sels) {
    const item = s.querySelector('.ant-select-selection-item') || s.querySelector('[class*=selection-item]');
    const sr = s.getBoundingClientRect();
    out.rows.push({
      cls: s.className.slice(0, 30),
      hasItem: !!item,
      textLeftGap: item ? Math.round(item.getBoundingClientRect().left - sr.left) : null,
      text: item ? item.textContent.trim() : null,
    });
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();

/* Journey rows: is the node's centre on the label's first-line centre?
   Reports every step so a kind-specific offset shows up as a pattern. */
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4310/';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1680, height: 1000 }, colorScheme: 'dark' });
const p = await c.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);

await p.locator('[aria-label="Open the write-up"]').first().click();
await p.waitForTimeout(500);
await p.locator('.m-scard').first().click();
await p.waitForTimeout(900);

const rows = await p.evaluate(() => {
  const range = document.createRange();
  return [...document.querySelectorAll('.m-jrn__step')].map((step) => {
    const node = step.querySelector('.m-jrn__node');
    const label = step.querySelector('.m-jrn__label');
    const nr = node.getBoundingClientRect();
    // first LINE box of the label, not the whole element
    range.selectNodeContents(label);
    const lines = [...range.getClientRects()].filter((r) => r.height > 2);
    const first = lines[0];
    const kind = [...node.classList].find((k) => k.startsWith('m-jrn__node--')) || '';
    return {
      kind: kind.replace('m-jrn__node--', ''),
      label: label.textContent.trim().slice(0, 26),
      lines: lines.length,
      nodeMid: +(nr.top + nr.height / 2).toFixed(1),
      textMid: +(first.top + first.height / 2).toFixed(1),
      off: +(nr.top + nr.height / 2 - (first.top + first.height / 2)).toFixed(1),
      lineH: +first.height.toFixed(1),
      nodeH: +nr.height.toFixed(1),
    };
  });
});
console.table(rows);
const offs = [...new Set(rows.map((r) => r.off))];
console.log('distinct offsets:', offs.join(', '), '| rows:', rows.length);
await b.close();

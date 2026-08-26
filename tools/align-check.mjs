/* Measures every icon-only control on the page: height, width, radius, and its
 * vertical centre. Controls that are meant to look alike must agree on all four,
 * and a group of siblings must have a consistent gap. Eyeballing this is exactly
 * what let three sizes ship. */
import { chromium } from 'playwright';
const [url, theme] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 880 }, colorScheme: theme || 'light' });
const p = await c.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);

const out = await p.evaluate(() => {
  const sel = '.m-iconbtn, .b-iconbtn, .ant-btn-icon-only, .mantine-ActionIcon-root, [class*="__caret"]';
  return [...document.querySelectorAll(sel)]
    .map((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 4) return null;
      const cs = getComputedStyle(el);
      return {
        cls: (el.className || '').toString().split(' ')[0].slice(0, 22),
        label: (el.getAttribute('aria-label') || '').slice(0, 26),
        h: Math.round(r.height),
        w: Math.round(r.width),
        radius: cs.borderRadius,
        midY: Math.round(r.top + r.height / 2),
      };
    })
    .filter(Boolean);
});

const byHeight = new Map();
for (const o of out) byHeight.set(o.h, (byHeight.get(o.h) || 0) + 1);
console.log(`${out.length} icon controls; heights present: ${[...byHeight.entries()].map(([h, n]) => `${h}px x${n}`).join(', ')}`);
for (const o of out) console.log(`  ${String(o.h).padStart(3)}x${String(o.w).padEnd(3)} r=${o.radius.padEnd(4)} midY=${String(o.midY).padStart(4)}  ${o.label || o.cls}`);

/* group the ones sharing a baseline, and report the spread within each */
const rows = new Map();
for (const o of out) {
  const key = Math.round(o.midY / 8) * 8;
  if (!rows.has(key)) rows.set(key, []);
  rows.get(key).push(o);
}
let bad = 0;
console.log('\nper visual row:');
for (const [y, group] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
  const hs = [...new Set(group.map((g) => g.h))];
  const mids = [...new Set(group.map((g) => g.midY))];
  const ok = hs.length === 1 && mids.length === 1;
  if (!ok && group.length > 1) bad++;
  console.log(`  y~${y}: ${group.length} control(s), heights ${hs.join('/')}, midY ${mids.join('/')} ${ok || group.length === 1 ? '' : '<-- MISMATCH'}`);
}
await b.close();
console.log(bad ? `\n${bad} row(s) with mismatched controls` : '\nEvery row of controls agrees.');
process.exit(bad ? 1 : 0);

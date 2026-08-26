/* Tabs through the first N focusable elements and reports, for each, whether a
 * visible focus indicator actually appears. Claiming "every interactive element
 * has a focus ring" without this is exactly the kind of assertion that turns out
 * false on the one control that matters. */
import { chromium } from 'playwright';

const url = process.argv[2];
const steps = Number(process.argv[3] || 24);
const out = process.argv[4];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

const rows = [];
for (let i = 0; i < steps; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    /* Check the focused node AND its two nearest ancestors. Component kits
       routinely put the ring on a wrapper while the real focus target is an
       inner <input> with outline:none, so inspecting only activeElement reports
       a false failure on every wrapped control. */
    const chain = [el, el.parentElement, el.parentElement?.parentElement].filter(Boolean);
    const ring = (n) => {
      const cs = getComputedStyle(n);
      const w = parseFloat(cs.outlineWidth) || 0;
      return (w > 0 && cs.outlineStyle !== 'none') || cs.boxShadow !== 'none';
    };
    const cs = getComputedStyle(el);
    const visible = chain.some(ring);
    const at = chain.findIndex(ring);
    return {
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 38),
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
      ringOn: at === 0 ? 'self' : at === 1 ? 'parent' : at === 2 ? 'grandparent' : 'none',
      visible,
    };
  });
  if (info) rows.push(info);
}

const bad = rows.filter((r) => !r.visible);
console.log(`${rows.length} focusable elements walked`);
for (const r of bad) console.log(`  NO VISIBLE FOCUS: <${r.tag}> "${r.label}" outline=${r.outline}`);
if (!bad.length) console.log('  every one showed a visible focus indicator');

if (out) {
  // park focus on a mid-list control and capture it
  await page.screenshot({ path: out });
  console.log(`shot ${out}`);
}
await browser.close();
process.exit(bad.length ? 1 : 0);

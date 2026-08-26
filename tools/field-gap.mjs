/* Measures the real optical gap: from the left edge of whichever element draws
 * the field's visible boundary, to where the text actually starts.
 *
 * Padding on the input alone is the wrong metric. Ant Design nests the input
 * inside an affix wrapper that owns the border and the padding, so the inner
 * input correctly reports padding-left: 0 and a naive check calls it cramped.
 * Conversely a borderless input inside a row can carry no padding at all and be
 * genuinely flush against a focus ring drawn on itself. Only the composed
 * distance answers the question. */
import { chromium } from 'playwright';

const [url, theme] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 860 }, colorScheme: theme || 'light' });
const p = await c.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);

/* open the filter menu, then drill into a dimension so its search field renders */
await p.getByRole('button', { name: /^Filters/ }).click();
await p.waitForTimeout(350);
await p.locator('[class*="fm__dim-row"]').first().click();
await p.waitForTimeout(400);

const out = await p.evaluate(() => {
  const drawsEdge = (el) => {
    const cs = getComputedStyle(el);
    return (
      (parseFloat(cs.borderLeftWidth) || 0) > 0 ||
      (cs.outlineStyle !== 'none' && (parseFloat(cs.outlineWidth) || 0) > 0) ||
      cs.boxShadow !== 'none'
    );
  };
  const res = [];
  for (const el of document.querySelectorAll('input, textarea')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4) continue;
    // nearest ancestor (or self) that draws the visible boundary
    let owner = el, hops = 0;
    while (owner && hops < 4 && !drawsEdge(owner)) { owner = owner.parentElement; hops++; }
    const ownerRect = (owner || el).getBoundingClientRect();
    const cs = getComputedStyle(el);
    const textStart = r.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0);
    res.push({
      placeholder: el.getAttribute('placeholder') || '(none)',
      ownerCls: (owner ? owner.className : '').toString().slice(0, 40),
      ownerIsSelf: owner === el,
      gap: Math.round(textStart - ownerRect.left),
      selfPadding: Math.round(parseFloat(cs.paddingLeft) || 0),
    });
  }
  return res;
});

for (const r of out) {
  const flag = r.gap < 6 ? 'CRAMPED' : 'ok     ';
  console.log(`${flag} gap=${String(r.gap).padStart(3)}px  selfPad=${String(r.selfPadding).padStart(2)}  edgeOn=${r.ownerIsSelf ? 'self' : 'wrapper'}  "${r.placeholder}"`);
}
await b.close();
process.exit(out.some((r) => r.gap < 6) ? 1 : 0);

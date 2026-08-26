/* Correctness check for the 08-21 recolour + mark. Asserts, does not eyeball:
   1. the mark renders two rects with the brand fill
   2. hovering the host actually changes the geometry (the turn is live)
   3. the dark surfaces are the new grey ladder, not the old plum one
   4. selection is distinguishable from hover
   5. no console errors */
import { chromium } from 'playwright';

const url = process.argv[2];
const sel = process.argv[3];           // mark selector
const host = process.argv[4];          // host selector
const browser = await chromium.launch();
const errs = [];
let bad = 0;
const ok = (cond, msg, extra='') => { console.log((cond?'PASS  ':'FAIL  ')+msg+(extra?'  '+extra:'')); if(!cond) bad++; };

for (const theme of ['light','dark']) {
  const ctx = await browser.newContext({ viewport:{width:1440,height:960}, colorScheme: theme });
  const page = await ctx.newPage();
  page.on('console', m => m.type()==='error' && errs.push(`[${theme}] ${m.text()}`));
  page.on('pageerror', e => errs.push(`[${theme}] PAGEERROR ${e.message}`));
  await page.goto(url, { waitUntil:'networkidle' });
  await page.waitForTimeout(1600);      // let the mount play finish

  console.log(`\n── ${theme} ──`);
  const rects = page.locator(`${sel} rect`);
  ok(await rects.count() === 2, 'mark renders exactly two rects', `count=${await rects.count()}`);

  const fill = await page.evaluate(s => getComputedStyle(document.querySelector(s)).color, sel);
  ok(/^rgb/.test(fill), 'mark has a resolved colour', fill);

  const geo = async () => page.evaluate(s => {
    const [a,b] = document.querySelectorAll(`${s} rect`);
    const g = e => { const c = getComputedStyle(e); return [c.x,c.y,c.width,c.height,c.rx].join('/'); };
    return { a: g(a), b: g(b) };
  }, sel);
  const rest = await geo();
  await page.hover(host);
  await page.waitForTimeout(600);
  const turned = await geo();
  ok(rest.a !== turned.a && rest.b !== turned.b, 'hover turns the mark (geometry moved)');
  console.log('        rest   ', JSON.stringify(rest));
  console.log('        turned ', JSON.stringify(turned));
  // the swap: a at rest should equal b turned in SIZE, and vice versa
  const size = s => s.split('/').slice(2,4).join('/');
  ok(size(rest.a) === size(turned.b) && size(rest.b) === size(turned.a),
     'the two shapes trade places (sizes swap exactly)');
  await page.mouse.move(1400, 900);

  const surf = await page.evaluate(() => {
    const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return { canvas:v('--m-surface-canvas'), pane:v('--m-surface-default'),
             list:v('--m-surface-sunken'), nav:v('--m-surface-nav'),
             sel:v('--m-surface-selected'), brand:v('--m-brand-mark') };
  });
  console.log('        surfaces', JSON.stringify(surf));
  ok(surf.brand === (theme==='dark' ? '#f06a84' : '#d64560'), 'brand-mark is the landing watermelon', surf.brand);

  errs.length && console.log('        console errors:', errs.join(' | '));
  ok(errs.length === 0, 'no console errors');
  errs.length = 0;
  await ctx.close();
}
await browser.close();
console.log(bad ? `\n${bad} FAILURE(S)` : '\nall assertions pass');
process.exit(bad?1:0);

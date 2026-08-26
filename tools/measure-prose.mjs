import { chromium } from 'playwright';

const url = process.argv[2];
const sel = process.argv[3];
/* optional: a selector to click first, for prose that lives behind a
   disclosure. Without it the measurement silently reports an empty list. */
const clickFirst = process.argv[4];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
if (clickFirst) {
  await page.locator(clickFirst).first().click();
  await page.waitForTimeout(500);
}

const out = await page.evaluate((s) => {
  const els = [...document.querySelectorAll(s)];
  if (els.length === 0) throw new Error(`no elements matched ${s} — nothing was measured`);
  return els.slice(0, 3).map((el) => {
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    // measure the width of one line of real text by binary-splitting the content
    const probe = document.createElement('span');
    /* Set the font longhands, NOT the `font` shorthand: getComputedStyle
       returns an empty string for `font` on non-form elements in Chromium, so
       copying it silently measures the body font instead and every number
       below comes out wrong. */
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.fontStyle = cs.fontStyle;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.whiteSpace = 'pre';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    document.body.appendChild(probe);
    const text = (el.textContent || '').trim();
    probe.textContent = text.slice(0, 200);
    const per200 = probe.getBoundingClientRect().width;
    probe.textContent = '0';
    const chWidth = probe.getBoundingClientRect().width;
    probe.remove();
    const avgChar = per200 / Math.min(200, text.length);
    return {
      fontSize: cs.fontSize,
      maxWidth: cs.maxWidth,
      renderedWidth: Math.round(box.width),
      chWidth: +chWidth.toFixed(2),
      avgCharWidth: +avgChar.toFixed(2),
      charsPerLine: Math.round(box.width / avgChar),
      chPerLine: Math.round(box.width / chWidth),
    };
  });
}, sel);

console.log(JSON.stringify(out, null, 2));
await browser.close();

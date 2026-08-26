/* Confirms a story renders in the intended face rather than the fallback.
 * document.fonts.check() is the only reliable test: a computed fontFamily
 * reports the STACK, not which member actually loaded. */
import { chromium } from 'playwright';
const [url, family, sample] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1000, height: 700 } });
const p = await c.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);
const r = await p.evaluate((f) => ({
  loaded: document.fonts.check(`14px "${f}"`),
  families: [...new Set([...document.fonts].map((x) => x.family))],
}), family);
console.log(`"${family}" loaded in the preview: ${r.loaded}`);
console.log('faces present:', r.families.join(', ') || '(none)');
if (sample) {
  const used = await p.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el).fontFamily : 'selector not found';
  }, sample);
  console.log('computed stack on sample:', used);
}
await b.close();
process.exit(r.loaded ? 0 : 1);

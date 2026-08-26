/* Does the write-up fit without scrolling? Reports the actual overflow of the
 * scroll region and the height of each column, so tuning is arithmetic instead
 * of a guess. Run it at the sizes that matter, not just the one on your desk.
 *   node tools/fit-check.mjs <url> [w] [h]
 */
import { chromium } from 'playwright';
const [url, w = '1440', h = '900'] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: 'dark' });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(900);
const out = await p.evaluate(() => {
  const vp = document.querySelector('.b-ctx__scroll [data-radix-scroll-area-viewport], .b-ctx__scroll > div') ?? document.querySelector('.b-ctx__scroll');
  const art = document.querySelector('.b-wu');
  const cols = [...document.querySelectorAll('.b-wu__col')].map((c) => Math.round(c.getBoundingClientRect().height));
  const band = document.querySelector('.b-strip--cards');
  const r = (e) => (e ? Math.round(e.getBoundingClientRect().height) : null);
  return {
    available: r(document.querySelector('.b-ctx__scroll')),
    article: r(art),
    columns: cols,
    band: r(band),
    overflow: vp ? Math.max(0, (art?.scrollHeight ?? 0) + 0 - (document.querySelector('.b-ctx__scroll')?.clientHeight ?? 0)) : null,
  };
});
console.log(`${w}x${h}`, JSON.stringify(out));
console.log(out.overflow > 0 ? `  SCROLLS by ${out.overflow}px` : '  fits');
await b.close();

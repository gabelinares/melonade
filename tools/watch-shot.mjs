/* One shot of the watch depth at a given size/theme, with playback advanced so
 * the caption and the fill are not both at zero. */
import { chromium } from 'playwright';
const [url, out, theme = 'dark', w = '1440', h = '900'] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, colorScheme: theme });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
await p.locator('.b-scard').first().click();
await p.waitForTimeout(700);
await p.locator('.b-tl__track').click({ position: { x: 240, y: 18 } });
await p.waitForTimeout(500);
await p.screenshot({ path: out });
console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'clean', '->', out);
await b.close();

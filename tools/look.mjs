/* One screenshot, one file. The deliberately dumb sibling of shoot.mjs, for when
 * you need to LOOK at a single state rather than sweep a matrix.
 *   node tools/look.mjs <url> <out.png> [light|dark] [selector]
 * Pass a selector to crop to one element (the rail, a nav row, a panel). Waits
 * 1.8s before shooting so any mount animation has settled - without that the
 * brand mark is caught mid-turn and the shot lies about the resting state.
 */
import { chromium } from 'playwright';
const [url, out, theme, sel] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2, colorScheme: theme });
const p = await ctx.newPage();
await p.goto(url, { waitUntil:'networkidle' });
await p.waitForTimeout(1800);
if (sel) await p.locator(sel).screenshot({ path: out }); else await p.screenshot({ path: out });
await b.close(); console.log('wrote', out);

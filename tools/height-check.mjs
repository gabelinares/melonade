/* Reports the height of every direct child of the queue column. A flex child
 * that has quietly grown is invisible in a screenshot of the top of the pane and
 * obvious in this list. */
import { chromium } from 'playwright';
const [url, theme] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme || 'light' });
const p = await c.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const rows = await p.evaluate(() => {
  const col = document.querySelector('.b-list');
  if (!col) return null;
  return [...col.children].map((el) => ({
    cls: el.className.toString().slice(0, 34),
    h: Math.round(el.getBoundingClientRect().height),
    grow: getComputedStyle(el).flexGrow,
  }));
});
console.log(JSON.stringify(rows, null, 1));
await b.close();

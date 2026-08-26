/* Reads COMPUTED colours out of the running app and prints them as hex, because
 * a screenshot cannot tell you whether a surface is the token you think it is:
 * PNG compression, the 2x scale factor and your own eye all move the answer.
 * Every "is this still too purple" question should be settled here first.
 *   node tools/pix.mjs <url> <light|dark> '[["label","selector","cssProp"], ...]'
 * e.g. '[["fix panel",".b-detail__fix","backgroundColor"]]'
 * Also prints the first target's on-screen box, which is how you check that a
 * size prop actually reached the DOM rather than trusting the source.
 */
import { chromium } from 'playwright';
const url = process.argv[2], theme = process.argv[3] || 'dark';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, colorScheme: theme });
const p = await ctx.newPage();
await p.goto(url, { waitUntil:'networkidle' });
await p.waitForTimeout(1600);
const targets = JSON.parse(process.argv[4]);
const out = await p.evaluate(ts => ts.map(([label, sel, prop]) => {
  const el = document.querySelector(sel);
  if (!el) return [label, 'MISSING'];
  const cs = getComputedStyle(el);
  const rgb = cs[prop];
  const m = rgb.match(/\d+/g);
  const hex = m ? '#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('') : rgb;
  return [label, hex, rgb];
}), targets);
for (const r of out) console.log(r[0].padEnd(28), r[1], r[2] ?? '');
// also: is the box the right size on screen
const box = await p.evaluate(s => { const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height)]; }, targets[0][1]);
console.log('\nfirst target box:', box);
await b.close();

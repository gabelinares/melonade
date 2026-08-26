/* A dev server can serve index.html perfectly while the app dies on module
 * load, so "HTTP 200" is not "it works". This mounts it and reports what is
 * actually on screen. */
import { chromium } from 'playwright';
const [url, mustSee] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(700);
const r = await p.evaluate((needle) => {
  const root = document.getElementById('root');
  const text = (root?.innerText || '').trim();
  return { nodes: root?.querySelectorAll('*').length ?? 0, hasNeedle: text.includes(needle), rows: document.querySelectorAll('.m-issues__table tbody tr, .b-row').length };
}, mustSee);
console.log(`${url}  nodes=${r.nodes}  rows=${r.rows}  sees "${mustSee}"=${r.hasNeedle}  errors=${errs.length}`);
for (const e of [...new Set(errs)].slice(0, 3)) console.log('   ' + e.slice(0, 140));
await b.close();
process.exit(r.nodes > 50 && r.hasNeedle && errs.length === 0 ? 0 : 1);

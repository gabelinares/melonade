/* Walks the option-B flow and shoots each depth, because the whole design is a
 * TRANSITION between layouts and a screenshot of one of them proves nothing.
 *   node tools/flow-shot.mjs <url> <outDir> [light|dark]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [url, out, theme = 'dark'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);

const shot = async (name) => { await p.screenshot({ path: `${out}/${name}.png` }); console.log('  ' + name); };

console.log('depth 1 triage');
await shot('1-triage');

console.log('depth 2 watch');
await p.locator('.b-scard').first().click();
await p.waitForTimeout(700);
await shot('2-watch');

console.log('peek');
await p.locator('.b-ctx__grow').click();
await p.waitForTimeout(600);
await shot('3-peek');
await p.locator('.b-ctx__grow, [aria-label="Collapse the write-up"]').last().click();
await p.waitForTimeout(500);

console.log('depth 3 theater');
await p.locator('[aria-label^="Full width"]').click();
await p.waitForTimeout(700);
await shot('4-theater');

console.log('back out');
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
await p.keyboard.press('Escape');
await p.waitForTimeout(700);
await shot('5-back-to-triage');

console.log(errs.length ? 'CONSOLE ERRORS: ' + errs.join(' | ') : 'console clean');
await b.close();

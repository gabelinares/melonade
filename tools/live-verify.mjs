/* Loads a DEPLOYED url and asserts the app actually mounted. This exists because
 * a Vercel deploy can be "Ready" and still serve a blank page or an empty
 * directory: the alias returns 200 either way, so curl proves nothing. Checks
 * the shell rendered, the brand mark is there in the brand colour, the WIP note
 * is showing, and the console is clean.
 *   node tools/live-verify.mjs <url> <shellSelector> <markSelector> [expandSelector] [writeUpSelector]
 * Pass expandSelector where the WIP note is behind an interaction (option A puts
 * it inside an expanded row), and it will be clicked before the note is looked
 * for. Without that the WIP assertion passes on a page that never shows it.
 */
import { chromium } from 'playwright';
const [url, shell, mark] = process.argv.slice(2);
const b = await chromium.launch();
let bad = 0;
const ok = (c, m, x='') => { console.log((c?'PASS  ':'FAIL  ')+m+(x?'  '+x:'')); if(!c) bad++; };
for (const theme of ['light','dark']) {
  const ctx = await b.newContext({ viewport:{width:1440,height:900}, colorScheme: theme });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => m.type()==='error' && errs.push(m.text()));
  p.on('pageerror', e => errs.push('PAGEERROR '+e.message));
  const res = await p.goto(url, { waitUntil:'networkidle' });
  await p.waitForTimeout(1800);
  console.log(`\n── ${theme} ──`);
  ok(res.status() === 200, 'http 200', String(res.status()));
  ok(await p.locator(shell).count() === 1, `shell rendered (${shell})`);
  ok(await p.locator(mark).count() >= 1, `brand mark present (${mark})`);
  const col = await p.evaluate(s => { const e=document.querySelector(s); return e?getComputedStyle(e).color:''; }, mark);
  ok(/^rgb\(2(14|40)|^rgb\(240/.test(col), 'mark is watermelon', col);
  const expand = process.argv[5];
  if (expand) {
    await p.locator(expand).first().click();
    await p.waitForTimeout(600);
  }
  const wip = await p.getByText(/in progress/i).count();
  ok(wip >= 1, 'WIP note is showing', `matches=${wip}`);
  /* And the write-up it replaces is genuinely absent, not merely covered. Checked
     by SELECTOR, not by text: the first version matched on /suggested fix/i and
     the WIP note's own sentence contains that phrase, so it failed on a page that
     was in fact correct. */
  const detail = process.argv[6];
  if (detail) {
    const leaked = await p.locator(detail).count();
    ok(leaked === 0, `write-up is absent, not just hidden (${detail})`, `matches=${leaked}`);
  }
  errs.length && console.log('   errors:', errs.join(' | '));
  ok(errs.length === 0, 'console clean');
  await ctx.close();
}
await b.close();
console.log(bad ? `\n${bad} FAILURE(S)` : '\nlive build verified');
process.exit(bad?1:0);

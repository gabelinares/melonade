/* The same fit check, across EVERY issue in the queue. One issue fitting proves
 * nothing: titles wrap to different heights, journeys have three steps or six,
 * and the diagnosis paragraphs differ by fifty words.
 *   node tools/fit-all.mjs <url> [w] [h]
 */
import { chromium } from 'playwright';
const [url, w = '1440', h = '900'] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: 'dark' });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);

const rows = await p.locator('.b-row__select').count();
let worst = 0;
for (let i = 0; i < rows; i++) {
  await p.locator('.b-row__select').nth(i).click();
  await p.waitForTimeout(320);
  /* BOTH tabs. The taller one decides whether the pane scrolls, and it is not
     always the default: "Why it happens" is two prose columns and "What
     happened" is one small paragraph. Checking only what loads first is how a
     scroll ships. */
  const overs = [];
  for (const t of ['What happened', 'Why it happens']) {
    await p.getByRole('tab', { name: t }).click();
    await p.waitForTimeout(160);
    overs.push(await p.evaluate(() => {
      const box = document.querySelector('.b-ctx__scroll');
      const art = document.querySelector('.b-wu');
      return Math.max(0, Math.round((art?.getBoundingClientRect().height ?? 0) - (box?.clientHeight ?? 0)));
    }));
  }
  const r = await p.evaluate(() => {
    const box = document.querySelector('.b-ctx__scroll');
    const art = document.querySelector('.b-wu');
    return {
      title: document.querySelector('.b-wu__title')?.textContent ?? '?',
      steps: 0,
    };
  });
  r.over = Math.max(...overs);
  worst = Math.max(worst, r.over);
  console.log(`${r.over > 0 ? 'SCROLLS +' + String(r.over).padStart(3) : '   fits   '}  ${r.title.slice(0, 56)}`);
}
console.log(worst ? `\nworst overflow ${worst}px at ${w}x${h}` : `\nevery issue fits at ${w}x${h}`);
await b.close();
process.exit(worst > 0 ? 1 : 0);

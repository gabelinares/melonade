/* Shoots each tab of the write-up and reports the panel height in each, because
 * a tab set whose panels differ in height resizes the pane under the reader's
 * cursor every time they switch.
 *   node tools/tab-shot.mjs <url> <outDir> [light|dark]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [url, out, theme = 'dark'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(900);
for (const [label, name] of [['What happened', 'what'], ['Why it happens', 'why']]) {
  await p.getByRole('tab', { name: label }).click();
  await p.waitForTimeout(320);
  const h = await p.evaluate(() => {
    const panel = document.querySelector('.mantine-Tabs-panel');
    const inner = panel?.firstElementChild;
    return { panel: Math.round(panel?.getBoundingClientRect().height ?? 0), content: Math.round(inner?.getBoundingClientRect().height ?? 0) };
  });
  console.log(`${name.padEnd(5)} panel ${h.panel}px  content ${h.content}px`);
  await p.screenshot({ path: `${out}/${name}.png` });
}
await b.close();

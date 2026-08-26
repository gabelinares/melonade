/* Screenshot harness. Run it from the openreplay frontend dir so `playwright`
 * resolves, e.g.
 *   cd openreplay-repo/frontend && node ../../melonade-app/tools/shoot.mjs \
 *     --url http://localhost:4311 --out /tmp/shots --tag a
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};

const url = arg('url', 'http://localhost:4311');
const out = arg('out', '/tmp/shots');
const tag = arg('tag', 'a');
const only = arg('only', '');

mkdirSync(out, { recursive: true });

const SHOTS = [
  { name: 'desktop-light', w: 1440, h: 960, theme: 'light' },
  { name: 'desktop-dark', w: 1440, h: 960, theme: 'dark' },
  { name: 'wide-light', w: 1728, h: 1000, theme: 'light' },
  { name: 'laptop-light', w: 1180, h: 820, theme: 'light' },
  { name: 'narrow-light', w: 900, h: 800, theme: 'light' },
];

const browser = await chromium.launch();
let failures = 0;
const consoleErrors = [];

for (const s of SHOTS) {
  if (only && !s.name.includes(only)) continue;
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: 2,
    colorScheme: s.theme,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[${s.name}] ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`[${s.name}] PAGEERROR ${e.message}`));

  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  if (!resp || !resp.ok()) {
    console.log(`FAIL ${s.name}: HTTP ${resp ? resp.status() : 'no response'}`);
    failures++;
  }
  // let webfonts settle so the shot shows the real face, not the fallback
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const file = `${out}/${tag}-${s.name}.png`;
  await page.screenshot({ path: file });
  console.log(`shot ${file}  ${s.w}x${s.h} ${s.theme}`);

  // report horizontal overflow, which a screenshot hides
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth };
  });
  if (overflow.scrollW > overflow.clientW + 1) {
    console.log(`  ! horizontal overflow: scrollWidth ${overflow.scrollW} > clientWidth ${overflow.clientW}`);
    failures++;
  }
  await ctx.close();
}

await browser.close();

if (consoleErrors.length) {
  console.log('\nCONSOLE ERRORS:');
  for (const e of [...new Set(consoleErrors)]) console.log('  ' + e);
  failures += consoleErrors.length;
} else {
  console.log('\nNo console errors.');
}
console.log(failures ? `\n${failures} PROBLEM(S)` : '\nClean.');

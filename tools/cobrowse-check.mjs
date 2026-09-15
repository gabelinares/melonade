/* CoBrowse on the sessions table (2026-09-15): the live tab draws the same
 * filter card and the same SessionTable Sessions does, with Started and
 * Duration as sortable headers that actually reorder the rows; Sessions'
 * own Started header reorders too (it was cosmetic until today). */
import { chromium } from 'playwright';
const [url = 'http://localhost:4310/', outDir = '.'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })).newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const ok = [], bad = [];
const t = (n, c, d) => (c ? ok : bad).push(`${n}${d ? ` — ${d}` : ''}`);
const navTo = async (label) => {
  await p.locator('.m-nav-item__label', { hasText: new RegExp(`^${label}$`) }).first().click();
  await p.mouse.move(700, 850);
  await p.waitForTimeout(450);
};
const table = () => p.evaluate(() => ({
  heads: [...document.querySelectorAll('.m-ss__table th')].map((e) => e.textContent.trim()),
  sortable: [...document.querySelectorAll('.m-ss__table th.ant-table-column-has-sorters')].map((e) => e.textContent.trim()),
  on: [...document.querySelectorAll('.m-ss__table th .m-sort.is-on')].length,
  rows: [...document.querySelectorAll('.m-ss__table tbody tr')].map((r) => [...r.querySelectorAll('td')].map((c) => c.textContent.trim())),
  bar: document.querySelector('.m-sc__input')?.placeholder ?? null,
  triangles: document.querySelectorAll('.ant-table-column-sorter').length,
}));
const sec = (s) => { const m = /(?:(\d+)m )?(\d+)s/.exec(s); return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : NaN; };

/* ── CoBrowse ── */
await navTo('CoBrowse');
let s = await table();
t('COBROWSE: the live list is the sessions table', s.heads.join('|') === 'Session|Started|Duration|Location|Device|Metadata|', s.heads.join('|'));
t('COBROWSE: Started and Duration sort, nothing else', s.sortable.join('|') === 'Started|Duration', s.sortable.join('|'));
t('COBROWSE: newest first by default, and NO header claims it', s.on === 0 && s.rows[0][1].startsWith('2m'), `${s.on} on, first ${s.rows[0]?.[1]}`);
t('COBROWSE: the filter bar is there, in its own words', s.bar === 'Filter the live sessions', s.bar);
t('COBROWSE: no antd triangles anywhere on the page', s.triangles === 0, `${s.triangles}`);
await p.screenshot({ path: `${outDir}/cobrowse-after.png` });
await p.locator('.m-ss__table th', { hasText: 'Duration' }).click();
await p.waitForTimeout(300);
s = await table();
const durs = s.rows.map((r) => sec(r[2]));
t('COBROWSE: click Duration → longest first', s.on === 1 && durs.every((d, i) => i === 0 || d <= durs[i - 1]), durs.join(','));
await p.screenshot({ path: `${outDir}/cobrowse-sorted.png` });
await p.locator('.m-ss__table th', { hasText: 'Duration' }).click();
await p.waitForTimeout(300);
s = await table();
const durs2 = s.rows.map((r) => sec(r[2]));
t('COBROWSE: click again → shortest first', s.on === 1 && durs2.every((d, i) => i === 0 || d >= durs2[i - 1]), durs2.join(','));
await p.locator('.m-ss__table th', { hasText: 'Duration' }).click();
await p.waitForTimeout(300);
s = await table();
t('COBROWSE: third click → back to the default, no header marked', s.on === 0 && s.rows[0][1].startsWith('2m'), `${s.on} on, first ${s.rows[0]?.[1]}`);
await p.locator('.m-ss__table th', { hasText: 'Started' }).click();
await p.waitForTimeout(300);
s = await table();
t('COBROWSE: click Started → oldest first', s.on === 1 && s.rows[0][1].startsWith('21m'), `first ${s.rows[0]?.[1]}`);
await p.locator('.m-ss__table th', { hasText: 'Started' }).click();
await p.waitForTimeout(300);
s = await table();
t('COBROWSE: Started has two steps: second click is the default', s.on === 0 && s.rows[0][1].startsWith('2m'), `${s.on} on, first ${s.rows[0]?.[1]}`);
/* the bar narrows */
await p.locator('.m-sc__input').click();
await p.waitForTimeout(300);
const cats = await p.evaluate(() => [...document.querySelectorAll('.m-fp__cat, .m-picker__cat, [class*="cat"]')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 12));
const hasEvents = await p.evaluate(() => /Events/.test(document.querySelector('.m-panel.is-spilling')?.textContent ?? ''));
t('COBROWSE: the picker offers no events', !hasEvents, cats.join('|'));
await p.screenshot({ path: `${outDir}/cobrowse-picker.png` });
await p.keyboard.press('Escape');
await p.waitForTimeout(200);
/* the name narrows to the person */
await p.locator('.m-ss__table .m-ss__name').first().click();
await p.waitForTimeout(300);
s = await table();
t('COBROWSE: clicking a name narrows to that person', s.rows.length === 1, `${s.rows.length} rows`);

/* ── the Recordings tab: its own sort, the app's chevron ── */
await p.locator('.ant-tabs-tab', { hasText: 'Recordings' }).click();
await p.waitForTimeout(350);
const rec = await p.evaluate(() => ({
  triangles: document.querySelectorAll('.ant-table-column-sorter').length,
  chevrons: document.querySelectorAll('.m-cb__table th .m-sort').length,
}));
t('COBROWSE: the Recordings tab sorts with the app chevron, not antd triangles', rec.triangles === 0 && rec.chevrons === 2, `${rec.triangles} triangles, ${rec.chevrons} chevrons`);
await p.screenshot({ path: `${outDir}/cobrowse-recordings.png` });

/* ── Spot ── */
await navTo('Spot');
const spot = await p.evaluate(() => {
  const panel = document.querySelector('.m-panel').getBoundingClientRect();
  const card = document.querySelector('.m-spot-card').getBoundingClientRect();
  const title = document.querySelector('.m-page__title').getBoundingClientRect();
  const field = document.querySelector('.m-page__actions').getBoundingClientRect();
  const cards = [...document.querySelectorAll('.m-spot-card')].map((c) => c.getBoundingClientRect().right);
  return { inset: card.left - panel.left, title: title.left - panel.left, rightInset: panel.right - Math.max(...cards), fieldInset: panel.right - field.right };
});
/* Within 1px: the panel's own border. A table's first cell is inset by the
   same token INSIDE the same border, so cards and cell text share an edge;
   the title sits on the ground outside it. */
t('SPOT: cards start where the title starts', Math.abs(spot.inset - spot.title) <= 1, `card ${spot.inset}px, title ${spot.title}px`);
t('SPOT: cards end where the search field ends', Math.abs(spot.rightInset - spot.fieldInset) <= 1, `cards ${spot.rightInset}px, field ${spot.fieldInset}px`);
await p.screenshot({ path: `${outDir}/spot-after.png` });

/* ── Sessions: the header sort is wired ── */
await navTo('Recordings');
s = await table();
const first = s.rows[0]?.[1];
t('SESSIONS: no header marked at rest', s.on === 0, `${s.on} on`);
await p.locator('.m-ss__table th', { hasText: 'Started' }).click();
await p.waitForTimeout(300);
s = await table();
t('SESSIONS: click Started → oldest first, rows actually move', s.rows[0]?.[1] !== first && s.on === 1, `${first} → ${s.rows[0]?.[1]}`);
await p.locator('.m-ss__table th', { hasText: 'Started' }).click();
await p.waitForTimeout(300);
s = await table();
t('SESSIONS: click Started again → default, nothing marked', s.rows[0]?.[1] === first && s.on === 0, `${s.rows[0]?.[1]}, ${s.on} on`);
await p.locator('.m-ss__table th', { hasText: 'Events' }).click();
await p.waitForTimeout(300);
s = await table();
const ev = s.rows.map((r) => Number(r[2]));
t('SESSIONS: click Events → most first', ev.every((d, i) => i === 0 || d <= ev[i - 1]), ev.join(','));
await p.locator('.m-ss__table th', { hasText: 'Events' }).click();
await p.waitForTimeout(300);
s = await table();
const ev2 = s.rows.map((r) => Number(r[2]));
t('SESSIONS: click Events again → fewest first', ev2.every((d, i) => i === 0 || d >= ev2[i - 1]), ev2.join(','));
await p.locator('.m-ss__table th', { hasText: 'Events' }).click();
await p.waitForTimeout(300);
s = await table();
t('SESSIONS: third click → default', s.rows[0]?.[1] === first && s.on === 0, `${s.rows[0]?.[1]}, ${s.on} on`);
await p.screenshot({ path: `${outDir}/sessions-sorted.png` });

console.log(ok.map((l) => `  ✓ ${l}`).join('\n'));
if (bad.length) console.log(bad.map((l) => `  ✗ ${l}`).join('\n'));
console.log(`${ok.length} ok, ${bad.length} bad; console errors: ${errs.length}`);
if (errs.length) console.log(errs.slice(0, 5).join('\n'));
await b.close();
process.exit(bad.length ? 1 : 0);

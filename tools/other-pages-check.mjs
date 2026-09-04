/* The ten pages ported 2026-09-04: CoBrowse, Spot, Product Analytics
 * (Dashboards/Cards/Alerts), Data Management (Activity/People/Events/
 * Properties/Features). Modeled on agents-check.mjs.
 *
 * What this guards: every destination renders a real page (not a
 * Placeholder), search/filter/tab controls actually narrow the visible set,
 * a row opens and closes its StubDrawer, and dark mode doesn't silently
 * break a class this port introduced (the m-dm__/m-dmg__ collision class of
 * bug). Navigates by clicking, never `page.goto`, since all state here is
 * in-memory and a reload resets it.
 */
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4310/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 }, colorScheme: 'light' });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);

const ok = [], bad = [];
const t = (n, c, d) => (c ? ok : bad).push(`${n}${d ? ` — ${d}` : ''}`);

/* A single top-level row: CoBrowse, Spot. */
const navTo = async (label) => {
  await p.locator('.m-nav-item__label', { hasText: new RegExp(`^${label}$`) }).first().click();
  await p.mouse.move(900, 600);
  await p.waitForTimeout(400);
};

/* A group row's Subitem: Product Analytics' three, Data Management's five.
 * Expands the parent first if its children are not already showing. */
const groupRow = (parent) => p.locator('.m-nav__row').filter({ hasText: parent });
const section = async (parent, child) => {
  if ((await groupRow(parent).locator('.m-nav__sections').count()) === 0) {
    await p.locator('.m-nav-item__label', { hasText: new RegExp(`^${parent}$`) }).first().click();
    await p.waitForTimeout(350);
  }
  await groupRow(parent)
    .locator('.m-nav__sections .m-nav-item__label', { hasText: new RegExp(`^${child}$`) })
    .first()
    .click();
  await p.waitForTimeout(450);
};

const page = () => p.evaluate(() => ({
  title: document.querySelector('.m-page__title')?.textContent?.trim() ?? null,
  rows: document.querySelectorAll('.ant-table-tbody tr.ant-table-row').length,
  range: document.querySelector('.m-listfoot__range')?.textContent?.trim() ?? null,
  cards: document.querySelectorAll('.m-spot-card').length,
  drawerOpen: !!document.querySelector('.ant-drawer:not(.ant-drawer-hidden) .ant-drawer-title'),
}));

// ── PRODUCT ANALYTICS ───────────────────────────────────────────────────────

await section('Product Analytics', 'Dashboards');
await p.locator('.m-pa__table').waitFor();
let s = await page();
t('DASHBOARDS: the page is the page, all eleven rows', s.title === 'Dashboards' && s.rows === 11, `${s.title}, ${s.rows} rows`);
await p.locator('.m-seg__item', { hasText: 'My dashboards' }).click();
await p.waitForTimeout(250);
s = await page();
t('DASHBOARDS: the owner strip actually narrows the list', s.rows > 0 && s.rows < 11, `${s.rows} rows after "My dashboards"`);
await p.locator('.ant-table-tbody tr.ant-table-row').first().click();
await p.waitForTimeout(300);
s = await page();
t('DASHBOARDS: a row opens the StubDrawer', s.drawerOpen === true);
await p.keyboard.press('Escape');
await p.waitForTimeout(250);

await section('Product Analytics', 'Cards');
await p.locator('.m-pa__table').waitFor();
s = await page();
t('CARDS: all twelve rows', s.title === 'Cards' && s.rows === 12, `${s.title}, ${s.rows} rows`);
await p.locator('.m-seg__item', { hasText: 'Funnel' }).click();
await p.waitForTimeout(250);
s = await page();
t('CARDS: the type strip narrows the list', s.rows > 0 && s.rows < 12, `${s.rows} rows after "Funnel"`);

await section('Product Analytics', 'Alerts');
await p.locator('.m-pa__table').waitFor();
s = await page();
t('ALERTS: all eight rows, and it is a real Table (production draws a grid)',
  s.title === 'Alerts' && s.rows === 8, `${s.title}, ${s.rows} rows`);

// ── DATA MANAGEMENT ─────────────────────────────────────────────────────────

await section('Data Management', 'Activity');
await p.locator('.m-dmg__table').waitFor();
s = await page();
t('ACTIVITY: fifteen events in the default window', s.title === 'Activity' && s.rows === 15, `${s.title}, ${s.rows} rows`);
const activityFiltered = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('.m-iconbtn')].find((b) => b.getAttribute('aria-label')?.startsWith('Filter activity'));
  return !!btn;
});
t('ACTIVITY: the filter menu trigger exists', activityFiltered === true);

await section('Data Management', 'People');
await p.locator('.m-dmg__table').waitFor();
s = await page();
t('PEOPLE: all fourteen rows', s.title === 'People' && s.rows === 14, `${s.title}, ${s.rows} rows`);
const peopleAvatar = await p.evaluate(() => document.querySelectorAll('.m-savatar').length);
t('PEOPLE: reuses SessionAvatar rather than a second avatar system', peopleAvatar === 14, `${peopleAvatar} avatars`);

await section('Data Management', 'Events');
await p.locator('.m-dmg__table').waitFor();
s = await page();
t('EVENTS: all fourteen rows', s.title === 'Events' && s.rows === 14, `${s.title}, ${s.rows} rows`);
await p.locator('.m-seg__item', { hasText: 'Autocaptured' }).click();
await p.waitForTimeout(250);
s = await page();
t('EVENTS: the kind strip narrows the list', s.rows > 0 && s.rows < 14, `${s.rows} rows after "Autocaptured"`);

await section('Data Management', 'Properties');
await p.locator('.m-dmg__table').waitFor();
s = await page();
t('PROPERTIES: seven visible user properties by default (one hidden)', s.title === 'Properties' && s.rows === 7, `${s.title}, ${s.rows} rows`);
await p.locator('.ant-tabs-tab', { hasText: 'Event properties' }).click();
await p.waitForTimeout(300);
s = await page();
t('PROPERTIES: the tab switches to six visible event properties (one hidden)', s.rows === 6, `${s.rows} rows on Event properties`);
const volCol = await p.evaluate(() => document.querySelector('.ant-table-thead th:last-child')?.textContent?.trim());
t('PROPERTIES: the volume column relabels per scope', volCol === '30-day volume', volCol);

await section('Data Management', 'Features');
await p.locator('.m-dmg__table').waitFor();
s = await page();
t('FEATURES: all eight tagged elements (production’s Tags, not a flag list)', s.title === 'Features' && s.rows === 8, `${s.title}, ${s.rows} rows`);

// ── COBROWSE ─────────────────────────────────────────────────────────────

await navTo('CoBrowse');
await p.locator('.m-cb__table').waitFor();
s = await page();
t('COBROWSE: five live sessions on the Live tab', s.title === 'CoBrowse' && s.rows === 5, `${s.title}, ${s.rows} rows`);
await p.locator('.ant-tabs-tab', { hasText: 'Recordings' }).click();
await p.waitForTimeout(300);
s = await page();
t('COBROWSE: the Recordings tab is a second, independent list', s.rows === 5, `${s.rows} rows on Recordings`);

// ── SPOT ─────────────────────────────────────────────────────────────────

await navTo('Spot');
await p.waitForTimeout(300);
s = await page();
t('SPOT: nine cards, a grid rather than a table', s.title === 'Spot' && s.cards === 9 && s.rows === 0, `${s.title}, ${s.cards} cards, ${s.rows} table rows`);
await p.locator('.m-seg__item', { hasText: 'My spots' }).click();
await p.waitForTimeout(250);
s = await page();
t('SPOT: the owner strip narrows the grid', s.cards > 0 && s.cards < 9, `${s.cards} cards after "My spots"`);

// ── DARK MODE: the class-prefix collision this port could have repeated ────

await p.emulateMedia({ colorScheme: 'dark' });
await section('Data Management', 'People');
await p.waitForTimeout(350);
const darkRow = await p.evaluate(() => {
  const row = document.querySelector('.m-dmg__row');
  return row ? getComputedStyle(row).cursor : null;
});
t('DARK MODE: the m-dmg__ prefix (renamed off DisplayMenu’s m-dm__) still applies in dark mode',
  darkRow === 'pointer', darkRow);

t('no console errors', errs.length === 0, errs.slice(0, 5).join(' | '));

console.log('PASS'); ok.forEach((l) => console.log('  ✓ ' + l));
if (bad.length) { console.log('\nFAIL'); bad.forEach((l) => console.log('  ✗ ' + l)); }
await b.close();
process.exit(bad.length ? 1 : 0);

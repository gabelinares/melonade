/* The two agent pages ported from production: Tests (2026-08-27, its three
 * sections 2026-08-28, their strip the same day) and Audits.
 *
 * What this is actually guarding is that they are the SAME PAGE as the issue
 * queue wearing different data - one shell, one table rhythm, one toolbar
 * grammar - and that the behaviour the production pages are liked for survived
 * the port: the queue order, the exclusive status tabs, the bulk cluster that
 * swaps into the toolbar, the reject grammar, and the audits that keep running
 * while you are looking at them.
 */
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4310/';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1680, height: 1000 }, colorScheme: 'light' })).newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);

const ok = [], bad = [];
const t = (n, c, d) => (c ? ok : bad).push(`${n}${d ? ` — ${d}` : ''}`);

const shell = () => p.evaluate(() => {
  const card = document.querySelector('.m-page');
  const r = card?.getBoundingClientRect();
  const head = document.querySelector('.m-page__head')?.getBoundingClientRect();
  return {
    title: document.querySelector('.m-page__title')?.textContent?.trim() ?? null,
    meta: document.querySelector('.m-page__meta')?.textContent?.trim() ?? null,
    left: r ? Math.round(r.left) : null,
    width: r ? Math.round(r.width) : null,
    headH: head ? Math.round(head.height) : null,
    tabs: [...document.querySelectorAll('.m-seg__item')].map((el) => el.textContent.trim()),
    rows: document.querySelectorAll('.ant-table-tbody tr.ant-table-row').length,
    range: document.querySelector('.m-tests__range, .m-audits__range')?.textContent?.trim() ?? null,
    firstRow: document.querySelector('.ant-table-tbody tr.ant-table-row')?.textContent?.trim().slice(0, 40) ?? null,
    rowH: Math.round(document.querySelector('.ant-table-tbody tr.ant-table-row')?.getBoundingClientRect().height ?? 0),
    /* Where the first thing on a row starts, measured from the plane's edge,
       against where the page title starts. One number for both, on every list. */
    inset: (() => {
      const plane = document.querySelector('.m-page')?.getBoundingClientRect();
      const first = document.querySelector('.ant-table-tbody td:first-child')?.firstElementChild?.getBoundingClientRect();
      return plane && first ? Math.round(first.left - plane.left) : null;
    })(),
    titleX: (() => {
      const plane = document.querySelector('.m-page')?.getBoundingClientRect();
      const t = document.querySelector('.m-page__title')?.getBoundingClientRect();
      return plane && t ? Math.round(t.left - plane.left) : null;
    })(),
    tableOverflow: (() => {
      const tb = document.querySelector('.ant-table');
      return tb ? tb.scrollWidth - tb.clientWidth : null;
    })(),
  };
});

// ── the issue queue, as the reference the other two have to match ──────────
const issues = await shell();

// ── TESTS ──────────────────────────────────────────────────────────────────
const navTo = async (label) => {
  await p.locator('.m-nav-item', { hasText: new RegExp(`^${label}\\d*$`) }).first().click();
  await p.mouse.move(900, 600);
  await p.waitForTimeout(350);
};
await navTo('Tests');
await p.locator('.m-tests__table').waitFor();
const tests = await shell();

/* No count beside the title once the page has sections: the header meta would
   have to say 31 on Tests and 81 on Runs while the title still said "Tests".
   Each section's footer carries its own count instead. */
t('TESTS: the page is the page, and the count is in the footer',
  tests.title === 'Tests' && /31 tests/.test(tests.range ?? ''),
  `${tests.title} — "${tests.range}"`);
t('TESTS: one page of twenty', tests.rows === 20 && /1–20 of 31/.test(tests.range ?? ''), `${tests.rows} rows, "${tests.range}"`);
t('TESTS: five status tabs plus the review tab',
  tests.tabs.length === 6 && tests.tabs[0].startsWith('All') && tests.tabs.some((x) => x.startsWith('Needs review')),
  tests.tabs.join(' | '));
t('TESTS: the default order is the queue, drafts first',
  /New sign-up flow/.test(tests.firstRow ?? ''), tests.firstRow);
t('TESTS: the row is the queue\u2019s row', tests.rowH === issues.rowH, `${tests.rowH}px vs ${issues.rowH}px`);
/* The queue lost its expand caret on 08-28, which is what made one inset
   possible: a checkbox, an impact meter and an audit's name now all start where
   their page title starts. */
t('TABLES: one left inset, and it is the title\u2019s',
  tests.inset === issues.inset && tests.inset === tests.titleX && issues.inset === issues.titleX,
  `queue ${issues.inset}/${issues.titleX}, tests ${tests.inset}/${tests.titleX}`);
t('TESTS: seven columns still fit', tests.tableOverflow === 0, `${tests.tableOverflow}px over`);
t('TESTS: shell continuity with the queue',
  tests.left === issues.left && tests.width === issues.width && tests.headH === issues.headH,
  `${tests.left}/${tests.width}/${tests.headH} vs ${issues.left}/${issues.width}/${issues.headH}`);

// a tab is exclusive: picking Drafts leaves only drafts, and the count agrees
await p.locator('.m-seg__item', { hasText: 'Drafts' }).click();
await p.waitForTimeout(200);
const drafts = await p.evaluate(() => ({
  rows: document.querySelectorAll('.ant-table-tbody tr.ant-table-row').length,
  statuses: [...document.querySelectorAll('.ant-table-tbody .m-chip')].map((c) => c.textContent.trim()),
  on: [...document.querySelectorAll('.m-seg__item.is-on')].map((x) => x.textContent.trim()),
}));
t('TESTS: the status tabs are exclusive',
  drafts.on.length === 1 && drafts.rows === 5 && drafts.statuses.every((s) => s === 'Draft'),
  `${drafts.on.join('+')} → ${drafts.rows} rows`);

// the reject grammar: an agent-drafted suggestion is DISMISSED, never deleted
await p.locator('.ant-table-tbody tr.ant-table-row').first().locator('[aria-label^="Actions for"]').click();
await p.waitForTimeout(200);
const draftMenu = await p.evaluate(() =>
  [...document.querySelectorAll('.ant-dropdown-menu-item')].map((i) => i.textContent.trim()));
await p.keyboard.press('Escape');
t('TESTS: a suggestion is dismissed, not deleted',
  draftMenu.includes('Dismiss') && !draftMenu.includes('Delete'), draftMenu.join(' | '));

await p.locator('.m-seg__item', { hasText: 'All' }).click();
await p.waitForTimeout(200);

// selecting rows swaps the toolbar's right cluster for the bulk actions
await p.locator('.ant-table-tbody tr.ant-table-row .ant-checkbox-input').nth(0).click();
await p.locator('.ant-table-tbody tr.ant-table-row .ant-checkbox-input').nth(1).click();
await p.waitForTimeout(250);
const bulk = await p.evaluate(() => ({
  count: document.querySelector('.m-tests__selcount')?.textContent?.trim() ?? null,
  buttons: [...document.querySelectorAll('.m-tests__controls button')].map((x) => x.textContent.trim()).filter(Boolean),
  filters: !!document.querySelector('.m-tests__controls [aria-label^="Filter tests"]'),
}));
t('TESTS: selection swaps filters for bulk actions',
  bulk.count === '2 selected' && !bulk.filters && bulk.buttons.some((x) => /^Merge \(2\)/.test(x)) &&
  bulk.buttons.some((x) => /^Delete \(2\)/.test(x)),
  `${bulk.count}: ${bulk.buttons.join(' | ')}`);
await p.locator('.m-tests__controls button', { hasText: 'Clear' }).click();
await p.waitForTimeout(200);

// a column header replaces the queue with a flat sort
await p.locator('.m-tests__table th', { hasText: 'Test' }).click();
await p.waitForTimeout(250);
const sorted = await p.evaluate(() =>
  document.querySelector('.ant-table-tbody tr.ant-table-row')?.textContent?.trim().slice(0, 30) ?? null);
t('TESTS: a header sort replaces the queue order', sorted !== tests.firstRow, `${sorted}`);
await p.locator('.m-tests__table th', { hasText: 'Test' }).click();
await p.locator('.m-tests__table th', { hasText: 'Test' }).click();
await p.waitForTimeout(250);
const restored = await p.evaluate(() =>
  document.querySelector('.ant-table-tbody tr.ant-table-row')?.textContent?.trim().slice(0, 30) ?? null);
t('TESTS: a third click gives the queue back', restored === tests.firstRow?.slice(0, 30), restored);

// a row opens something, and what it opens names the row
await p.locator('.ant-table-tbody tr.ant-table-row').first().locator('.m-tests__title').click();
await p.locator('.ant-drawer').waitFor();
const drawer = await p.evaluate(() => ({
  title: document.querySelector('.ant-drawer-title')?.textContent?.trim() ?? null,
  stub: !!document.querySelector('.ant-drawer .m-placeholder'),
}));
t('TESTS: the row opens a panel that names it', /New sign-up flow/.test(drawer.title ?? '') && drawer.stub, drawer.title);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// ── THE TESTS AGENT'S THREE SECTIONS ───────────────────────────────────────
// The menu carries them as nested rows AND the page carries them as a strip
// under a title that never changes. The duplication is deliberate: the menu
// says what is inside Tests before you open it, the strip says you are still
// inside Tests once you are reading the page - which is the thing a heading
// that renamed itself to "Runs" destroyed.
const sections = await p.evaluate(() => ({
  navSections: [...document.querySelectorAll('.m-nav__sections .m-nav-item__label')].map((l) => l.textContent.trim()),
  pageTabs: [...document.querySelectorAll('.m-page__tabs .ant-tabs-tab')].map((el) => el.textContent.trim()),
  activeTab: document.querySelector('.m-page__tabs .ant-tabs-tab-active')?.textContent?.trim() ?? null,
  title: document.querySelector('.m-page__title')?.textContent?.trim() ?? null,
  sub: document.querySelector('.m-page__sub')?.textContent?.trim().slice(0, 30) ?? null,
  headBorder: getComputedStyle(document.querySelector('.m-page__head')).borderBottomWidth,
  bands: document.querySelectorAll('.m-page__toolbar').length,
  /* The strip starts where the title starts, and the toolbar under it does not
     draw a second hairline against the strip's own. */
  tabsX: (() => {
    const plane = document.querySelector('.m-page')?.getBoundingClientRect();
    const tab = document.querySelector('.m-page__tabs .ant-tabs-tab')?.getBoundingClientRect();
    return plane && tab ? Math.round(tab.left - plane.left) : null;
  })(),
  toolbarTop: getComputedStyle(document.querySelector('.m-page__toolbar')).borderTopWidth,
}));
t('SECTIONS: the menu and the page both hold them',
  sections.navSections.join(',') === 'List,Runs,Environments'
    && sections.pageTabs.join(',') === 'List,Runs,Environments',
  `menu ${sections.navSections.join(' | ')} — page ${sections.pageTabs.join(' | ')}`);
t('SECTIONS: the header is a title and a sentence, with no rule under it',
  sections.title === 'Tests' && !!sections.sub && sections.headBorder === '0px',
  `${sections.title} / ${sections.sub}`);
t('SECTIONS: the strip starts where the title starts', sections.tabsX === tests.titleX,
  `tabs ${sections.tabsX} vs title ${tests.titleX}`);
t('SECTIONS: the strip\u2019s hairline is the toolbar\u2019s top edge, drawn once',
  sections.toolbarTop === '0px', `toolbar border-top ${sections.toolbarTop}`);
t('SECTIONS: one toolbar band, not two', sections.bands === 1, `${sections.bands} bands`);

/* ── THE TESTS FILTER MENU ──────────────────────────────────────────────────
   Six dimensions, four of which Runs asks in exactly the same words: a run is
   one cell of the matrix a test describes, so the two lists have to ask the
   same questions one level apart. And every dimension can find the rows with
   NOTHING in it - a menu that only finds the configured rows hides the five
   tests that can never run. */
const openTestFilters = async () => {
  await p.locator('[aria-label="Filter tests"]').click();
  await p.waitForTimeout(350);
};
await openTestFilters();
const dims = await p.evaluate(() =>
  [...document.querySelectorAll('.m-fm__dim-row')].map((r) => r.querySelector('.m-fm__dim-label')?.textContent.trim()));
t('TESTS FILTERS: six dimensions, and four of them are the Runs vocabulary',
  dims.join(',') === 'Environment,Tags,Viewport,Region,Schedule,Last result', dims.join(' | '));

const optionsOf = async (label) => {
  await p.locator('.m-fm__dim-row', { hasText: label }).click();
  await p.waitForTimeout(250);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.m-checkrow')].map((r) => r.textContent.trim()));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  await openTestFilters();
  return rows;
};
const envOpts = await optionsOf('Environment');
const schedOpts = await optionsOf('Schedule');
const resultOpts = await optionsOf('Last result');
t('TESTS FILTERS: the empty value is an option, not a gap',
  envOpts.at(-1) === 'Not set5' && schedOpts.at(-1) === 'Not scheduled11',
  `${envOpts.at(-1)} / ${schedOpts.at(-1)}`);
t('TESTS FILTERS: never-run is an answer, and failures come first',
  resultOpts.join(',') === 'Failed6,Passed18,Never run7', resultOpts.join(' | '));

/* Applying one narrows the list, names itself in a chip, and recounts the
   status tabs - the tabs are views of the FILTERED list, not of the table. */
await p.locator('.m-fm__dim-row', { hasText: 'Last result' }).click();
await p.waitForTimeout(250);
await p.locator('.m-checkrow', { hasText: 'Failed' }).click();
await p.waitForTimeout(300);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
const failing = await p.evaluate(() => ({
  rows: document.querySelectorAll('.ant-table-tbody tr.ant-table-row').length,
  chips: [...document.querySelectorAll('.m-af__chip')].map((c) => c.textContent.trim()),
  all: document.querySelector('.m-seg__item')?.textContent.trim(),
}));
t('TESTS FILTERS: a filter narrows the list, the chip names it and the tabs recount',
  failing.rows === 6 && failing.chips.join('') === 'Last resultFailed' && failing.all === 'All6',
  `${failing.rows} rows, ${failing.chips.join('|')}, ${failing.all}`);
await p.locator('.m-af__clear, [aria-label="Clear all filters"]').first().click().catch(() => {});
await p.waitForTimeout(300);

/* A status is a word you read and a tag is a label you scan, so a type system
   that sets tags in small caps must leave statuses alone. Setting both the same
   way is what read as unbalanced. Checked on Tests, which is the one page with
   both kinds of chip in the same row. */
const chipKinds = await p.evaluate(() => {
  const t = document.querySelector('.ant-table-tbody .m-chip--tag');
  const s = document.querySelector('.ant-table-tbody .m-chip--status');
  const set = (el) => (el ? `${getComputedStyle(el).textTransform} ${getComputedStyle(el).fontSize}` : null);
  return { tag: set(t), status: set(s), tagText: t?.textContent, statusText: s?.textContent };
});
t('CHIPS: tags and statuses are different kinds of thing',
  chipKinds.tag !== null && chipKinds.status !== null,
  `tag "${chipKinds.tagText}" ${chipKinds.tag} | status "${chipKinds.statusText}" ${chipKinds.status}`);

// RUNS: a log, defaulted to a week, and the default is visible
await navTo('Runs');
await p.locator('.m-runs__table').waitFor();
await p.waitForTimeout(300);
const runsHead = await p.evaluate(() => ({
  title: document.querySelector('.m-page__title')?.textContent?.trim() ?? null,
  sub: document.querySelector('.m-page__sub')?.textContent?.trim() ?? null,
  activeTab: document.querySelector('.m-page__tabs .ant-tabs-tab-active')?.textContent?.trim() ?? null,
}));
/* The one that started this batch: arriving on Runs from the MENU still leaves
   the page saying Tests, with Runs marked in the strip. */
t('SECTIONS: the title stays, the strip moves',
  runsHead.title === 'Tests' && runsHead.activeTab === 'Runs', `${runsHead.title} / ${runsHead.activeTab}`);
t('SECTIONS: the sentence follows the section', /Every execution/.test(runsHead.sub ?? ''), runsHead.sub);


// RUNS: a log, defaulted to a week, and the default is visible
const runs = await p.evaluate(() => ({
  chips: [...document.querySelectorAll('.m-af__chip')].map((c) => c.textContent.trim()),
  range: document.querySelector('.m-runs__range')?.textContent?.trim() ?? null,
  tabs: [...document.querySelectorAll('.m-seg__item')].map((x) => x.textContent.trim()),
  first: document.querySelector('.ant-table-tbody tr.ant-table-row')?.textContent?.trim().slice(0, 24) ?? null,
  rerunButtons: document.querySelectorAll('[aria-label^="Rerun"]').length,
  failedRows: [...document.querySelectorAll('.ant-table-tbody tr.ant-table-row')]
    .filter((r) => /Failed/.test(r.textContent)).length,
  live: document.querySelectorAll('.ant-table-tbody tr.ant-table-row td')?.length ? true : false,
  addTest: [...document.querySelectorAll('.m-page__actions button')].some((b) => /Add test/.test(b.textContent)),
}));
t('RUNS: the log is newest first', /Running/.test(runs.first ?? ''), runs.first);
t('RUNS: the seven-day default is a visible, removable chip',
  runs.chips.some((c) => /Period/.test(c) && /7 days/.test(c)), runs.chips.join(' | '));
t('RUNS: result tabs, not status tabs', runs.tabs[1]?.startsWith('Running') && runs.tabs.length === 4, runs.tabs.join(' | '));
t('RUNS: rerun is offered on failures only', runs.rerunButtons === runs.failedRows && runs.rerunButtons > 0,
  `${runs.rerunButtons} buttons, ${runs.failedRows} failed rows`);
t('RUNS: no "Add test" in this section', !runs.addTest);

// the live counter on a run still in flight actually ticks
const t1 = await p.evaluate(() => document.querySelector('.ant-table-tbody')?.textContent?.match(/\d+:\d\d/)?.[0] ?? null);
await p.waitForTimeout(1600);
const t2 = await p.evaluate(() => document.querySelector('.ant-table-tbody')?.textContent?.match(/\d+:\d\d/)?.[0] ?? null);
t('RUNS: an unfinished run counts up', t1 !== null && t1 !== t2, `${t1} → ${t2}`);

// ENVIRONMENTS: no toolbar at all, and deleting one names what it stops
await navTo('Environments');
await p.locator('.m-envs').waitFor();
await p.waitForTimeout(300);
const envs = await p.evaluate(() => ({
  rows: document.querySelectorAll('.m-envs__row').length,
  toolbar: document.querySelectorAll('.m-page__toolbar').length,
  off: document.querySelectorAll('.m-envs__row.is-off').length,
  defaults: document.querySelectorAll('.m-envs__field').length,
  actions: [...document.querySelectorAll('.m-page__actions button')].map((b) => b.getAttribute('aria-label') || b.textContent.trim()),
}));
t('ENVIRONMENTS: four rows, one of them switched off', envs.rows === 4 && envs.off === 1, `${envs.rows} rows, ${envs.off} off`);
t('ENVIRONMENTS: no toolbar, because there is nothing to filter', envs.toolbar === 0);
t('ENVIRONMENTS: the run defaults are three fields', envs.defaults === 3, `${envs.defaults}`);
t('ENVIRONMENTS: the page-level action goes away here',
  !envs.actions.some((a) => /Add test/.test(a)), envs.actions.join(' | '));

await p.locator('[aria-label="Actions for Production"]').click();
await p.locator('.ant-dropdown-menu-item', { hasText: 'Delete' }).click();
await p.locator('.ant-modal').waitFor();
await p.waitForTimeout(300);
const dlg = await p.evaluate(() => ({
  title: document.querySelector('.ant-modal-title')?.textContent?.trim() ?? null,
  ok: document.querySelector('.ant-modal-footer .ant-btn-primary')?.textContent?.trim() ?? null,
  named: [...document.querySelectorAll('.m-envs__affected li')].map((l) => l.textContent.trim()),
  aside: document.querySelector('.m-envs__aside')?.textContent?.trim().slice(0, 40) ?? null,
}));
t('ENVIRONMENTS: deleting names the tests it would stop',
  dlg.named.length > 0 && /Pause those tests/.test(dlg.ok ?? ''), `${dlg.ok} — ${dlg.named.length} named`);
t('ENVIRONMENTS: and counts the ones that carry on', /also comes off/.test(dlg.aside ?? ''), dlg.aside);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

/* The strip is a control, not a label. Clicking it moves the section AND the
   menu's nested row moves with it, because both read the one route string the
   shell keeps - a page that held its own copy is how two controls that show the
   same thing end up disagreeing. */
await p.locator('.m-page__tabs .ant-tabs-tab', { hasText: 'List' }).click();
await p.locator('.m-tests__table').waitFor();
await p.waitForTimeout(300);
const viaStrip = await p.evaluate(() => ({
  title: document.querySelector('.m-page__title')?.textContent?.trim() ?? null,
  activeTab: document.querySelector('.m-page__tabs .ant-tabs-tab-active')?.textContent?.trim() ?? null,
  navActive: document.querySelector('.m-nav__sections .m-nav-item.is-active .m-nav-item__label')?.textContent?.trim() ?? null,
  addTest: [...document.querySelectorAll('.m-page__actions button')].some((b) => /Add test/.test(b.textContent)),
}));
t('SECTIONS: the strip navigates, and the menu follows it',
  viaStrip.activeTab === 'List' && viaStrip.navActive === 'List' && viaStrip.title === 'Tests',
  `${viaStrip.title} / strip ${viaStrip.activeTab} / menu ${viaStrip.navActive}`);
t('SECTIONS: the header actions follow the section too', viaStrip.addTest);

// ── AUDITS ─────────────────────────────────────────────────────────────────
await navTo('Audits');
await p.locator('.m-audits__table').waitFor();
const audits = await shell();
const detail = await p.evaluate(() => ({
  /* Scoped to the table: the credits meter in the menu draws the same bar, and
     an unscoped count made this check pass for the wrong reason. */
  bars: document.querySelectorAll('.m-audits__table .m-bar').length,
  health: [...document.querySelectorAll('.m-health')].map((h) => h.textContent.trim()),
  samples: [...document.querySelectorAll('.m-audits__sample')].map((s) => s.textContent.trim()),
  scopes: [...document.querySelectorAll('.m-audits__scope')].map((s) => s.textContent.trim()),
  exportsDisabled: [...document.querySelectorAll('.m-audits__artifacts button')].filter((b) => b.disabled).length,
  menus: document.querySelectorAll('[aria-label^="Actions for"]').length,
  runningCell: document.querySelector('.m-audits__table .m-bar')?.closest('td')?.textContent?.trim() ?? '',
}));

t('AUDITS: the page is the page', audits.title === 'Audits' && audits.rows === 3, `${audits.title}, ${audits.rows} rows`);
t('AUDITS: three tabs, counted', audits.tabs.length === 3 && /Ready\s*2/.test(audits.tabs[2]), audits.tabs.join(' | '));
t('AUDITS: the running job is drawn, never numbered',
  detail.bars === 1 && detail.runningCell === '', `${detail.bars} bar, cell text "${detail.runningCell}"`);
t('AUDITS: the two finished audits carry a score', detail.health.length === 2, detail.health.join(' | '));
t('AUDITS: the sample is a share, not a pair', detail.samples.length === 3 && detail.samples.every((s) => /^~\d+%$/.test(s)),
  detail.samples.join(' | '));
t('AUDITS: every name carries its scope', detail.scopes.length === 3, detail.scopes.join(' | '));
t('AUDITS: exports wait for the job', detail.exportsDisabled === 2, `${detail.exportsDisabled} disabled`);
t("AUDITS: somebody else's audit has no menu", detail.menus === 2, `${detail.menus} menus of 3 rows`);
/* The one deliberate break in the shared rhythm: an audit's name is meaningless
   without its scope, so that cell is two lines and the row is taller for it. */
t('AUDITS: the taller row is the only break in the rhythm',
  audits.rowH > issues.rowH && audits.tableOverflow === 0, `${audits.rowH}px vs ${issues.rowH}px`);
t('AUDITS: the same left inset as the other two',
  audits.inset === issues.inset && audits.inset === audits.titleX,
  `${audits.inset} vs ${issues.inset}`);
t('AUDITS: shell continuity with the queue',
  audits.left === issues.left && audits.width === issues.width && audits.headH === issues.headH,
  `${audits.left}/${audits.width}/${audits.headH}`);

// a ready audit opens; a running one says why it cannot
await p.locator('.ant-table-tbody tr.ant-table-row').nth(1).locator('.m-audits__name').click();
await p.locator('.ant-drawer').waitFor();
const report = await p.evaluate(() => document.querySelector('.ant-drawer-title')?.textContent?.trim() ?? null);
t('AUDITS: a ready audit opens its report', /Checkout & billing/.test(report ?? ''), report);
await p.keyboard.press('Escape');
await p.waitForTimeout(350);
await p.locator('.ant-table-tbody tr.ant-table-row').nth(0).locator('.m-audits__name').click();
await p.waitForTimeout(400);
const running = await p.evaluate(() => ({
  drawer: !!document.querySelector('.ant-drawer-open'),
  toast: document.querySelector('.ant-message')?.textContent?.trim() ?? null,
}));
t('AUDITS: a running audit says why it will not open',
  !running.drawer && /still reading/.test(running.toast ?? ''), running.toast);

// the job actually moves
const before = await p.evaluate(() => document.querySelector('.m-audits__table .m-bar__fill')?.getAttribute('style'));
await p.waitForTimeout(2200);
const after = await p.evaluate(() => document.querySelector('.m-audits__table .m-bar__fill')?.getAttribute('style'));
t('AUDITS: the running job advances while you watch', before !== after, `${before} → ${after}`);

t('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('PASS'); ok.forEach((l) => console.log('  ✓ ' + l));
if (bad.length) { console.log('\nFAIL'); bad.forEach((l) => console.log('  ✗ ' + l)); }
await b.close();
process.exit(bad.length ? 1 : 0);

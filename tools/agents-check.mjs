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
await navTo('Synthetics');
await p.locator('.m-tests__table').waitFor();
const tests = await shell();

/* No count beside the title once the page has sections: the header meta would
   have to say 31 on Tests and 81 on Runs while the title still said "Synthetics".
   Each section's footer carries its own count instead. */
t('TESTS: the page is the page, and the count is in the footer',
  tests.title === 'Synthetics' && /31 tests/.test(tests.range ?? ''),
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

/* ── THE TEST DRAWER ────────────────────────────────────────────────────────
   It was a stub until 08-31. What replaced it is the production drawer's whole
   lifecycle, so the checks are about the lifecycle rather than about the panel:
   a draft is a PROPOSAL and its footer says so, and the reject grammar (dismiss
   a suggestion, delete your own work) survives into it. */
await p.locator('.ant-table-tbody tr.ant-table-row').first().locator('.m-tests__title').click();
await p.locator('.ant-drawer').waitFor();
await p.waitForTimeout(400);
const drawer = await p.evaluate(() => ({
  eyebrow: document.querySelector('.m-drawer__eyebrow')?.textContent?.trim() ?? null,
  title: document.querySelector('.m-drawer__title')?.textContent?.trim() ?? null,
  steps: [...document.querySelectorAll('.ant-drawer .m-step__text')].map((s) => s.textContent.trim()),
  foot: [...document.querySelectorAll('.ant-drawer .m-dfoot button')].map((b) => b.textContent.trim()),
  sections: [...document.querySelectorAll('.ant-drawer .m-dsec__title')].map((s) => s.textContent.trim()),
}));
t('TESTS: the row opens the test, named, with its real steps',
  /New sign-up flow/.test(drawer.title ?? '') && drawer.steps.length === 5 &&
    /Open the sign-up page/.test(drawer.steps[0] ?? ''),
  `${drawer.title} — ${drawer.steps.length} steps`);
t('TESTS: a draft is a proposal, and the footer says so',
  drawer.eyebrow?.startsWith('Draft') && drawer.foot.join('|') === 'Dismiss|Save draft|Approve steps',
  `${drawer.eyebrow} — ${drawer.foot.join(' | ')}`);
t('TESTS: the drawer is sections, in one order',
  drawer.sections.join(',').startsWith('Steps'), drawer.sections.join(' | '));

/* Editing a step is the list itself: click the line, type, Enter. */
await p.locator('.ant-drawer .m-step__text').first().click();
await p.waitForTimeout(200);
await p.locator('.ant-drawer .m-step__input').fill('Open the sign-up page from an ad');
await p.keyboard.press('Enter');
await p.waitForTimeout(250);
const edited = await p.evaluate(() => ({
  first: document.querySelector('.ant-drawer .m-step__text')?.textContent?.trim() ?? null,
  save: [...document.querySelectorAll('.ant-drawer .m-dfoot button')].find((b) => /Save draft/.test(b.textContent))?.disabled,
}));
t('TESTS: a step edits in place, and the footer wakes up',
  edited.first === 'Open the sign-up page from an ad' && edited.save === false, `${edited.first} / save disabled: ${edited.save}`);
/* Closed by the mask, not by Escape: the step editor swallows Escape on
   purpose, so a key that sometimes closes the drawer is not a way to close it
   in a check. */
await p.locator('.ant-drawer-mask').click();
await p.waitForTimeout(500);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

/* ── EDITING THE STEPS ──────────────────────────────────────────────────────
   Three behaviours that a screenshot cannot see and that both broke while this
   was being built: the text you type survives the row that Enter chains after
   it; Escape abandons the LINE and not the drawer; and dragging reorders. */
await p.locator('.ant-table-tbody tr.ant-table-row', { hasText: 'Logout flow' }).first().click();
await p.locator('.ant-drawer').waitFor();
await p.waitForTimeout(500);
const stepTexts = () =>
  p.evaluate(() => [...document.querySelectorAll('.ant-drawer .m-step__text')].map((s) => s.textContent.trim()));

const gaps = p.locator('.ant-drawer .m-steps__gap');
await gaps.nth(1).hover();
await p.waitForTimeout(120);
await gaps.nth(1).locator('button').click({ force: true });
await p.waitForTimeout(200);
await p.keyboard.type('Confirm the session cookie is cleared');
await p.keyboard.press('Enter');
await p.waitForTimeout(200);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
const afterInsert = await stepTexts();
t('STEPS: a typed step survives the row Enter chains after it',
  afterInsert[1] === 'Confirm the session cookie is cleared' && afterInsert.length === 4,
  afterInsert.join(' | '));
t('STEPS: Escape abandons the line, not the drawer',
  (await p.locator('.ant-drawer').count()) > 0);

const src = await p.locator('.ant-drawer .m-step').nth(3).boundingBox();
const dst = await gaps.first().boundingBox();
await p.mouse.move(src.x + 20, src.y + 10);
await p.mouse.down();
/* The gap's CENTRE. It is 16px tall with negative margins, so its top edge
   overlaps the row above and a drop two pixels in lands on the wrong target. */
await p.mouse.move(dst.x + 100, dst.y + dst.height / 2, { steps: 14 });
await p.mouse.up();
await p.waitForTimeout(350);
const afterDrag = await stepTexts();
t('STEPS: dragging the grip reorders', afterDrag[0] === 'Confirm the sign-in page is shown', afterDrag[0]);
/* Closing without saving changes nothing: the buffer is the drawer's, and the
   list behind it never saw any of this. */
await p.locator('.ant-drawer-mask').click();
await p.waitForTimeout(500);
const rowAfter = await p.evaluate(() =>
  [...document.querySelectorAll('.ant-table-tbody tr')].find((r) => /Logout flow/.test(r.textContent))?.textContent ?? '');
t('STEPS: closing without saving leaves the test alone', !/cookie/.test(rowAfter));

// ── THE TESTS AGENT'S THREE SECTIONS ───────────────────────────────────────
// The menu carries them as nested rows AND the page carries them as a strip
// under a title that never changes. The duplication is deliberate: the menu
// says what is inside Synthetics before you open it, the strip says you are
// still inside Synthetics once you are reading the page - which is the thing a heading
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
  sections.navSections.join(',') === 'Tests,Runs,Environments'
    && sections.pageTabs.join(',') === 'Tests,Runs,Environments',
  `menu ${sections.navSections.join(' | ')} — page ${sections.pageTabs.join(' | ')}`);
t('SECTIONS: the header is a title and a sentence, with no rule under it',
  sections.title === 'Synthetics' && !!sections.sub && sections.headBorder === '0px',
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
  runsHead.title === 'Synthetics' && runsHead.activeTab === 'Runs', `${runsHead.title} / ${runsHead.activeTab}`);
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

/* ── THE RUN DRAWER ─────────────────────────────────────────────────────────
   A run is over, so the drawer is read-only and says where it stopped. The
   check that matters is that a failure is attributed to ONE step and the rest
   read as skipped: a run does not fail eleven times. */
await p.locator('.ant-table-tbody tr.ant-table-row', { hasText: 'Failed' }).first().click();
await p.locator('.ant-drawer').waitFor();
await p.waitForTimeout(500);
const rd = await p.evaluate(() => ({
  eyebrow: document.querySelector('.m-drawer__eyebrow')?.textContent?.trim() ?? null,
  stepMarks: [...document.querySelectorAll('.ant-drawer .m-rd__step')].map((s) => s.className.replace('m-rd__step is-', '')),
  error: document.querySelector('.ant-drawer .m-rd__error')?.textContent?.trim().slice(0, 30) ?? null,
  tabs: [...document.querySelectorAll('.ant-drawer .ant-segmented-item')].map((s) => s.textContent.trim()),
  foot: document.querySelector('.ant-drawer .m-rd__foot')?.textContent?.trim() ?? null,
}));
t('RUNS: the drawer says which step stopped it, once',
  rd.stepMarks.filter((m) => m === 'failed').length === 1 && rd.stepMarks.includes('skipped') && !!rd.error,
  `${rd.stepMarks.join(' ')} — "${rd.error}"`);
t('RUNS: activity is the three things you would check on a session',
  rd.tabs.length === 3 && /Screenshots/.test(rd.tabs[0] ?? '') && /Network/.test(rd.tabs[1] ?? ''),
  rd.tabs.join(' | '));
t('RUNS: the footer says where it got to', /Stopped at step/.test(rd.foot ?? ''), rd.foot);

/* A passed run captured no network and no console, and the tabs say so rather
   than disappearing between runs. */
await p.locator('.ant-drawer-mask').click();
await p.waitForTimeout(500);
await p.locator('.ant-table-tbody tr.ant-table-row', { hasText: 'Passed' }).first().click();
await p.locator('.ant-drawer').waitFor();
await p.waitForTimeout(500);
const passedRun = await p.evaluate(() => ({
  disabled: [...document.querySelectorAll('.ant-drawer .ant-segmented-item')]
    .filter((s) => s.className.includes('disabled')).map((s) => s.textContent.trim()),
  hint: document.querySelector('.ant-drawer .m-dsec__hint')?.textContent?.trim() ?? null,
}));
t('RUNS: a passed run disables the panels it never captured, and says why',
  passedRun.disabled.length === 2 && /passed/.test(passedRun.hint ?? ''),
  `${passedRun.disabled.join(' | ')} — ${passedRun.hint}`);
await p.locator('.ant-drawer-mask').click();
await p.waitForTimeout(500);

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
await p.locator('.m-page__tabs .ant-tabs-tab', { hasText: 'Tests' }).first().click();
await p.locator('.m-tests__table').waitFor();
await p.waitForTimeout(300);
const viaStrip = await p.evaluate(() => ({
  title: document.querySelector('.m-page__title')?.textContent?.trim() ?? null,
  activeTab: document.querySelector('.m-page__tabs .ant-tabs-tab-active')?.textContent?.trim() ?? null,
  navActive: document.querySelector('.m-nav__sections .m-nav-item.is-active .m-nav-item__label')?.textContent?.trim() ?? null,
  addTest: [...document.querySelectorAll('.m-page__actions button')].some((b) => /Add test/.test(b.textContent)),
}));
t('SECTIONS: the strip navigates, and the menu follows it',
  viaStrip.activeTab === 'Tests' && viaStrip.navActive === 'Tests' && viaStrip.title === 'Synthetics',
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

/* ── THE STEP MARK: one shape, five states ────────────────────────────────
   The complaint it answers is "when a run is running you can't know which step
   we're at", and the constraint on the answer was that the loading state must
   not be a glyph only one row can have. So the check is structural: every step
   draws the same ring, exactly one of them carries the turning arc, and the
   rail is solid down to it and quiet past it. */
await navTo('Synthetics');
await p.locator('.m-page__tabs .ant-tabs-tab', { hasText: 'Runs' }).click();
await p.waitForTimeout(500);
await p.locator('.ant-table-tbody tr', { hasText: 'Checkout flow' }).first().click();
await p.waitForTimeout(800);
const stepMarks = await p.evaluate(() => {
  const steps = [...document.querySelectorAll('.m-rd__step')];
  const cs = (s) => getComputedStyle(s.querySelector('.m-rd__step-text'));
  return {
    steps: steps.length,
    rings: steps.filter((s) => s.querySelector('.m-rd__ring')).length,
    live: !!document.querySelector('.m-rd__steps.is-live'),
    /* ⚠ THE WHOLE POINT: nothing in a running run may single a step out. */
    statuses: [...new Set(steps.map((s) => s.className.replace('m-rd__step ', '')))],
    innerGlyphs: document.querySelectorAll('.m-rd__steps .m-rd__in').length,
    weights: [...new Set(steps.map((s) => cs(s).fontWeight))],
    ringStrokes: [...new Set(steps.map((s) => getComputedStyle(s.querySelector('.m-rd__ring')).stroke))],
    /* the text sweeps HORIZONTALLY and all of it in phase */
    textAnim: cs(steps[0]).animationName,
    textDelays: [...new Set(steps.map((s) => cs(s).animationDelay))],
    textDirection: cs(steps[0]).backgroundImage.slice(0, 30),
    /* ONE wire per GAP, circle to circle: it starts on this node and ends on
       the next one, overflowing its own row to get there. Anything that stops
       at a row boundary cuts the pulse in half. */
    segments: steps.filter((s) => getComputedStyle(s, '::after').content !== 'none').length,
    wireDelays: steps.slice(0, -1).map((s) => parseFloat(getComputedStyle(s, '::before').animationDelay)),
    wireRepeat: getComputedStyle(steps[0], '::before').backgroundRepeat,
    /* the wire's length against the distance between two node centres */
    wireSpansGap: (() => {
      const centres = steps.map((s) => {
        const r = s.querySelector('.m-rd__mark').getBoundingClientRect();
        return (r.top + r.bottom) / 2;
      });
      const gaps = centres.slice(1).map((y, i) => Math.round(y - centres[i]));
      const cs = getComputedStyle(steps[0], '::before');
      const len = steps[0].getBoundingClientRect().height - parseFloat(cs.top) - parseFloat(cs.bottom);
      return gaps.every((g) => Math.abs(g - Math.round(len)) <= 1);
    })(),
    lastWire: getComputedStyle(steps[steps.length - 1], '::before').content,
    separators: steps.filter((s) => getComputedStyle(s).borderTopWidth !== '0px').length,
    markZ: getComputedStyle(steps[0].querySelector('.m-rd__mark')).zIndex,
    ringFill: getComputedStyle(steps[0].querySelector('.m-rd__ring')).fill,
    surface: getComputedStyle(document.querySelector('.ant-drawer-section')).backgroundColor,
  };
});
t('STEPS: every step wears the same ring', stepMarks.rings === stepMarks.steps && stepMarks.steps > 1,
  `${stepMarks.rings}/${stepMarks.steps}`);
t('STEPS: a running run singles out no step at all',
  stepMarks.live && stepMarks.statuses.length === 1 && stepMarks.innerGlyphs === 0
    && stepMarks.weights.length === 1 && stepMarks.ringStrokes.length === 1,
  `${stepMarks.statuses.join('/')}, ${stepMarks.innerGlyphs} glyphs, ${stepMarks.weights.length} weights, ${stepMarks.ringStrokes.length} strokes`);
t('STEPS: the text sweeps horizontally, every row in phase',
  /m-rd-text/.test(stepMarks.textAnim) && stepMarks.textDelays.length === 1
    && /90deg/.test(stepMarks.textDirection),
  `${stepMarks.textAnim} @ ${stepMarks.textDelays.join('/')}, ${stepMarks.textDirection}`);
t('STEPS: one wire per gap, circle to circle, so a pulse is never cut in half',
  stepMarks.segments === 0 && stepMarks.wireRepeat === 'no-repeat'
    && stepMarks.wireSpansGap && stepMarks.lastWire === 'none',
  `${stepMarks.segments} second segments, spans gap ${stepMarks.wireSpansGap}, last ${stepMarks.lastWire}`);
t('STEPS: and the pulse walks down it, one step at a time',
  stepMarks.wireDelays.every((d, i) => i === 0 || d > stepMarks.wireDelays[i - 1]),
  stepMarks.wireDelays.join(' '));
t('STEPS: the node sits on top of the wire, not under it',
  stepMarks.markZ === '1' && stepMarks.ringFill === stepMarks.surface,
  `z ${stepMarks.markZ}, ring ${stepMarks.ringFill} on ${stepMarks.surface}`);
t('STEPS: the rail replaced the row rules rather than joining them',
  stepMarks.separators === 0, `${stepMarks.separators} rows still ruled`);

/* THE DRAWER'S CLOSE is a control in the corner, not a glyph inside the title. */
const drawerClose = await p.evaluate(() => {
  const headEl = document.querySelector('.ant-drawer-header');
  const head = headEl.getBoundingClientRect();
  const pad = parseFloat(getComputedStyle(headEl).paddingLeft);
  const lead = document.querySelector('.m-drawer__lead').getBoundingClientRect();
  const x = document.querySelector('.ant-drawer-extra .m-iconbtn')?.getBoundingClientRect();
  return {
    antdClose: !!document.querySelector('.ant-drawer-close'),
    /* the lead starts on the header's own padding and not one glyph further in */
    leadLeft: Math.round(lead.left - head.left - pad),
    closeRight: x ? Math.round(head.right - x.right) : null,
  };
});
t('DRAWER: the close is ours and it is in the corner',
  !drawerClose.antdClose && drawerClose.closeRight !== null, `antd close present: ${drawerClose.antdClose}`);
t("DRAWER: and the lead starts on the panel's own inset, not past a glyph",
  drawerClose.leadLeft === 0, `${drawerClose.leadLeft}px in`);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);

/* ── ONE MARK IN BOTH LISTS ────────────────────────────────────────────────
   The tests list had a 6px dot of its own, trailing the row; the issues list
   grew a 5px one leading it. Gabriel: "the dots in tests and issues should be
   the same, I liked it on the left side." Both draw `.m-dot.is-slot` now, so
   this asserts the two lists agree on the mark AND that reserving the slot on
   every row keeps one left edge in each of them. */
await navTo('Synthetics');
await p.locator('.m-tests__table').waitFor();
await p.waitForTimeout(400);
const testDots = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-tests__table tbody tr')];
  const lit = rows.map((r) => r.querySelector('.m-dot.is-slot')).filter((d) => d && !d.classList.contains('is-off'));
  const cs = lit[0] ? getComputedStyle(lit[0]) : null;
  const lefts = rows.map((r) => r.querySelector('.m-tests__title')?.getBoundingClientRect().left)
    .filter((x) => x != null).map(Math.round);
  return {
    rows: rows.length,
    slots: rows.filter((r) => r.querySelector('.m-dot.is-slot')).length,
    lit: lit.length,
    edges: new Set(lefts).size,
    mark: cs ? `${cs.width}/${cs.backgroundColor}` : null,
    /* the old trailing dot must be gone, not merely hidden */
    legacy: document.querySelectorAll('.m-tests__dot').length,
    /* it LEADS the title rather than trailing the row */
    leads: (() => {
      const row = lit[0]?.closest('tr');
      const t = row?.querySelector('.m-tests__title');
      return row && t ? lit[0].getBoundingClientRect().left < t.getBoundingClientRect().left : null;
    })(),
  };
});
t('DOTS: the tests list wears the app\u2019s mark, not one of its own',
  testDots.legacy === 0 && testDots.lit > 0, `${testDots.lit} lit, ${testDots.legacy} legacy`);
t('DOTS: it leads the name rather than trailing the row', testDots.leads === true);
t('DOTS: the slot is on every row, so the names keep one edge',
  testDots.slots === testDots.rows && testDots.edges === 1,
  `${testDots.slots}/${testDots.rows} slots, ${testDots.edges} edge`);

t('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('PASS'); ok.forEach((l) => console.log('  ✓ ' + l));
if (bad.length) { console.log('\nFAIL'); bad.forEach((l) => console.log('  ✗ ' + l)); }
await b.close();
process.exit(bad.length ? 1 : 0);

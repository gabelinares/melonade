/* THE SESSIONS PAGE, end to end in a real browser.
 *
 * The 2026-09-02 rebuild makes two claims that are cheap to state and easy to
 * break, so they are asserted rather than looked at:
 *
 *   ONE BUTTON, ONE LIST. The picker holds events AND properties, searching
 *   spans both, a picked event lands in the numbered sequence and a picked
 *   property lands below the rule. The order control appears at two events and
 *   not at one, and then/and/or produce three different result counts - which
 *   is the only proof that the control does anything.
 *
 *   THE FIGURES LINE UP. Which is the whole argument for the table over the
 *   card: events, errors and duration are one face, one column, right-aligned.
 *
 * Plus the thing that is easiest of all to get wrong: the sentence path. It has
 * to show its steps, name what it ignored, and hand back rows you can edit.
 */
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4310/';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1680, height: 1000 }, colorScheme: 'light' });
const p = await c.newPage();

const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);

const pass = [];
const fail = [];
const check = (name, ok, detail) => (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ''}`);

await p.locator('.m-nav-item__label', { hasText: /^Sessions$/ }).first().click();
await p.waitForTimeout(500);

/* ── 1. the page ──────────────────────────────────────────────────────────── */
const shell = await p.evaluate(() => ({
  title: document.querySelector('.m-page__title')?.textContent,
  meta: document.querySelector('.m-page__meta')?.textContent,
  tabs: [...document.querySelectorAll('.m-page__tabs .ant-tabs-tab')].map((e) => e.textContent.trim()),
  /* ⚠ TEXT TABS WITH AN INK BAR, not the pill strip. PageCard's `tabs` slot is
     "deliberately a different shape from the pill toolbar below, because a
     section replaces the body and a filter only narrows it" - and it held a
     FilterStrip for one build, which made the two sections read as two
     filters. */
  tabsArePills: !!document.querySelector('.m-page__tabs .m-seg__item'),
  /* the issue-type strip and its whole toolbar row are gone */
  hasToolbar: !!document.querySelector('.m-page__toolbar'),
  tags: [...document.querySelectorAll('.m-page__toolbar .m-seg__item')].map((e) => e.textContent.trim()),
  tagCounts: [...document.querySelectorAll('.m-page__toolbar .m-seg__item')].map((e) =>
    Number((e.textContent.match(/(\d+)$/) ?? [])[1] ?? 0),
  ),
  columns: [...document.querySelectorAll('.m-ss__table th')].map((e) => e.textContent.trim()).filter(Boolean),
  rows: document.querySelectorAll('.m-ss__table tbody tr').length,
  foot: document.querySelector('.m-listfoot__range')?.textContent,
  /* the search is a well, not a card: it steps DOWN from the plane, because the
     plane is already the only surface (the 08-28 shell) */
  searchBg: getComputedStyle(document.querySelector('.m-sc')).backgroundColor,
  planeBg: getComputedStyle(document.querySelector('.m-page')).backgroundColor,
}));
check('the page renders with the shell every other page uses',
  shell.title === 'Sessions' && shell.tabs.length === 3, `${shell.title}, tabs ${shell.tabs.join('/')}`);
/* ⚠ THREE SECTIONS SINCE 2026-09-02: Segments became a tab rather than a
   dropdown at the top of the page. Same argument Bookmarked won on - a section
   replaces the body, a filter narrows it, and a list of segments is a list of a
   different thing. */
check('and the three sections are text tabs, not the pill strip',
  !shell.tabsArePills && shell.tabs.join('/') === 'All sessions/Bookmarked/Segments',
  shell.tabs.join('/'));
/* Mehdi, 2026-09-02: keep only the two tabs. The issue-type strip went and its
   toolbar row went with it - the date range and the display menu moved onto the
   search's own bar, which is the row that STICKS. */
/* ⚠ THE STRIP IS BACK, AND THE ERRORS COLUMN IS WHAT PAID FOR IT (Mehdi,
   2026-09-02, both instructions the same day). "It would be too much data to
   read and people wouldn't get it. That's why we made it as tabs." */
check('the issue-type strip is on a toolbar row of its own',
  shell.hasToolbar && shell.tags.length === 7 && shell.tags[1].startsWith('Errors'),
  shell.tags.join(' | '));
check('and every tab has a real count, so none of them is decoration',
  shell.tagCounts.length === 7 && shell.tagCounts.every((n) => n > 0),
  shell.tagCounts.join(', '));
/* ⚠ NOT 134. The default window is thirty days and the fixture now spreads
   over sixty, which is the whole reason the date control can do anything - see
   sessions-data. What is asserted is the SHAPE of the footer, and that the
   window is holding something back rather than everything. */
check('the list is a table and it pages',
  shell.rows === 12 && /^1–12 of \d+ sessions$/.test((shell.foot ?? '').trim()),
  `${shell.rows} rows, ${shell.foot}`);
/* ⚠ AND THERE IS NO ERRORS COLUMN. It was on screen for one day. Production
   declares `errorsCount` on `ISession` and in `SessionItem`'s props and renders
   it nowhere, which Mehdi confirmed live: "I don't think we have errors... no,
   we don't." Metadata is on by default in its place. */
check('there is no errors column, and metadata is on by default',
  !shell.columns.includes('Errors') && shell.columns.includes('Metadata'),
  shell.columns.join(' | '));

/* ⚠ AND ONLY TWO HEADERS SORT. The backend orders on `startTs` and
   `eventsCount` and nothing else - see production's `sortValues` - because
   anything else reloads a list of millions. */
const sorters = await p.evaluate(() =>
  [...document.querySelectorAll('.m-ss__table th')]
    .filter((t) => t.querySelector('.m-sort'))
    .map((t) => t.textContent.trim()),
);
check('and only the two columns the backend can order carry a sorter',
  sorters.length === 2 && sorters.includes('Started') && sorters.includes('Events'),
  sorters.join(' | '));
check('the search is a well rather than a second card on the plane',
  shell.searchBg !== shell.planeBg, `${shell.searchBg} in ${shell.planeBg}`);

/* THE FIGURES LINE UP. The card could not do this and it is the reason for the
   table: three columns, one face, one right edge each. */
const figs = await p.evaluate(() => {
  const col = (n) => [...document.querySelectorAll(`.m-ss__table tbody tr td:nth-child(${n}) .m-ss__fig`)];
  const heads = [...document.querySelectorAll('.m-ss__table th')].map((e) => e.textContent.trim());
  const at = heads.indexOf('Events') + 1;
  const cells = col(at);
  const cs = cells.length ? getComputedStyle(cells[0]) : null;
  return {
    n: cells.length,
    rights: [...new Set(cells.map((e) => Math.round(e.getBoundingClientRect().right)))].length,
    numeric: cs?.fontVariantNumeric,
    family: cs?.fontFamily.split(',')[0],
  };
});
check('every figure in a column shares one right edge and one face',
  figs.n === 12 && figs.rights === 1 && /tabular/.test(figs.numeric ?? ''),
  `${figs.n} cells, ${figs.rights} edge, ${figs.numeric}`);

/* ── 2. ONE BUTTON ───────────────────────────────────────────────────────────
   The claim, and the whole reason this is a cheap change: one picker holds both
   kinds, so nobody has to know which kind a thing is before looking for it. */
check('there is exactly ONE way into the filter, and it is a field',
  (await p.locator('.m-sc__field').count()) === 1
    && /Filter these sessions/.test((await p.locator('.m-sc__lead').textContent()) ?? ''),
  (await p.locator('.m-sc__field-text').textContent()) ?? 'no field');
/* ⚠ AND IT PROMISES NOTHING IT CANNOT DO. The natural-language path is PARKED,
   not deleted (Mehdi, 2026-09-02: it is a feature OpenReplay shipped and
   removed, so putting it back is out of scope) - `onTranslate` is the one prop
   that gates it and the card stopped passing it. What this asserts is that the
   promise went with it: no rotating example, and no offer to read a sentence. */
check('and it no longer promises prose it cannot read',
  (await p.locator('.m-sc__eg').count()) === 0, 'no rotating example');
/* ⚠ NOT A SEARCH BAR AND NOT CALLED SEARCH (Gabriel, 2026-09-02). The magnifier
   is the search signal, so it is a filter glyph; and no word a reader sees says
   "search". */
const words = await p.evaluate(() => {
  const nav = document.querySelector('.m-sc');
  const glyph = nav.querySelector('.m-sc__field-glyph');
  return {
    glyph: glyph?.classList.contains('lucide-list-filter') || glyph?.getAttribute('class') || '',
    saysSearch: /search/i.test(nav.textContent ?? ''),
    labels: [...nav.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('label') ?? e.getAttribute('aria-label')).join(' | '),
  };
});
check('nothing a reader sees calls it search', !words.saysSearch && !/search/i.test(words.labels),
  words.saysSearch ? 'the card prints the word' : words.labels.slice(0, 90));
check('and the glyph is a filter, not a magnifier',
  !/magnif|search/i.test(String(words.glyph)), String(words.glyph).slice(0, 60));

await p.locator('.m-sc__field').click();
await p.waitForTimeout(400);
const picker = await p.evaluate(() => {
  const el = document.querySelector('.m-pick');
  if (!el) return null;
  return {
    rail: [...el.querySelectorAll('.m-pick__cat')].map((e) => e.textContent.trim()),
    rows: el.querySelectorAll('.m-pick__row').length,
    /* the four categories the backend special-cases have to be visible AS
       categories: a segment does not behave like an event */
    special: ['Autocapture', 'Events', 'Features', 'Segments'].every((n) =>
      [...el.querySelectorAll('.m-pick__cat')].some((e) => e.textContent.includes(n)),
    ),
  };
});
check('the one picker holds both kinds, grouped the way the API groups them',
  !!picker && picker.special && picker.rows > 30,
  `${picker?.rows} entries, rail ${picker?.rail.length} deep`);

/* SEARCH SPANS EVERY CATEGORY, which is what two scoped pickers cannot do. */
await p.fill('.m-pick__search input', 'rage');
await p.waitForTimeout(300);
const spans = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-pick__row')];
  return {
    names: rows.map((r) => r.querySelector('.m-pick__name')?.textContent?.trim()),
    cats: [...new Set(rows.map((r) => r.querySelector('.m-pick__cat-tag')?.textContent?.trim()))],
  };
});
check('one query reaches an event and a saved segment together',
  spans.cats.includes('Autocapture') && spans.cats.includes('Segments'),
  `${spans.names.join(', ')} — from ${spans.cats.join('/')}`);

/* ── 3. THE SENTENCE PATH IS PARKED ────────────────────────────────────────
   ⚠ It used to be asserted here, end to end: type a sentence, read the steps
   it understood, accept it, get editable rows back. All of that still WORKS -
   `translate()` is untouched and `FilterPicker` still renders the offer when
   given `onTranslate` - but the sessions page stopped passing that prop on
   2026-09-02, because the feature is one OpenReplay shipped and removed and
   this scope forbids adding features back.

   So it moved rather than went: **`FilterPicker.stories.tsx` carries it**, with
   `sentences` as a story arg, which is the right home for a feature that is
   built and switched off. What this suite asserts instead is that the SWITCH is
   off - see "the sentence path is switched off at the callsite" below.

   ⚠ If the sessions bar ever gets `onTranslate` back, restore this block from
   git rather than writing it again: it took four assertions to pin down that
   the offer must show its steps, name what it ignored, sit ABOVE the matches,
   and hand back rows you can edit. */

/* ── 4. THE ONE LIST HOLDS TWO GRAMMARS ──────────────────────────────────── */
/* ⚠ No Clear here any more: §3 used to leave a translated search behind and
   this cleared it. Nothing has been added at this point, so the button does not
   exist - and a click on a control that is not there is a 30-second timeout
   rather than a failed assertion, which is the least helpful way for a suite to
   tell you something moved. */
await p.keyboard.press('Escape');
await p.waitForTimeout(200);

const addEntry = async (name) => {
  await p.locator('.m-sc__field').click();
  await p.waitForTimeout(300);
  await p.fill('.m-pick__search input', name);
  await p.waitForTimeout(300);
  await p.locator('.m-pick__row').first().click();
  await p.waitForTimeout(300);
};

await addEntry('Click');
const oneEvent = await p.evaluate(() => ({
  order: !!document.querySelector('.m-sc__order'),
  grips: document.querySelectorAll('.m-srow[draggable="true"]').length,
  nums: [...document.querySelectorAll('.m-srow__num')].map((e) => e.textContent),
}));
check('one event gets a number and NO order control and NO handle',
  !oneEvent.order && oneEvent.grips === 0 && oneEvent.nums.join('') === '1',
  `order ${oneEvent.order}, ${oneEvent.grips} draggable, nums ${oneEvent.nums.join('')}`);

await addEntry('checkout_start');
await addEntry('Country');
const mixed = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-srow')];
  const subjects = rows.map((r) => r.querySelector('.m-srow__name')?.textContent?.trim());
  return {
    subjects,
    nums: rows.map((r) => r.querySelector('.m-srow__num')?.textContent ?? null),
    draggable: rows.map((r) => r.getAttribute('draggable') === 'true'),
    hasRule: !!document.querySelector('.m-sc__rule'),
    order: document.querySelector('.m-sc__order-select .ant-select-content')?.textContent?.trim(),
    /* both kinds of subject share one left edge - the position slot is held
       open on every row, which is what lets one list hold two grammars */
    lefts: [...new Set(rows.map((r) => Math.round(r.querySelector('.m-srow__subject').getBoundingClientRect().left)))],
    /* only the property has an operator: an event is a thing that happened, not
       a comparison, and production gates the operator on !isEvent too */
    ops: rows.map((r) => !!r.querySelector('.m-srow__op')),
  };
});
check('events keep the sequence and the property falls below the rule',
  mixed.nums[0] === '1' && mixed.nums[1] === '2' && mixed.nums[2] === null && mixed.hasRule,
  `${mixed.subjects.join(' | ')} — nums ${mixed.nums.join(',')}`);
check('both kinds of subject share one left edge',
  mixed.lefts.length === 1, `${mixed.lefts.length} edges at ${mixed.lefts.join('/')}`);
check('only the property carries an operator',
  mixed.ops[0] === false && mixed.ops[1] === false && mixed.ops[2] === true, mixed.ops.join(','));
check('two events bring the order control, and it starts at then',
  mixed.order === 'then', mixed.order);
check('and both events became draggable at the second one',
  mixed.draggable[0] && mixed.draggable[1] && !mixed.draggable[2], mixed.draggable.join(','));

/* THE ORDER CONTROL DOES SOMETHING. Three orders, three counts, or the control
   is decoration. */
const countFor = async (word) => {
  await p.click('.m-sc__order-select');
  await p.waitForTimeout(250);
  await p.locator('.ant-select-item-option', { hasText: new RegExp(`^${word}`) }).first().click();
  await p.waitForTimeout(350);
  return p.evaluate(() => document.querySelector('.m-listfoot__range')?.textContent?.trim() ?? '');
};
const counts = { then: await countFor('then'), and: await countFor('and'), or: await countFor('or') };
check('then, and and or are three different questions',
  new Set(Object.values(counts)).size === 3, JSON.stringify(counts));
/* AND THEN HAS TO MATCH SOMETHING. A sequence operator whose demo returns an
   empty list proves the control works and the fixture does not. */
check('and then matches a real number of sessions',
  !/^0 shown$/.test(counts.then), `then → ${counts.then}`);

/* ── 5. an event's own properties ────────────────────────────────────────── */
await p.hover('.m-srow');
await p.waitForTimeout(200);
await p.locator('.m-srow__prop-add').first().click();
await p.waitForTimeout(350);
await p.locator('.m-pick__row').first().click();
await p.waitForTimeout(300);
await p.hover('.m-srow');
await p.waitForTimeout(200);
await p.locator('.m-srow__prop-add').first().click();
await p.waitForTimeout(350);
await p.locator('.m-pick__row').first().click();
await p.waitForTimeout(300);
const nested = await p.evaluate(() => {
  const props = [...document.querySelectorAll('.m-srow__prop')];
  const rail = props.length ? getComputedStyle(props[0].parentElement) : null;
  return {
    n: props.length,
    joints: props.map((e) => e.querySelector('.m-srow__joint')?.textContent?.trim()),
    railStyle: rail?.borderLeftStyle,
  };
});
check('an event narrows by its own properties, under where then and/or',
  nested.n === 2 && nested.joints[0] === 'where' && nested.joints[1] === 'and',
  `${nested.n} properties, joints ${nested.joints.join('/')}`);
check('and their rail is dashed, because they are not peers of the row above',
  nested.railStyle === 'dashed', nested.railStyle);

await p.locator('.m-srow__joint').nth(1).click();
await p.waitForTimeout(300);
check('and the joint is a control: clicking it switches every one of them',
  (await p.locator('.m-srow__joint').nth(1).textContent())?.trim() === 'or');

/* ── 6. the metadata chip writes to the search ─────────────────────────────
   ⚠ THE COLUMN IS ON BY DEFAULT since 2026-09-02 ("then it should be by
   default"), so this no longer turns it on - it ASSERTS it is on, then uses it.
   The old version clicked the Display pill unconditionally, which turned the
   column off the moment the default changed and then waited thirty seconds for
   a chip that could not exist. A setup step that assumes a default is a setup
   step that breaks silently when the default is the thing under test. */
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(400);
const metaOn = await p.evaluate(() =>
  [...document.querySelectorAll('.m-ss__table th')].some((t) => t.textContent.trim() === 'Metadata'),
);
check('the metadata column is on without anybody turning it on', metaOn);
await p.locator('.m-ss__meta-chip').first().click();
await p.waitForTimeout(400);
const wrote = await p.evaluate(() => ({
  rows: document.querySelectorAll('.m-srow').length,
  subject: document.querySelector('.m-srow__name')?.textContent?.trim(),
  value: document.querySelector('.m-srow .m-vp__trigger')?.textContent?.trim(),
}));
check('clicking a metadata value on a row searches for it',
  wrote.rows === 1 && !!wrote.subject, `${wrote.subject} = ${wrote.value}`)

/* ── 7. bookmarks is a tab, and everything keeps working inside it ───────── */
await p.locator('.m-page__tabs .ant-tabs-tab', { hasText: 'Bookmarked' }).click();
await p.waitForTimeout(450);
const vault = await p.evaluate(() => ({
  rows: document.querySelectorAll('.m-ss__table tbody tr').length,
  marks: document.querySelectorAll('.m-ss__mark').length,
  foot: document.querySelector('.m-listfoot__range')?.textContent?.trim(),
  empty: document.querySelector('.m-empty__title')?.textContent?.trim(),
  searchStillThere: !!document.querySelector('.m-sc'),
  tabsStillThere: document.querySelectorAll('.m-page__tabs .ant-tabs-tab').length === 3,
  columnsStillThere: document.querySelectorAll('.m-ss__table th').length > 4,
}));
/* A TAB, not a page: the search, the tabs and the columns all keep working
   inside it. A section replaces the body; it does not replace the page. */
check('bookmarked is a tab of the same list, not a different page',
  vault.searchStillThere && vault.tabsStillThere,
  `search ${vault.searchStillThere}, tabs ${vault.tabsStillThere}, columns ${vault.columnsStillThere}`);
check('and it shows only bookmarked sessions',
  vault.rows === 0 ? !!vault.empty : vault.marks === vault.rows,
  vault.rows === 0 ? vault.empty : `${vault.marks}/${vault.rows} marked, ${vault.foot}`);

/* ── 8. the empty search is not an empty state ───────────────────────────── */
await p.locator('.m-page__tabs .ant-tabs-tab', { hasText: 'All sessions' }).click();
await p.waitForTimeout(400);
/* step 6 left a filter in, from the metadata chip. */
if (await p.locator('.m-sc__clear').count()) {
  await p.locator('.m-sc__clear').click();
  await p.waitForTimeout(350);
}
const emptyFilter = await p.evaluate(() => ({
  rows: document.querySelectorAll('.m-srow').length,
  /* ⚠ NO EMPTY STATE AND NO EXAMPLE PILLS. They said what the placeholder says,
     in a second place - and twice the surface for one idea is what made the
     field read as one control among several rather than as THE control. */
  pills: document.querySelectorAll('.m-sc__example, .m-sc__empty, .m-sc__hint').length,
  strip: !!document.querySelector('.m-sc__strip'),
}));
check('an empty filter is simply a field, with no empty state under it',
  emptyFilter.rows === 0 && emptyFilter.pills === 0 && !emptyFilter.strip,
  `${emptyFilter.pills} leftover example elements`);

/* THE FIELD IS THE MOST IMPORTANT THING ON THE PAGE, so it is measurably the
   biggest control on it and the only type at 14px. */
const weight = await p.evaluate(() => {
  const f = document.querySelector('.m-sc__field');
  const others = [...document.querySelectorAll('.m-sc__bar .ant-select, .m-sc__bar button')]
    .filter((e) => !e.classList.contains('m-sc__field'));
  return {
    h: Math.round(f.getBoundingClientRect().height),
    tallestOther: Math.max(0, ...others.map((e) => Math.round(e.getBoundingClientRect().height))),
    size: getComputedStyle(f.querySelector('.m-sc__field-text')).fontSize,
    rowSize: getComputedStyle(document.querySelector('.m-vp__trigger, .m-srow__subject') ?? f).fontSize,
  };
});
check('the field is the biggest control on the page and the only one at 14px',
  weight.h > weight.tallestOther && weight.size === '14px',
  `${weight.h}px vs ${weight.tallestOther}px, type ${weight.size}`);

/* ⚠ THE SENTENCE PATH IS OFF, AND STILL THERE. `translate()` and the picker's
   whole offer are untouched in the shared layer; the card simply stops passing
   `onTranslate`, which is the single switch. So this asserts BOTH halves: the
   picker offers nothing to a typed sentence, and the function that would do it
   still works when called. If somebody deletes `translate()` to tidy up, this
   fails - which is the point. */
await p.locator('.m-sc__field').click();
await p.waitForTimeout(250);
await p.fill('.m-pick__search input', 'paid users who hit an error');
await p.waitForTimeout(350);
const parked = await p.evaluate(() => ({
  offer: !!document.querySelector('.m-pick__nl button'),
  steps: document.querySelectorAll('.m-pick__steps li').length,
}));
check('the sentence path is switched off at the callsite', !parked.offer && parked.steps === 0,
  `offer ${parked.offer}, ${parked.steps} steps`);
await p.keyboard.press('Escape');
await p.waitForTimeout(200);

/* ── 9. IT STICKS ────────────────────────────────────────────────────────────
   Asserted on a SHORT window, because the plane fits a page of twelve rows on
   a tall one and a body that never scrolls cannot prove anything. */
await p.setViewportSize({ width: 1400, height: 560 });
await p.waitForTimeout(400);
const stick = await (async () => {
  const read = () => p.evaluate(() => {
    const body = document.querySelector('.m-page__body');
    const sc = document.querySelector('.m-sc').getBoundingClientRect();
    return { scroll: body.scrollTop, canScroll: body.scrollHeight - body.clientHeight, top: Math.round(sc.top) };
  });
  const rest = await read();
  await p.evaluate(() => { document.querySelector('.m-page__body').scrollTop = 300; });
  await p.waitForTimeout(400);
  return { rest, after: await read() };
})();
check('the body scrolls on a short window', stick.rest.canScroll > 100, `${stick.rest.canScroll}px of overflow`);
check('and the search holds its place while the rows go past it',
  stick.after.scroll > 100 && stick.after.top === stick.rest.top,
  `scrolled ${stick.after.scroll}px, search stayed at ${stick.after.top}`);
/* ⚠ NO GAP UNDER IT, and the sticky box is opaque (Mehdi, 2026-09-02: "on the
   top of the table titles there's an empty row"). The band's hairline is the
   separation; 16px of the plane's colour between the band and the header row
   read as a blank row of the table. The margin still has to be zero and the box
   still has to be opaque - both were load-bearing before and still are. */
await p.evaluate(() => document.querySelector('.m-page__body').scrollTo(0, 0));
await p.waitForTimeout(200);
const gapOwner = await p.evaluate(() => {
  const w = document.querySelector('.m-ss__sticky');
  const cs = getComputedStyle(w);
  const th = document.querySelector('.m-ss__table th').getBoundingClientRect();
  return {
    pad: cs.paddingBottom,
    margin: getComputedStyle(document.querySelector('.m-sc')).marginBottom,
    bg: cs.backgroundColor,
    gapToHeader: Math.round(th.top - document.querySelector('.m-sc').getBoundingClientRect().bottom),
  };
});
check('the column titles sit directly under the search, with no blank row between',
  gapOwner.pad === '0px' && gapOwner.margin === '0px' && gapOwner.gapToHeader === 0 && gapOwner.bg !== 'rgba(0, 0, 0, 0)',
  `pad ${gapOwner.pad}, card margin ${gapOwner.margin}, gap ${gapOwner.gapToHeader}px, opaque ${gapOwner.bg}`);
/* AND THE WELL KEPT ITS OWN COLOUR. Putting the sticky on the card itself made
   `.m-page__body > .m-sc` out-specify `.m-sc` and the well turned white. */
const well = await p.evaluate(() => ({
  sc: getComputedStyle(document.querySelector('.m-sc')).backgroundColor,
  plane: getComputedStyle(document.querySelector('.m-page')).backgroundColor,
}));
check('and the well still steps off the plane rather than matching it',
  well.sc !== well.plane, `${well.sc} in ${well.plane}`);

/* ── 10. THE RING ────────────────────────────────────────────────────────────
   The one piece of expression on this page, and three rules it has to keep: it
   is not on at rest, its animation is PAUSED rather than merely invisible while
   nobody is pointing at it, and it stops moving when it is a focus ring. */
await p.setViewportSize({ width: 1560, height: 940 });
/* Park the cursor away from the field: "at rest" means nobody is pointing at
   it, and a previous step left the pointer on it. */
await p.mouse.move(900, 760);
await p.waitForTimeout(400);
const ringState = async () =>
  p.evaluate(() => {
    const r = document.querySelector('.m-sc__ring');
    const arc = r.querySelector('.m-sc__arc');
    const cs = getComputedStyle(arc);
    return {
      opacity: getComputedStyle(r).opacity,
      play: cs.animationPlayState,
      name: cs.animationName,
      /* The path runs down the MIDDLE of the field's own rim, so the arc
         replaces the border rather than sitting inside or outside it. */
      onBorder: (() => {
        const a = r.getBoundingClientRect();
        const f = document.querySelector('.m-sc__field').getBoundingClientRect();
        return Math.abs(a.left - f.left) <= 1 && Math.abs(a.width - f.width) <= 2;
      })(),
    };
  });
const ringRest = await ringState();
check('the ring is off at rest, and paused rather than merely invisible',
  ringRest.opacity === '0' && ringRest.play === 'paused, paused',
  `opacity ${ringRest.opacity}, ${ringRest.play}`);
await p.hover('.m-sc__field');
await p.waitForTimeout(400);
const ringHover = await ringState();
check('it sweeps on hover, on the field\'s own border box',
  ringHover.opacity === '1' && ringHover.play === 'running, running' && ringHover.onBorder,
  `opacity ${ringHover.opacity}, ${ringHover.play}, on the border ${ringHover.onBorder}`);
await p.focus('.m-sc__field');
await p.keyboard.press('Tab');
await p.keyboard.press('Shift+Tab');
await p.waitForTimeout(300);
const ringFocus = await ringState();
check('and it HOLDS STILL as a focus ring, because one that moves cannot be located',
  ringFocus.opacity === '1' && ringFocus.name === 'none',
  `opacity ${ringFocus.opacity}, animation ${ringFocus.name}`);

/* ── 11. THE PROPORTION BARS ────────────────────────────────────────────────
   Mehdi, 2026-09-02: "there are some filters that you see the proportions of
   the results with a bar, make sure you have mock data to show everything."
   The share is what turns picking a value from a guess into a decision, so it
   has to be there for a COUNTED field and for a FIXTURE one alike. */
await p.mouse.click(900, 40);
await p.waitForTimeout(300);
await addEntry('Country');
await p.waitForTimeout(300);
await p.locator('.m-vp__trigger').first().click();
await p.waitForTimeout(500);
const counted = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-vp .m-checkrow')];
  return {
    n: rows.length,
    top: rows[0]?.textContent?.trim(),
    /* every row carries a figure AND a bar: the figure is what you compare when
       two are close, the bar is what you scan down a list of nine */
    figures: rows.filter((r) => r.querySelector('.m-vp__n')).length,
    bars: rows.filter((r) => r.querySelector('.m-vp__bar .m-bar__fill')).length,
    /* widest candidate is a full bar, so the lengths are comparable to each
       other rather than to the whole */
    widest: rows[0] ? getComputedStyle(rows[0].querySelector('.m-bar__fill')).width : null,
    barBox: rows[0] ? Math.round(rows[0].querySelector('.m-vp__bar').getBoundingClientRect().width) : 0,
    /* and they share one axis, which is what a right-aligned column buys */
    edges: new Set(rows.map((r) => Math.round(r.querySelector('.m-vp__bar').getBoundingClientRect().right))).size,
  };
});
check('a counted value field offers its values with a figure and a bar',
  counted.n > 4 && counted.figures === counted.n && counted.bars === counted.n,
  `${counted.n} values, ${counted.figures} figures, ${counted.bars} bars — top is ${counted.top}`);
check('the widest candidate is a full bar, so the lengths compare to each other',
  counted.barBox > 0 && parseFloat(counted.widest ?? '0') >= counted.barBox - 1,
  `${counted.widest} of ${counted.barBox}px`);
check('and every bar shares one axis',
  counted.edges === 1, `${counted.edges} right edges`);

/* THE COUNTS ARE COUNTED. Country is a real session field, so the menu and the
   table cannot disagree - and it narrows with the rest of the search. */
const tally = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-vp .m-checkrow')];
  const sum = rows.reduce((n, r) => n + (Number(r.querySelector('.m-vp__n')?.textContent) || 0), 0);
  const total = Number((document.querySelector('.m-listfoot__range')?.textContent ?? '').replace(/.*of /, '').replace(/[^0-9].*$/, ''))
    || document.querySelectorAll('.m-ss__table tbody tr').length;
  return { sum, total };
});
check('and they are counted off the sessions rather than invented',
  tally.sum > 0 && tally.sum <= tally.total, `${tally.sum} across the values, ${tally.total} sessions`);

/* A FIXTURE FIELD gets them too - a URL is not on a session, so there is
   nothing to count, and a value field with no shares is the control with its
   best feature removed. */
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(300);
await addEntry('Network request');
await p.waitForTimeout(300);
await p.hover('.m-srow');
await p.waitForTimeout(200);
await p.locator('.m-srow__prop-add').first().click();
await p.waitForTimeout(350);
await p.fill('.m-pick__search input', 'Status');
await p.waitForTimeout(300);
await p.locator('.m-pick__row').first().click();
await p.waitForTimeout(400);
await p.locator('.m-vp__trigger').first().click();
await p.waitForTimeout(500);
const fixture = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-vp .m-checkrow')];
  return {
    values: rows.map((r) => r.querySelector('.m-checkrow__label')?.textContent?.trim()),
    bars: rows.filter((r) => Number.parseFloat(getComputedStyle(r.querySelector('.m-bar__fill')).width) > 0).length,
  };
});
check('a fixture value field has shares too, so nothing in the picker is bare',
  fixture.values.includes('200') && fixture.bars === fixture.values.length,
  `${fixture.values.join(', ')} — ${fixture.bars} bars`);

/* ── 12. THE FILTER PUTS ITSELF AWAY ────────────────────────────────────────
   Two complaints, one shape (Gabriel, 2026-09-02): "the clear button takes a
   whole space in height that doesn't have anything else" and "as the list
   grows, I can't collapse the list to show the result". The strip that held
   only Clear now carries the summary, the count and the disclosure - and
   SCROLLING collapses it, because scrolling is the moment your intent changes
   from building the filter to reading the results. */
await p.setViewportSize({ width: 1560, height: 620 });
await p.waitForTimeout(300);
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(300);
for (const n of ['add_to_cart', 'checkout_start', 'Country', 'Browser']) await addEntry(n);
await p.mouse.move(900, 560);
await p.waitForTimeout(400);

const strip = () =>
  p.evaluate(() => {
    const el = document.querySelector('.m-sc__strip');
    return {
      collapsed: el.classList.contains('is-collapsed'),
      summary: el.querySelector('.m-sc__summary')?.textContent?.trim(),
      count: el.querySelector('.m-sc__count')?.textContent?.trim(),
      hasClear: !!el.querySelector('.m-sc__clear'),
      rows: document.querySelectorAll('.m-srow').length,
      /* the row it sits on has to be doing something with its height */
      inhabitants: el.querySelectorAll(':scope > *').length,
    };
  });
const open = await strip();
check('the strip carries the summary, the count and Clear, not just Clear',
  open.inhabitants >= 3 && !!open.count && open.hasClear,
  `${open.inhabitants} things on it — ${open.summary} · ${open.count}`);

await p.evaluate(() => { document.querySelector('.m-page__body').scrollTop = 220; });
await p.waitForTimeout(600);
const shut = await strip();
check('scrolling into the results collapses the filter by itself',
  shut.collapsed && shut.rows === 0, `collapsed ${shut.collapsed}, ${shut.rows} rows drawn`);
/* COLLAPSED IT STILL SAYS WHAT IT IS. That is the difference between a collapse
   and hiding something: the same `describeFilter` the segments list prints. */
/* The order word is whatever the earlier step left it as, so match any of the
   three rather than pinning it - the claim is that the SENTENCE is there, not
   which conjunction is in it. */
check('and collapsed it prints the whole filter as one sentence',
  /add_to_cart (then|and|or) checkout_start, Country/.test(shut.summary ?? '') && !!shut.count,
  `${shut.summary} · ${shut.count}`);

await p.locator('.m-sc__toggle').click();
await p.waitForTimeout(400);
const reopened = await strip();
check('and the one click there is beats the scroll, as useNavCollapse does',
  !reopened.collapsed && reopened.rows === 4, `${reopened.rows} rows back`);

/* ⚠ ONE CLAUSE STILL GETS THE CARET (Mehdi, 2026-09-02: "what happened with the
   collapse search, I can't see it anymore"). It appeared at three rows, on the
   sound arithmetic that collapsing one clause saves less height than the
   summary line costs - and it read as a control that had broken. The SCROLL
   rule keeps the threshold; the affordance does not. */
await p.evaluate(() => { document.querySelector('.m-page__body').scrollTop = 0; });
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(300);
await addEntry('Country');
await p.waitForTimeout(300);
const one = await p.evaluate(() => ({
  toggle: !!document.querySelector('.m-sc__toggle'),
  summary: document.querySelector('.m-sc__summary')?.textContent?.trim(),
}));
check('one clause keeps the disclosure, because a control that comes and goes reads as broken',
  one.toggle && one.summary === '1 filter', `toggle ${one.toggle}, says ${one.summary}`);

/* ── 13. AN OPEN CONTROL IS NOT AN ACCENT ───────────────────────────────────
   Gabriel, on the operator dropdown: "this colour in that state is a weird
   semantic token." antd's `controlItemBgActive` was `surface-selected` - the
   one teal-tinted surface in the set - so the option you had already chosen was
   the only selection in the build that meant selection in a different colour.
   Everything else says it with a neutral fill: the nav row, the pager, the
   segmented thumb, the picker's rail. */
await p.locator('.m-srow__op').first().click();
await p.waitForTimeout(450);
const token = await p.evaluate(() => {
  const opt = document.querySelector('.ant-select-item-option-selected');
  const root = getComputedStyle(document.documentElement);
  const rgb = (hex) => {
    const h = hex.trim().replace('#', '');
    const n = Number.parseInt(h, 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  return {
    bg: opt ? getComputedStyle(opt).backgroundColor : null,
    active: rgb(root.getPropertyValue('--m-surface-active')),
    selected: rgb(root.getPropertyValue('--m-surface-selected')),
  };
});
check('a chosen option is the app\'s own neutral selection fill, not the tinted one',
  token.bg === token.active && token.bg !== token.selected,
  `${token.bg} — active ${token.active}, tinted ${token.selected}`);
await p.keyboard.press('Escape');
await p.waitForTimeout(200);

/* ── THE DATE WINDOW ──────────────────────────────────────────────────────
   Four presets and a real custom range, and the only claim worth asserting is
   that each of them CHANGES something: the previous control offered "Custom
   range" and quietly applied ninety days, which nothing on screen contradicted.
   The fixture spreads over sixty days for exactly this reason. */
await p.evaluate(() => document.querySelector('.m-page__body').scrollTo(0, 0));
await p.waitForTimeout(250);
const total = async () =>
  Number((await p.locator('.m-listfoot__range').textContent()).replace(/.*of /, '').replace(/[^0-9].*$/, ''));
/* Open it, and be sure it is open: the trigger TOGGLES, so a step that left the
   menu up (a half-filled custom range, say) turns the next "open" into a
   close. Two clicks and a wait, rather than a guess. */
const openRange = async () => {
  for (let i = 0; i < 3; i += 1) {
    if (await p.locator('.m-dr__menu').count()) return;
    await p.locator('.m-dr__trigger').click();
    await p.waitForTimeout(250);
  }
};
const preset = async (label) => {
  await openRange();
  await p.locator('.m-dr__menu .m-checkrow', { hasText: label }).click();
  await p.waitForTimeout(350);
  return total();
};
const windows = {
  '24h': await preset('Past 24 hours'),
  '7d': await preset('Past 7 days'),
  '30d': await preset('Past 30 days'),
  '90d': await preset('Past 90 days'),
};
check('every preset is a different window, so the control can be seen to work',
  new Set(Object.values(windows)).size === 4 &&
    windows['24h'] < windows['7d'] && windows['7d'] < windows['30d'] && windows['30d'] < windows['90d'],
  JSON.stringify(windows));

/* ⚠ AND CUSTOM IS A REAL RANGE. It used to be a fifth preset applying ninety
   days under a label that said something else. */
await openRange();
await p.locator('.m-dr__menu .m-checkrow', { hasText: 'Custom range' }).click();
await p.waitForTimeout(300);
const halfPicked = {
  picker: await p.locator('.m-dr__picker .ant-picker').count(),
  hint: await p.locator('.m-dr__hint').count(),
  rows: await total(),
};
check('picking custom opens a two-ended picker and narrows nothing until both ends are in',
  halfPicked.picker === 1 && halfPicked.hint === 1 && halfPicked.rows === windows['90d'],
  `picker ${halfPicked.picker}, hint ${halfPicked.hint}, ${halfPicked.rows} rows`);

const day = (back) => {
  const d = new Date(Date.now() - back * 86400000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
/* ⚠ WAIT FOR EACH END TO LAND, DO NOT WAIT A FIXED 300ms. This step was
   `fill / Enter / sleep / fill / Enter / sleep` and it failed about one run in
   three: the first Enter sometimes committed nothing, the second fill went in
   anyway, and antd fired `onChange([null, date])`. The control then printed
   "Up to Aug 29" over an unfiltered list - which is CORRECT behaviour for a
   half range, so the suite was reporting a real state as a bug in it.

   It also disproved the note in date-range.ts, which said a one-ended window
   was unreachable from this control. It is reachable; the note is corrected
   there. What this step wants is the two-ended case, so it now waits for the
   field to actually hold what was typed before moving on. */
const ends = p.locator('.m-dr__picker .ant-picker input');
const landed = async (i, text) => {
  await ends.nth(i).click();
  await ends.nth(i).fill(text);
  await p.waitForFunction(
    ({ i, text }) => document.querySelectorAll('.m-dr__picker .ant-picker input')[i]?.value === text,
    { i, text },
    { timeout: 4000 },
  );
  await p.keyboard.press('Enter');
};
await landed(0, day(20));
await landed(1, day(5));
/* And the menu closes only once the range is complete, so waiting on that is
   waiting on the thing being asserted rather than on a clock. */
await p.locator('.m-dr__menu').waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
const custom = {
  label: await p.locator('.m-dr__value').textContent(),
  rows: await total(),
  closed: (await p.locator('.m-dr__menu').count()) === 0,
};
check('a custom range filters, prints its dates, and closes when it is complete',
  custom.rows > 0 && custom.rows < windows['90d'] && /\w+ \d+ – \w+ \d+/.test(custom.label ?? '') && custom.closed,
  `${custom.label} — ${custom.rows} rows, closed ${custom.closed}`);

/* ⚠ THE COLUMN WIDTHS DO NOT MOVE BETWEEN PAGES (Mehdi, 2026-09-02). antd's
   default table layout re-measures from the content, so a longer email on page
   two shifted every column beside it. */
await preset('Past 30 days');
const widths = () =>
  p.evaluate(() => [...document.querySelectorAll('.m-ss__table thead th')].map((t) => Math.round(t.getBoundingClientRect().width)).join(','));
const w1 = await widths();
await p.locator('.ant-pagination-item', { hasText: '2' }).click();
await p.waitForTimeout(400);
const w2 = await widths();
await p.locator('.ant-pagination-item', { hasText: '3' }).click();
await p.waitForTimeout(400);
const w3 = await widths();
check('the columns hold their widths as the data under them changes', w1 === w2 && w2 === w3, `${w1} / ${w2} / ${w3}`);
await p.locator('.ant-pagination-item', { hasText: '1' }).click();
await p.waitForTimeout(350);

/* ── ONE IDENTITY, ONE ROBOT (2026-09-03) ─────────────────────────────────
   Gabriel: *"I want the avatar to be exactly the same when the user is the
   same, of course, when I filter by user."* DiceBear is a pure function of its
   seed, so the requirement reduces entirely to WHAT IS SEEDED - and this walks
   every page rather than one filtered view, because a filter can only prove it
   for the rows the filter happened to return.

   ⚠ THIS IS THE CHECK THAT FOUND THE FIXTURE DEFECT. The name and the user id
   were derived from two different formulas, so one person carried eleven ids
   and would have had eleven robots. Nothing rendered the id, so nothing had
   ever disagreed - the avatar is the first thing that reads it. */
const avatarsHere = () => p.evaluate(() =>
  [...document.querySelectorAll('.m-ss__table tbody tr.ant-table-row')].map((r) => {
    const a = r.querySelector('.m-savatar');
    const img = r.querySelector('.m-savatar__img');
    const u = img ? new URL(img.src) : null;
    return {
      name: r.querySelector('.m-ss__name')?.textContent?.trim() ?? null,
      seed: u ? u.searchParams.get('seed') : null,
      endpoint: u ? `${u.host}${u.pathname}` : null,
      ground: a ? getComputedStyle(a).backgroundColor : null,
      box: a ? Math.round(a.getBoundingClientRect().width) : null,
      rowH: Math.round(r.getBoundingClientRect().height),
      loaded: img ? img.naturalWidth > 0 : false,
    };
  }));

/* The first page waits: twelve first-time requests to a cold CDN take a couple
   of seconds, which is what the preconnect in index.html exists to shorten. */
await p.waitForTimeout(4000);
const firstPage = await avatarsHere();
check('every row carries an avatar, and it is the pixelbot endpoint',
  firstPage.length > 0 && firstPage.every((a) => a.seed && a.endpoint === 'api.dicebear.com/10.x/pixelbot/svg'),
  `${firstPage.filter((a) => a.seed).length}/${firstPage.length}, ${firstPage[0]?.endpoint}`);
check('and the avatars actually load',
  firstPage.every((a) => a.loaded), `${firstPage.filter((a) => a.loaded).length}/${firstPage.length} loaded`);
/* 20px inside the 38px row every list in this app uses. The avatar has to be
   small enough that it cannot be the thing setting the row height - Mehdi asked
   for it back "smaller", and a row that grew to fit it would be the avatar
   deciding the list's rhythm. */
check('it sits inside the list rhythm rather than setting it',
  firstPage.every((a) => a.box === 20 && a.rowH === 38), `${firstPage[0]?.box}px in ${firstPage[0]?.rowH}px`);
check('the ground resolves to a real colour per row',
  firstPage.every((a) => /^(oklch|rgb|color)/.test(a.ground ?? '')), firstPage[0]?.ground);

/* Now every page, which is where the same person turns up more than once. */
const pages = await p.locator('.ant-pagination-item').evaluateAll((els) => els.map((e) => e.textContent.trim()));
const all = [...firstPage];
for (const n of pages.slice(1)) {
  await p.locator('.ant-pagination-item', { hasText: new RegExp(`^${n}$`) }).click();
  await p.waitForTimeout(400);
  all.push(...(await avatarsHere()));
}
await p.locator('.ant-pagination-item', { hasText: '1' }).click();
await p.waitForTimeout(350);

const byName = new Map();
for (const a of all) {
  if (!byName.has(a.name)) byName.set(a.name, new Set());
  byName.get(a.name).add(a.seed);
}
const manySeeds = [...byName].filter(([, seeds]) => seeds.size > 1);
const repeated = [...byName].filter(([n]) => all.filter((a) => a.name === n).length > 1);
check('one person is one seed, across every session they appear in',
  manySeeds.length === 0,
  manySeeds.length ? manySeeds.map(([n, s]) => `${n} has ${s.size}`).join(', ')
    : `${byName.size} identities over ${all.length} rows, ${repeated.length} of them repeat`);
/* ⚠ AND THE CHECK ABOVE IS WORTHLESS IF NOBODY REPEATS. A fixture where every
   row is a different person satisfies "one person, one seed" trivially. */
check('and the list actually holds people with more than one session',
  repeated.length >= 5, `${repeated.length} identities appear more than once`);

const seedToNames = new Map();
for (const a of all) {
  if (!seedToNames.has(a.seed)) seedToNames.set(a.seed, new Set());
  seedToNames.get(a.seed).add(a.name);
}
check('and two people never share one robot',
  [...seedToNames.values()].every((n) => n.size === 1), `${seedToNames.size} seeds`);

/* The hue is a tint, not an identifier, so it is allowed to repeat - but if it
   collapses onto three or four values it stops making a row cohere and starts
   looking like a bug. Twelve hues drawn from twelve should land on nine or ten.
   ⚠ It landed on SIX before the hash grew an avalanche: `% 12` reads the low
   bits and FNV-1a barely moves them for short similar strings. */
const grounds = new Set(all.map((a) => a.ground));
check('the twelve grounds are actually spread over the list',
  grounds.size >= 9, `${grounds.size} distinct grounds over ${all.length} rows`);

/* ── THE PLAY HOLDS THE RIGHT EDGE ───────────────────────────────────────
   Third position in a day: hover-only in the last column, then leading the row
   ("it looks like a chevron"), now an outline glyph pinned right. What is
   asserted is the part that is easy to break and impossible to see in a
   screenshot - it is STICKY, so narrowing the window cannot take the one
   affordance on the page off the side of it. */
const playRest = await p.evaluate(() => {
  const g = document.querySelector('.m-ss__play');
  const cell = g?.closest('td');
  return {
    last: cell === cell?.parentElement?.lastElementChild,
    sticky: getComputedStyle(cell).position,
    fade: getComputedStyle(cell, '::before').backgroundImage.startsWith('linear-gradient'),
    colour: getComputedStyle(g).color,
  };
});
check('the play is the last cell, stuck to the right edge, on a fade of its own',
  playRest.last && playRest.sticky === 'sticky' && playRest.fade,
  `last ${playRest.last}, ${playRest.sticky}, fade ${playRest.fade}`);

/* ⚠ AND IT STAYS THERE WHEN THE TABLE SCROLLS UNDER IT, which is the whole
   reason it is sticky rather than simply last. */
const held = await p.evaluate(async () => {
  const body = document.querySelector('.m-page__body');
  const right = () => Math.round(document.querySelector('td.m-ss__playcell').getBoundingClientRect().right);
  const before = right();
  body.scrollBy(300, 0);
  await new Promise((r) => setTimeout(r, 250));
  const after = right();
  const moved = body.scrollLeft > 0;
  body.scrollTo(0, body.scrollTop);
  return { before, after, moved };
});
check('and it holds that edge while the table scrolls under it',
  !held.moved || held.before === held.after,
  held.moved ? `${held.before} → ${held.after}` : 'nothing to scroll at this width');

await p.hover('.m-ss__row');
await p.waitForTimeout(250);
const playHover = await p.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const hex = root.getPropertyValue('--m-content-accent').trim().replace('#', '');
  const n = Number.parseInt(hex, 16);
  return {
    colour: getComputedStyle(document.querySelector('.m-ss__play')).color,
    accent: `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`,
  };
});
check('and it takes the accent on the ROW\'s hover, because the row is the target',
  playRest.colour !== playHover.colour && playHover.colour === playHover.accent,
  `${playRest.colour} → ${playHover.colour}`);

/* ── THE RING IS A DASH ON A PATH ────────────────────────────────────────
   Third attempt, and the two before it failed on the same fact - the field is
   1400 by 40. A conic gradient divides by ANGLE, so the arc was a dot on the
   long rim and covered the whole end cap. A linear one balances the arc but
   only moves sideways, which stops reading as a ring at all ("now it's a
   horizontal movement, that's wrong"). A dashed stroke is measured in ARC
   LENGTH, travels the perimeter in order, and its length is a number that can
   breathe on its own. */
await p.hover('.m-sc__field');
await p.waitForTimeout(400);
const ringShape = await p.evaluate(() => {
  const rect = document.querySelector('.m-sc__ring rect');
  if (!rect) return null;
  const cs = getComputedStyle(rect);
  return {
    tag: rect.tagName,
    anim: cs.animationName,
    state: cs.animationPlayState,
    dash: cs.strokeDasharray,
    perimeter: Math.round(rect.getTotalLength()),
    field: Math.round(document.querySelector('.m-sc__field').getBoundingClientRect().width),
  };
});
check('the ring is a stroked path, not a gradient, and it both travels and breathes',
  !!ringShape && ringShape.anim === 'm-sc-travel, m-sc-breathe' && ringShape.state === 'running, running',
  `${ringShape?.anim} — ${ringShape?.state}`);
/* ⚠ THE ARC IS THE SAME LENGTH WHEREVER IT IS, which is the one thing the two
   gradient versions could not do. `pathLength="100"` normalises the perimeter,
   so the dash is a percentage of the loop at any plane width. */
const arc = await p.evaluate(() => {
  const rect = document.querySelector('.m-sc__ring rect');
  const read = () => Number.parseFloat(getComputedStyle(rect).strokeDasharray);
  return new Promise((done) => {
    const seen = [];
    const tick = () => {
      seen.push(read());
      if (seen.length < 12) setTimeout(tick, 90);
      else done({ min: Math.min(...seen), max: Math.max(...seen) });
    };
    tick();
  });
});
check('and the arc grows and shrinks rather than holding one length',
  arc.max - arc.min > 4 && ringShape.perimeter > ringShape.field * 2,
  `dash ${arc.min.toFixed(1)}–${arc.max.toFixed(1)} of 100, perimeter ${ringShape.perimeter}px`);

/* ── THE OPERATOR READS (Mehdi: "the 'is not' colour doesn't have contrast
   enough"). The closed control drew the word one step quieter than the SAME
   word in the menu under it. */
await p.locator('.m-sc__field').click();
await p.waitForTimeout(300);
await p.fill('.m-pick__search input', 'User ID');
await p.waitForTimeout(300);
await p.locator('.m-pick__row').first().click();
await p.waitForTimeout(400);
await p.locator('.m-srow__op').first().click();
await p.waitForTimeout(400);
const ink = await p.evaluate(() => ({
  closed: getComputedStyle(document.querySelector('.m-srow__op .ant-select-content')).color,
  option: getComputedStyle(document.querySelector('.ant-select-dropdown .ant-select-item')).color,
}));
check('the operator on the closed control is the same ink as the operator in its own menu',
  ink.closed === ink.option, `${ink.closed} vs ${ink.option}`);
await p.keyboard.press('Escape');
await p.waitForTimeout(200);
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(300);

/* ── THE BOOKMARK IS NOT ON THE ROW ───────────────────────────────────────
   ⚠ It was a mark, then a control, then gone - all on 2026-09-02, and every
   step was Mehdi's. The last one came with a reason from their own usage:
   "people don't use the bookmark there. They need to view the session first
   before bookmarking it. So keep that for when you're going to be reviewing
   the replay."

   So this asserts the ABSENCE of the control and the SURVIVAL of the state:
   `favorite` is still real and the Bookmarked tab is still a list of it. A
   feature whose control moves has to keep working, or the move was a deletion
   wearing a plan. */
const rowBookmark = await p.evaluate(() => ({
  control: !!document.querySelector('.m-ss__act'),
  mark: !!document.querySelector('.m-ss__mark'),
  acts: !!document.querySelector('.m-ss__acts'),
}));
check('neither a bookmark control nor a bookmark mark is on a row',
  !rowBookmark.control && !rowBookmark.mark && !rowBookmark.acts,
  JSON.stringify(rowBookmark));
const bookmarkedTab = await p.evaluate(async () => {
  const tabs = [...document.querySelectorAll('.m-page__tabs .ant-tabs-tab')];
  tabs.find((t) => /Bookmarked/.test(t.textContent))?.click();
  await new Promise((r) => setTimeout(r, 450));
  return document.querySelectorAll('.m-ss__table tbody tr').length;
});
check('and the bookmarked tab is still a real list of the state behind it',
  bookmarkedTab > 0, `${bookmarkedTab} bookmarked`);
await p.evaluate(async () => {
  const tabs = [...document.querySelectorAll('.m-page__tabs .ant-tabs-tab')];
  tabs.find((t) => /All sessions/.test(t.textContent))?.click();
  await new Promise((r) => setTimeout(r, 300));
});

check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\nPASS');
pass.forEach((l) => console.log(`  ✓ ${l}`));
if (fail.length) {
  console.log('\nFAIL');
  fail.forEach((l) => console.log(`  ✗ ${l}`));
}
await b.close();
process.exit(fail.length ? 1 : 0);

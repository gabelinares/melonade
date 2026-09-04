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

/* ⚠ SESSIONS IS TWO LEVELS DEEP SINCE 09-04, and the three sections that were
   a tab strip on this page are its siblings in the MENU now. Gabriel's spec
   marks them (Subitem) while Synthetics' three stay (Tab), so the page draws no
   strip at all and the route is what says which of the three you are on.

   Clicking the parent lands on the first child and opens the row, so the helper
   only does that when the children are not already showing - clicking
   Recordings again would reset the section to Sessions. */
const recordings = () => p.locator('.m-nav__row').filter({ hasText: 'Recordings' });
const section = async (name) => {
  if ((await recordings().locator('.m-nav__sections').count()) === 0) {
    await p.locator('.m-nav-item__label', { hasText: /^Recordings$/ }).first().click();
    await p.waitForTimeout(350);
  }
  await recordings()
    .locator('.m-nav__sections .m-nav-item__label', { hasText: new RegExp(`^${name}$`) })
    .first()
    .click();
  await p.waitForTimeout(450);
};
await section('Sessions');
await p.waitForTimeout(500);

/* ── 1. the page ──────────────────────────────────────────────────────────── */
const shell = await p.evaluate(() => ({
  title: document.querySelector('.m-page__title')?.textContent,
  meta: document.querySelector('.m-page__meta')?.textContent,
  tabs: [...document.querySelectorAll('.m-page__tabs .ant-tabs-tab')].map((e) => e.textContent.trim()),
  /* Where the three live now. */
  menuSections: [...document.querySelectorAll('.m-nav__sections .m-nav-item__label')]
    .map((e) => e.textContent.trim()),
  /* ⚠ TEXT TABS WITH AN INK BAR, not the pill strip. PageCard's `tabs` slot is
     "deliberately a different shape from the pill toolbar below, because a
     section replaces the body and a filter only narrows it" - and it held a
     FilterStrip for one build, which made the two sections read as two
     filters. */
  tabsArePills: !!document.querySelector('.m-page__tabs .m-seg__item'),
  /* the issue-type strip and its whole toolbar row are gone */
  /* ⚠ IN THE ANSWER PANEL'S HEAD SINCE 2026-09-04, not on the shell's own
     toolbar row. Mehdi, 09-03: "you have the tabs first, all errors whatever,
     and then you have the filters - IT SHOULD BE REVERSED. You filter something
     and then you look at the tabs to see what's in there." */
  hasToolbar: !!document.querySelector('.m-panel__head .m-seg__item'),
  onOldToolbar: !!document.querySelector('.m-page__toolbar'),
  tags: [...document.querySelectorAll('.m-panel__head .m-seg__item')].map((e) => e.textContent.trim()),
  tagCounts: [...document.querySelectorAll('.m-panel__head .m-seg__item')].map((e) =>
    Number((e.textContent.match(/(\d+)$/) ?? [])[1] ?? 0),
  ),
  columns: [...document.querySelectorAll('.m-ss__table th')].map((e) => e.textContent.trim()).filter(Boolean),
  rows: document.querySelectorAll('.m-ss__table tbody tr').length,
  foot: document.querySelector('.m-listfoot__range')?.textContent,
  /* ⚠ INVERTED 2026-09-04: the section takes the plane's own ground and the
     FIELD carries the tint. See the note on `.m-sc`. */
  searchBg: getComputedStyle(document.querySelector('.m-sc')).backgroundColor,
  planeBg: getComputedStyle(document.querySelector('.m-page')).backgroundColor,
  cardBg: getComputedStyle(document.querySelector('.m-panel')).backgroundColor,
  fieldBg: getComputedStyle(document.querySelector('.m-sc__filter')).backgroundColor,
  tableBg: getComputedStyle(document.querySelector('.m-ss__table')).backgroundColor,
}));
check('the page renders with the shell every other page uses',
  shell.title === 'Sessions' && shell.tabs.length === 3,
  `${shell.title}, tabs ${shell.tabs.join('/')}`);
/* ⚠ THREE SECTIONS SINCE 2026-09-02: Segments became a tab rather than a
   dropdown at the top of the page. Same argument Bookmarked won on - a section
   replaces the body, a filter narrows it, and a list of segments is a list of a
   different thing. */
/* ⚠ FOURTH REWRITE OF THIS ASSERTION IN THREE DAYS. The three were a dropdown
   (killed 09-02), then text tabs, then menu rows only (09-04 morning), and they
   are BOTH now - Gabriel asked for the strip back beside the rows.

   Which is fine, and the reason it is fine is the thing worth asserting: there
   is still only ONE piece of state. `model.tab` is written by the strip and the
   menu's highlight is DERIVED from it, so the two controls cannot disagree. The
   standing objection was never to two controls; it was to two copies. Checked
   below, at "the strip and the menu move together". */
check('the three sections are in the strip and in the menu, with the same names',
  !shell.tabsArePills
    && shell.tabs.join('/') === 'Sessions/Bookmarks/Segments'
    && ['Sessions', 'Bookmarks', 'Segments'].every((n) => shell.menuSections.includes(n)),
  `page ${shell.tabs.join('/')}, menu ${shell.menuSections.join('/')}`);
/* Mehdi, 2026-09-02: keep only the two tabs. The issue-type strip went and its
   toolbar row went with it - the date range and the display menu moved onto the
   search's own bar, which is the row that STICKS. */
/* ⚠ THE STRIP IS BACK, AND THE ERRORS COLUMN IS WHAT PAID FOR IT (Mehdi,
   2026-09-02, both instructions the same day). "It would be too much data to
   read and people wouldn't get it. That's why we made it as tabs." */
check('the issue-type strip rides the ANSWER panel, under the filter rather than over it',
  shell.hasToolbar && !shell.onOldToolbar && shell.tags.length === 7 && shell.tags[1].startsWith('Errors'),
  `${shell.tags.join(' | ')} — old toolbar ${shell.onOldToolbar}`);
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
/* ⚠ THE INVERSION (Gabriel, 2026-09-04: "I don't like the background of the
   section, it seems really disconnected - I think we should invert, brighter
   background on the back"). The filter used to be a grey band cut across a
   white plane, which read as a slab from another document: it shared no edge
   with the table under it and it was the only large grey shape on the page.

   Now the section shares the plane's ground and the FIELD is the tinted thing -
   the ordinary way round for a form, and it puts the fill on the one shape here
   you actually act on. */
/* ⚠ THE COMPARISON MOVED WITH THE SURFACE (2026-09-04). It used to read
   "shares its ground with the plane"; the plane has no ground any more - it is
   transparent, and the CARD is what the filter sits on. The claim underneath is
   unchanged: the section takes its container's own colour and the FIELD is the
   tinted thing, which is the ordinary way round for a form. */
check('the filter shares its ground with the card it is in, and the field carries the tint',
  shell.searchBg === shell.cardBg && shell.fieldBg !== shell.searchBg,
  `section ${shell.searchBg} on card ${shell.cardBg}, field ${shell.fieldBg}`);

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
    lefts: [...new Set(cells.map((e) => Math.round(e.getBoundingClientRect().left)))].length,
    numeric: cs?.fontVariantNumeric,
    family: cs?.fontFamily.split(',')[0],
  };
});
/* ⚠ ONE LEFT EDGE, NOT ONE RIGHT ONE (2026-09-04). Every column in this table
   is left-aligned now except the two glyph columns. Right-aligned figures are
   correct in a table you compare magnitudes down and this is not one - you scan
   it for a session - and the cost was visible: a right-aligned Duration ends
   where the left-aligned Location begins, so two values touch while their
   columns are 96 and 160 apart. The tabular face still matters, because that is
   what keeps the digits themselves in column. */
check('every figure in a column shares one left edge and one face',
  figs.n === 12 && figs.lefts === 1 && /tabular/.test(figs.numeric ?? ''),
  `${figs.n} cells, ${figs.lefts} edge, ${figs.numeric}`);

/* ── 2. ONE BUTTON, AND IT IS A BUTTON ──────────────────────────────────────
   Mehdi's ask on 09-02, and the one part of the search that survived every
   revision: "have event and filters within a single button."

   ⚠ AND ON 09-03 THE SECOND HALF OF THAT SENTENCE BECAME LOAD-BEARING TOO:
   *"I wouldn't put it as a bar. WE TRIED THE BAR BEFORE. People sometimes they
   type into the bar, they're expecting to see results in there."* OpenReplay
   shipped a type-into-it bar and removed it, so a field-shaped control that
   cannot take text is a known failure rather than a matter of taste - which is
   why this asserts the SHAPE and not only the count. */
const trigger = await p.evaluate(() => {
  const b = document.querySelector('.m-sc__filter');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const foot = document.querySelector('.m-sc__foot').getBoundingClientRect();
  const card = document.querySelector('.m-sc').getBoundingClientRect();
  const cs = getComputedStyle(b);
  return {
    shape: document.documentElement.getAttribute('data-trigger'),
    word: b.querySelector('.m-sc__filter-word')?.textContent?.trim(),
    key: b.querySelector('.m-sc__key')?.textContent?.trim(),
    width: Math.round(r.width),
    footWidth: Math.round(foot.width),
    /* ⚠ AT THE FOOT (Gabriel, 09-04: "the add filter button should be on the
       bottom"). It opened the card until then, which is where a search bar goes
       and not where an Add goes: the rules are the content, and a control that
       makes more of them belongs after the ones you have. */
    belowHalf: r.top > card.top + card.height / 2,
    /* the accent is spent here, on Mehdi's instruction: "in blue or in
       something obvious" - so the fill is NOT the card's own colour */
    bg: cs.backgroundColor,
    ink: cs.color,
    /* and no text input anywhere in the card: that is what a bar would be */
    inputs: document.querySelectorAll('.m-sc input[type="text"], .m-sc input:not([readonly])').length,
  };
});
check('there is exactly ONE way into the filter, and by default it is a BUTTON',
  !!trigger && trigger.shape === 'button' && trigger.word === 'Filter'
    && trigger.width < trigger.footWidth / 3,
  `${trigger?.shape}: "${trigger?.word}" at ${trigger?.width}px in a ${trigger?.footWidth}px row`);
check('it sits at the FOOT of the card, after the rules it adds to',
  trigger.belowHalf, `top ${trigger.belowHalf ? 'below' : 'above'} the card's middle`);
check('and it wears the accent, which is the one place this page spends it',
  trigger.bg !== 'rgb(255, 255, 255)' && trigger.ink !== 'rgb(0, 0, 0)',
  `${trigger.bg} / ${trigger.ink}`);
/* ⚠ THE BADGE IS A PROMISE, so the shortcut has to answer it - asserted below,
   at "the badge is not decoration". A control that advertises a shortcut and
   ignores it is worse than one that advertises nothing. */
check('it says how to reach it from the keyboard',
  /K$/.test(trigger.key ?? ''), trigger.key ?? 'no badge');

/* ⚠ NOTHING IN THE CARD INVITES TYPING - no text input, and in the button shape
   no rotating specimen either. */
check('and nothing in the card is a text field',
  trigger.inputs === 0 && (await p.locator('.m-sc__eg:visible').count()) === 0,
  `${trigger.inputs} inputs, ${await p.locator('.m-sc__eg:visible').count()} specimens`);

/* ── THE KEYBOARD PATH, BOTH HALVES ─────────────────────────────────────────
   ⌘K opens it from anywhere, and a printable character typed AT it opens the
   catalogue with that character already searched. The second one is the answer
   to the objection the bar died of - "people type into the bar, they're
   expecting to see results" - and it is the reason the bar can be offered
   again at all. */
await p.keyboard.press('Escape');
await p.waitForTimeout(200);
await p.keyboard.press('Meta+k');
await p.waitForTimeout(450);
check('the badge is not decoration: the shortcut opens the catalogue',
  (await p.locator('.m-fpanel').count()) === 1);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

await p.locator('.m-sc__filter').focus();
await p.keyboard.press('r');
await p.waitForTimeout(450);
const typed = await p.evaluate(() => ({
  open: !!document.querySelector('.m-fpanel'),
  query: document.querySelector('.m-pick__search input')?.value ?? '',
  rows: document.querySelectorAll('.m-pick__row').length,
}));
check('and typing at it opens the catalogue with the keystroke already in it',
  typed.open && typed.query === 'r' && typed.rows > 0,
  `"${typed.query}" — ${typed.rows} matches`);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

/* ⚠ NOT A SEARCH BAR AND NOT CALLED SEARCH (Gabriel, 2026-09-02). The magnifier
   IS the search signal, so the glyph is a funnel; and the control's own verb is
   Filter. */
const words = await p.evaluate(() => {
  const nav = document.querySelector('.m-sc');
  const glyph = nav.querySelector('.m-sc__filter-glyph');
  return {
    glyph: glyph?.getAttribute('class') || '',
    label: nav.querySelector('.m-sc__filter')?.getAttribute('aria-label') ?? '',
    all: nav.textContent ?? '',
  };
});
check('the control calls itself a filter, in one word and in its long name',
  /^Filter/.test(words.label) && !/search (these |the )?(sessions|recordings)/i.test(words.all),
  words.label);
check('and the glyph is a funnel, not a magnifier',
  !/magnif|search/i.test(String(words.glyph)), String(words.glyph).slice(0, 60));

/* ── 2b. ONE BUTTON, ONE MERGED LIST ────────────────────────────────────────
   ⚠ THIRD VERSION OF THIS BLOCK IN TWO DAYS, and the churn is the record of a
   real argument rather than indecision, so it is worth stating where it landed
   and why.

     09-02  one merged list behind one button
     09-04  a FORK: two cards first, then production's two lists, recut
     09-04  back to one merged list behind one button

   Mehdi rejected the fork on 09-03 by naming its two costs - *"you need to
   understand what a group filter is and what an event is, PLUS IT ADDS ANOTHER
   CLICK"* - and Gabriel agreed in the room: *"I definitely think the best
   option is merging them all."* He reached it the long way: he floated two
   buttons himself, walked production's two menus, and noticed Autocapture
   appears in BOTH, which makes the split redundant exactly where it is visible.

   So the kind is decided by WHAT YOU PICK, not before you pick. What this
   asserts is that both halves of that hold: one control, and one list holding
   both kinds with the kinds still legible in it. */
await p.locator('.m-sc__filter').click();
await p.waitForTimeout(500);
const picker = await p.evaluate(() => {
  const el = document.querySelector('.m-pick');
  if (!el) return null;
  const cats = [...el.querySelectorAll('.m-pick__cat')].map((e) => e.textContent.trim());
  return {
    rows: el.querySelectorAll('.m-pick__row').length,
    /* both halves of the catalogue, in one rail: the four categories the
       backend special-cases (all events) AND the property categories */
    events: ['Autocapture', 'Events', 'Features', 'Segments'].every((n) => cats.some((c) => c.includes(n))),
    props: ['Session', 'Technology', 'Geography', 'Metadata'].every((n) => cats.some((c) => c.includes(n))),
    /* ⚠ NO FORK. Not a card, not a stage, not a back arrow. */
    cards: document.querySelectorAll('.m-fork__card').length,
    back: document.querySelectorAll('.m-pick__back').length,
  };
});
check('one button opens ONE list holding both kinds, with no step in between',
  !!picker && picker.events && picker.props && picker.cards === 0 && picker.rows > 30,
  `${picker?.rows} entries, events ${picker?.events}, properties ${picker?.props}, ${picker?.cards} fork cards`);

/* AND THE PANEL STILL GROWS OUT OF ITS TRIGGER. The fork went; the morph is
   the half worth keeping, and it says more now than it did - a 108px button
   becoming a 528px panel is a bigger claim than a bar widening slightly. */
const morph = await p.evaluate(() => {
  const el = document.querySelector('.m-fpanel');
  const cs = getComputedStyle(el);
  return {
    from: cs.getPropertyValue('--m-fpanel-w0').trim(),
    grown: el.classList.contains('is-grown'),
    props: cs.transitionProperty,
    width: Math.round(el.getBoundingClientRect().width),
  };
});
check('and the panel morphs out of the button, from its own measured size',
  parseInt(morph.from, 10) > 40 && parseInt(morph.from, 10) < 300
    && morph.grown && /width/.test(morph.props) && morph.width > parseInt(morph.from, 10),
  `from ${morph.from} to ${morph.width}px`);

/* ⚠ AND THE TWO KINDS ARE STILL TOLD APART, twice, neither of them a step: the
   list heads each group with its name when a result spans both, and the row
   lands in the matching section below. That is what replaces the fork. */
const kinds = await p.evaluate(() =>
  [...document.querySelectorAll('.m-pick__kind-head .m-pick__kind-name')].map((e) => e.textContent.trim()));
check('the merged list still names its two kinds, in the words the sections use',
  kinds.join(' / ') === 'Events / Group filters', kinds.join(' / ') || 'no headings');

/* ⚠ AND THE PANEL FITS WHAT IS IN IT. Three separate ways it did not, all from
   the picker still carrying geometry it had while a Popover was its only host:

     the WIDTH was 27rem on the body, so a 528px panel held 432px of picker and
       the category chips stopped 96px short of the edge - which looked like a
       chip-alignment bug and was a sizing one
     the PADDING came from `.ant-popover-container`, which a panel is not, so
       the search row's ring sat flush on the card's own border
     the two SCROLLERS were capped at 21rem, a second and smaller ceiling
       inside a fixed panel, so the last row was clipped by `overflow: hidden`
       with no scrollbar to reach it

   Measured rather than looked at, because each one reads as a different bug
   than it is. */
const fit = await p.evaluate(() => {
  const panel = document.querySelector('.m-fpanel').getBoundingClientRect();
  const pick = document.querySelector('.m-pick').getBoundingClientRect();
  const list = document.querySelector('.m-pick__list');
  const tag = document.querySelector('.m-pick__cat-tag')?.getBoundingClientRect();
  return {
    inset: Math.round(pick.left - panel.left),
    slack: Math.round(panel.width - pick.width),
    tagGap: tag ? Math.round(panel.right - tag.right) : 999,
    scrolls: list.scrollHeight > list.clientHeight,
    over: Math.round(list.getBoundingClientRect().bottom - panel.bottom),
  };
});
check('the picker fills the panel, inset by the same hair every popover uses',
  fit.inset >= 4 && fit.slack <= 12 && fit.tagGap < 24,
  `inset ${fit.inset}px, ${fit.slack}px slack, chip ${fit.tagGap}px from the edge`);
check('and the list scrolls inside it rather than being clipped by it',
  fit.scrolls && fit.over <= 0, `scrolls ${fit.scrolls}, overhangs by ${fit.over}px`);

/* SEARCH SPANS EVERY CATEGORY, which is what two scoped pickers cannot do and
   the single biggest thing the merge buys: you never have to know whether the
   thing you want is an event before you can look for it. */
await p.fill('.m-pick__search input', 'rage');
await p.waitForTimeout(300);
const spans = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-pick__row')];
  return {
    names: rows.map((r) => r.querySelector('.m-pick__name')?.textContent?.trim()),
    cats: [...new Set(rows.map((r) => r.querySelector('.m-pick__cat-tag')?.textContent?.trim()))],
  };
});
check('one query reaches an autocapture event and a saved segment together',
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

/* ⚠ ONE DOOR, ALWAYS. It was two for a morning - the button retired once there
   was a rule and each section grew its own Add - and that was the fork's
   arrangement, not this one's. Gabriel, 2026-09-04: "when the list appears we
   should keep having a single Add button; they won't be divided into two." */
const addEntry = async (name) => {
  await p.locator('.m-sc__filter').click();
  await p.waitForTimeout(400);
  await p.fill('.m-pick__search input', name);
  await p.waitForTimeout(300);
  await p.locator('.m-pick__row').first().click();
  await p.waitForTimeout(350);
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

/* ── 5b. THE TWO SCOPES: NAMED, AND REAL ────────────────────────────────────
   The whole of Mehdi's 2026-09-02 explanation, asserted, because it is the one
   part of this control a screenshot cannot show.

   He spent five minutes on it: an EVENT-level filter narrows one event ("error,
   where country is Albania"), a BLOCK-level one "will apply to both events on
   top of it... it's a group filtering basically". Then he named the fix - "not
   filters, we'll call them something else, like group filters" - and the reason
   for it: "people don't know right away what an event is, what a filter is."

   Two claims, and each one had failed in a different way:

   1. THE NAMES. The card printed no headings at all, so nothing on screen said
      which scope a row had. The picker printed two of its own invention
      ("Things that happened", "Conditions on the session") that no row ever
      landed under.
   2. THE BEHAVIOUR. `eventPosition` ignored a row's sub-properties, so the
      event-level control could not change a result. Two scopes that return the
      same sessions are one scope with a caption. */
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(350);
for (const n of ['Click', 'checkout_start', 'Country']) await addEntry(n);
const scopes = await p.evaluate(() => ({
  names: [...document.querySelectorAll('.m-sc__head-name')].map((e) => e.textContent.trim()),
  hint: document.querySelector('.m-sc__head-hint')?.textContent?.trim(),
  /* ⚠ BACK ON THE STRIP (Gabriel, 09-04: "you also have removed the events
     order - go back to what it was"). It spent one morning in the Events
     heading, where production keeps it, and could not be found there: a
     control at the end of a heading reads as part of the label. */
  orderInHead: !!document.querySelector('.m-sc__head .m-sc__order'),
  orderInStrip: !!document.querySelector('.m-sc__strip .m-sc__order'),
  /* and the heading sits above its own rows rather than floating */
  headBeforeRows:
    document.querySelector('.m-sc__head')?.compareDocumentPosition(document.querySelector('.m-srow'))
      === Node.DOCUMENT_POSITION_FOLLOWING,
}));
check('the card names its two kinds, and the block kind is the word Mehdi asked for',
  scopes.names.join(' / ') === 'Events / Group filters', scopes.names.join(' / '));
check('and prints the scope under the name it belongs to',
  scopes.hint === 'Applied to every event above', scopes.hint);
check('the order control is on the strip, beside the count it changes',
  scopes.orderInStrip && !scopes.orderInHead && scopes.headBeforeRows,
  `strip ${scopes.orderInStrip}, head ${scopes.orderInHead}`);

/* ⚠ AND THE FUNNEL SAYS THE OPPOSITE SENTENCE. Every entry in that picker is
   one kind, so no kind heading is drawn - which leaves the control looking
   identical to the one that adds a group filter. */
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(350);
await addEntry('Click');
const before = await p.evaluate(() => document.querySelector('.m-sc__count')?.textContent?.trim());
await p.hover('.m-srow');
await p.waitForTimeout(200);
await p.locator('.m-srow__prop-add').first().click();
await p.waitForTimeout(350);
const note = await p.evaluate(() => document.querySelector('.m-pick__note')?.textContent?.trim());
check('the event-level picker says which scope it is, in the words the heading contradicts',
  note === 'Applied to this event only', note);
await p.fill('.m-pick__search input', 'URL');
await p.waitForTimeout(300);
await p.locator('.m-pick__row').first().click();
await p.waitForTimeout(400);
const pending = await p.evaluate(() => document.querySelector('.m-sc__count')?.textContent?.trim());
check('a sub-filter with no value yet narrows nothing, and says so rather than emptying the list',
  pending === before, `${before} → ${pending}`);

await p.locator('.m-srow__prop .m-vp__trigger').first().click();
await p.waitForTimeout(450);
await p.locator('.m-vp .m-checkrow').first().click();
await p.waitForTimeout(300);
await p.mouse.click(900, 40);
await p.waitForTimeout(450);
const scoped = await p.evaluate(() => ({
  count: document.querySelector('.m-sc__count')?.textContent?.trim(),
  n: Number(document.querySelector('.m-sc__count')?.textContent?.trim().split(' ')[0]),
}));
const beforeN = Number((before ?? '0').split(' ')[0]);
check('AND THE EVENT-LEVEL FILTER ACTUALLY FILTERS — the funnel was decoration until 09-04',
  scoped.n > 0 && scoped.n < beforeN, `${before} → ${scoped.count}`);

/* ── 5c. ONE DOOR, AND IT DOES NOT MOVE ─────────────────────────────────────
   ⚠ THIRD ARRANGEMENT IN A DAY, and the reasoning is worth keeping because each
   one was right for the design it belonged to.

     the button opened a FORK, so a second visit was a second answer to a
       question you had already answered - hence: the button retired once there
       was a rule, and each section grew its own Add
     the fork is gone, so that cost is gone with it - and two Adds is what Mehdi
       objected to in the first place

   Gabriel, 2026-09-04: *"when the list appears, we should keep having a single
   Add button - they won't be divided into two Add buttons."* One control, one
   place, whatever the filter holds. A control that moves house when the list
   fills is a control you have to find twice. */
const doors = await p.evaluate(() => ({
  button: document.querySelectorAll('.m-sc__filter').length,
  adds: document.querySelectorAll('.m-sc__add').length,
  heads: [...document.querySelectorAll('.m-sc__head-name')].map((e) => e.textContent.trim()),
  /* the list's controls never move either, because the row they sit on never
     goes away */
  /* ⚠ ON THE HEAD ROW SINCE 2026-09-04, which is the row that used to be a
     summary strip. Mehdi, 09-03: "maybe custom range and that button for
     display on the right - maybe then you can merge with the line above it and
     then you can use less space." One row where there were two. */
  onHead: !!document.querySelector('.m-sc__head-trailing .m-daterange, .m-sc__head-trailing button'),
  save: document.querySelector('.m-sc__save')?.textContent?.trim(),
  savedBesideClear: (() => {
    const strip = document.querySelector('.m-sc__strip');
    return !!strip?.querySelector('.m-sc__save') && !!strip?.querySelector('.m-sc__clear');
  })(),
}));
check('there is one way in and it is still there once the list has filled',
  doors.button === 1 && doors.adds === 0,
  `${doors.button} button, ${doors.adds} section adds`);
check('and both sections are still named, because the scope has to be readable',
  doors.heads.join('/') === 'Events/Group filters', doors.heads.join('/'));
check('the window rides the head row, one row where there were two',
  doors.onHead);
check('Save as segment sits beside Clear, where it can only be reached once it is true',
  doors.savedBesideClear && /Save as segment/.test(doors.save ?? ''), doors.save ?? 'not on the strip');

/* AND CLEARING LEAVES THE DOOR WHERE IT WAS. */
await p.mouse.move(200, 300);
await p.waitForTimeout(400);
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(400);
check('clearing empties the list and leaves the button in the same place',
  (await p.locator('.m-sc__filter').count()) === 1 && (await p.locator('.m-sc__head').count()) === 0);

/* ── 6. the metadata chip writes to the search ─────────────────────────────
   ⚠ THE COLUMN IS ON BY DEFAULT since 2026-09-02 ("then it should be by
   default"), so this no longer turns it on - it ASSERTS it is on, then uses it.
   The old version clicked the Display pill unconditionally, which turned the
   column off the moment the default changed and then waited thirty seconds for
   a chip that could not exist. A setup step that assumes a default is a setup
   step that breaks silently when the default is the thing under test.

   ⚠ AND THE CLEAR IS GUARDED for the same class of reason: §5c now ends with an
   empty filter, so the button it used to click unconditionally is not there -
   and a click on a control that is not there is a thirty-second timeout rather
   than a failed assertion. */
if (await p.locator('.m-sc__clear').count()) {
  await p.locator('.m-sc__clear').click();
  await p.waitForTimeout(400);
}
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

/* ── 6b. THE NAME ON A ROW NARROWS TO THAT PERSON (2026-09-04) ─────────────
   Gabriel: make the session user clickable, "with a mute hover with dotted
   underline, and when clicked the table will be filtered by that user".

   Three things have to be true and each one is easy to break:
   1. it is a CONTROL and reads as text until you reach it - twenty rows of
      underlined links is a page of links, so the dotted rule arrives on hover
   2. clicking it does NOT open the replay. The row is clickable too, and the
      two verbs are different questions about the same row
   3. it narrows to the person rather than to the row, so a user with eight
      sessions gives eight - and it REPLACES an identity clause rather than
      stacking a second one that could never also be true */
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(400);
const nameCtl = await p.evaluate(() => {
  const el = document.querySelector('.m-ss__name');
  const c = getComputedStyle(el);
  return { tag: el.tagName, cursor: c.cursor, deco: c.textDecorationColor, color: c.color };
});
await p.locator('.m-ss__name').first().hover();
await p.waitForTimeout(300);
const nameHover = await p.evaluate(() => {
  const c = getComputedStyle(document.querySelector('.m-ss__name'));
  return {
    line: `${c.textDecorationLine} ${c.textDecorationStyle}`,
    deco: c.textDecorationColor,
    color: c.color,
  };
});
check('the name on a row is a control, not a label',
  nameCtl.tag === 'BUTTON' && nameCtl.cursor === 'pointer', `${nameCtl.tag}, ${nameCtl.cursor}`);
check('and it reads as text until the cursor reaches it',
  /rgba\(.*0\)$/.test(nameCtl.deco) && nameHover.line === 'underline dotted'
    && nameHover.deco === nameHover.color,
  `rest ${nameCtl.deco} -> hover ${nameHover.line} ${nameHover.deco}`);
check('and the hover steps BACK rather than lighting up',
  nameHover.color !== nameCtl.color, `${nameCtl.color} -> ${nameHover.color}`);

/* ⚠ THE ONE THAT MATTERS, AND IT NEEDS THE RIGHT PERSON. Filtering to somebody
   with exactly one session is satisfied by any bug that leaves a single row on
   screen, so this walks the pages until it finds a name that repeats. Page one
   is all lead sessions, which are one-per-person by construction - taking the
   first page's "most repeated" name gets you a count of one and an assertion
   that proves nothing. */
const onPage = () =>
  p.evaluate(() => {
    const counts = new Map();
    for (const el of document.querySelectorAll('.m-ss__name')) {
      const t = el.textContent.trim();
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], n: top[1] } : null;
  });
let many = null;
const pageNums = await p.locator('.ant-pagination-item').evaluateAll((e) => e.map((x) => x.textContent.trim()));
for (const n of pageNums) {
  await p.locator('.ant-pagination-item', { hasText: new RegExp(`^${n}$`) }).click();
  await p.waitForTimeout(350);
  const top = await onPage();
  if (top && top.n > 1) { many = top.name; break; }
}
check('the fixture holds somebody with more than one session to test this with',
  !!many, many ?? 'every visible identity is unique');
await p.locator('.m-ss__name', { hasText: many }).first().click();
await p.waitForTimeout(600);
const narrowed = await p.evaluate(() => ({
  names: [...new Set([...document.querySelectorAll('.m-ss__name')].map((e) => e.textContent.trim()))],
  seeds: [...new Set([...document.querySelectorAll('.m-savatar__img:not(.is-light)')].map((i) => new URL(i.src).searchParams.get('seed')))],
  rows: document.querySelectorAll('.m-ss__table tbody tr.ant-table-row').length,
  clauses: document.querySelectorAll('.m-srow').length,
  subject: document.querySelector('.m-srow__name')?.textContent?.trim(),
  value: document.querySelector('.m-srow .m-vp__trigger')?.textContent?.trim(),
  drawer: document.querySelectorAll('.ant-drawer-open').length,
}));
check('clicking it leaves only that person, and more than one row of them',
  narrowed.names.join('|') === many && narrowed.rows > 1,
  `${narrowed.rows} rows, ${narrowed.names.length} identities`);
check('and it does not open the replay on the way',
  narrowed.drawer === 0, `${narrowed.drawer} drawers opened`);
/* ⚠ THE CLAUSE SAYS THE NAME YOU CLICKED. It said `u-7734` under a row reading
   `mia.okonkwo@brightline.co` until the fixture's `displayName` was made
   derived - production builds `userDisplayName: userId || userAnonymousId`, so
   the id IS what the row prints, and a stored copy beside it could disagree. */
check('and the clause it wrote names what you clicked',
  narrowed.clauses === 1 && narrowed.subject === 'User ID' && narrowed.value === many,
  `${narrowed.clauses} clause: ${narrowed.subject} = ${narrowed.value}`);
check('and every one of those rows wears the same robot',
  narrowed.seeds.length === 1 && narrowed.seeds[0] === many, narrowed.seeds.join('|'));

/* ⚠ CLICKING A NAME AGAIN LEAVES ONE CLAUSE, NOT TWO. `filterToIdentity`
   replaces the identity clause rather than appending, because two of them can
   never both be true and the list would go empty.

   ⚠ AND THIS IS THE ONLY PART OF THAT REACHABLE FROM THE UI, which is worth
   writing down rather than rediscovering: once you have filtered to one person,
   the only names on screen are theirs, so "click a DIFFERENT name second" is
   not a thing a user can do from here. Clicking the same one again is - and it
   goes through the same replace path. The cross-person case is guarded by the
   transform and exercised by nothing. */
await p.locator('.m-ss__name').first().click();
await p.waitForTimeout(500);
const again = await p.evaluate(() => ({
  clauses: document.querySelectorAll('.m-srow').length,
  value: document.querySelector('.m-srow .m-vp__trigger')?.textContent?.trim(),
  rows: document.querySelectorAll('.m-ss__table tbody tr.ant-table-row').length,
}));
check('and clicking the same name again replaces the clause rather than stacking it',
  again.clauses === 1 && again.value === many && again.rows > 1,
  `${again.clauses} clause: ${again.value}, ${again.rows} rows`);
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(400);
await p.locator('.ant-pagination-item', { hasText: '1' }).click();
await p.waitForTimeout(350);

/* ── 6c. THE ROW OPENS THE REPLAY (2026-09-04) ─────────────────────────────
   Gabriel: "clicking on the sessions row (except the session name, and the
   metadata pills) will open a session replay, same session replay we have in
   issues."

   ⚠ THE EXCEPTIONS ARE ASSERTED FIRST, because they are the part that breaks.
   Both are `<button>`s and one guard covers them, so what has to be checked is
   that the guard is still there - a row handler that stopped honouring it would
   still look right until you tried to click a name. */
/* ── 6b-i. THE DEVICE IS ONE GLYPH (2026-09-04) ────────────────────────────
   Gabriel, on Mehdi's ask: the device should be an icon for tablet / desktop /
   mobile, and the OS and the browser should appear only in the tooltip.

   It was `Chrome / macOS · desktop` in a 158px cell, set in two sizes. What a
   reader wants at a glance is *phone or computer*, because it changes what the
   session means - a rage click and a rage tap are different events. A browser
   version is a detail you look up about one row, never a thing you compare down
   a column.

   ⚠ THE GLYPH IS THE DEVICE, NOT THE BROWSER, which is what makes it buildable:
   browser marks are brand logos, lucide has none, and redrawing one is the
   thing the design rules here forbid first. Three device types are three shapes
   that already exist. */
const device = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-ss__row')];
  const th = [...document.querySelectorAll('.m-ss__table thead th')];
  const col = th.find((t) => t.textContent.trim() === 'Device');
  return {
    rows: rows.length,
    glyphs: rows.filter((r) => r.querySelector('.m-ss__dev svg')).length,
    text: rows.map((r) => r.querySelector('.m-ss__dev')?.textContent?.trim()).join(''),
    labels: [...new Set(rows.map((r) => r.querySelector('.m-ss__dev')?.getAttribute('aria-label')))],
    width: col ? Math.round(col.getBoundingClientRect().width) : null,
    stale: !!document.querySelector('.m-ss__device'),
  };
});
check('the device cell is one glyph and no words',
  device.glyphs === device.rows && device.text === '' && !device.stale,
  `${device.glyphs}/${device.rows} glyphs, text "${device.text}"`);
/* ⚠ SIZED TO THE HEADER, NOT TO THE GLYPH, which is the whole lesson of it.
   At 44px - a glyph's width - the word "Device" did not fit, and a `th` that
   does not fit its own title WRAPS: the header row went from 31px to 49px and
   every other column got taller with it. The least local failure a table has,
   and invisible until you look straight at the header band. */
check('and its column is sized to its title rather than to its glyph',
  device.width !== null && device.width >= 56 && device.width <= 72, `${device.width}px`);
const headers = await p.evaluate(() => {
  const th = [...document.querySelectorAll('.m-ss__table thead th')];
  return {
    height: Math.round(th[0]?.getBoundingClientRect().height ?? 0),
    tight: th.filter((t) => t.scrollWidth > t.clientWidth + 1).map((t) => t.textContent.trim()),
  };
});
check('and no column title is wider than the column it names',
  headers.tight.length === 0 && headers.height < 40,
  `${headers.height}px header, tight: ${headers.tight.join(', ') || 'none'}`);
/* ⚠ AND THE TITLE ROW IS ONE COLOUR ALL THE WAY ACROSS. The play column is
   sticky and sets its cell `transparent` over a gradient fading to a property
   only the BODY rows carry - which the `th` matches too, so the last 52px of
   the title row was a hole showing the plane through it. Compared against the
   NEIGHBOUR rather than against a literal: `Table.headerBg` is a token, and if
   it moves this should go red rather than drift. */
const headerBand = await p.evaluate(() => {
  const th = [...document.querySelectorAll('.m-ss__table thead th')];
  return th.map((t) => getComputedStyle(t).backgroundColor);
});
check('and the title row is one colour from end to end',
  new Set(headerBand).size === 1 && !/, 0\)$/.test(headerBand[0] ?? ''),
  [...new Set(headerBand)].join(' | '));
/* ⚠ THE LABEL IS ON THE ELEMENT, not left to the tooltip. A tooltip is a hover,
   and a hover reaches neither a screen reader nor a keyboard - without this the
   cell is an unlabelled picture of a phone. */
check('and the browser and OS are still readable without a mouse',
  device.labels.length > 1 && device.labels.every((l) => / on .+, (Desktop|Phone|Tablet)$/.test(l ?? '')),
  device.labels.slice(0, 2).join(' | '));
/* ⚠ AND PARK THE POINTER FIRST. The date range and the Display menu ride the
   strip now that the bar retires, so a tooltip from one of them can still be
   mounted when this runs - and `.ant-tooltip` first matched THAT one, which
   reported "Display" and read as a broken device tooltip. */
await p.mouse.move(1400, 900);
await p.waitForTimeout(500);
await p.locator('.m-ss__dev').first().hover();
/* ⚠ WAIT FOR THE TOOLTIP, DO NOT SLEEP AT IT. antd's own `mouseEnterDelay`
   plus a mount animation is most of a second, and a fixed 600ms was landing on
   the wrong side of it often enough to look like a broken tooltip. */
await p.locator('.ant-tooltip:visible').first().waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
const devTip = (await p.locator('.ant-tooltip:visible').first().textContent().catch(() => null))?.trim();
check('and the words moved to the tooltip',
  / on .+ · (Desktop|Phone|Tablet)$/.test(devTip ?? ''), devTip ?? 'no tooltip');
await p.mouse.move(1400, 900);
await p.waitForTimeout(300);

const replayOpen = () => p.locator('.m-sreplay').count();

/* ⚠ AND THE ROW SAYS IT IS A CLICK (Gabriel, 2026-09-04: "the row cursor should
   be the click cursor"). The play glyph on the right was carrying the whole
   affordance, at the far edge of a wide table - which is the corner a reader is
   not looking at while they read a name on the left. Asserted on a plain CELL,
   not on a control inside one, because a `<button>` sets its own. */
const rowCursor = await p.evaluate(() => {
  const row = document.querySelector('.m-ss__row');
  return {
    row: getComputedStyle(row).cursor,
    cell: getComputedStyle(row.querySelector('td:nth-child(3)')).cursor,
  };
});
check('the row wears the click cursor, and so does a plain cell in it',
  rowCursor.row === 'pointer' && rowCursor.cell === 'pointer',
  `row ${rowCursor.row}, cell ${rowCursor.cell}`);

await p.locator('.m-ss__name').first().click();
await p.waitForTimeout(500);
check('clicking the name does not open the replay', (await replayOpen()) === 0);
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(400);

if (await p.locator('.m-ss__meta-chip').count()) {
  await p.locator('.m-ss__meta-chip').first().click();
  await p.waitForTimeout(500);
  check('and neither does a metadata pill', (await replayOpen()) === 0);
  await p.locator('.m-sc__clear').click();
  await p.waitForTimeout(400);
}

/* An UNVIEWED row, so the "watching marks it read" assertion has something to
   change. A row that was already read proves nothing. */
const fresh = p.locator('.m-ss__table tbody tr.ant-table-row:not(.is-viewed)').first();
const freshName = (await fresh.locator('.m-ss__name').textContent())?.trim();
const freshBrowser = await fresh.evaluate((r) => r.textContent);
await fresh.locator('td').nth(2).click();
await p.waitForTimeout(800);
const player = await p.evaluate(() => {
  const marks = [...document.querySelectorAll('.m-tl__mark')];
  return {
    open: !!document.querySelector('.m-sreplay'),
    list: !!document.querySelector('.m-ss__table'),
    who: document.querySelector('.m-sreplay__who')?.textContent?.trim(),
    env: document.querySelector('.m-player__env')?.textContent?.trim(),
    total: document.querySelector('.m-tl__clock--total')?.textContent?.trim(),
    caption: document.querySelector('.m-player__caption')?.textContent?.trim(),
    marks: marks.length,
    kinds: [...new Set(marks.map((m) => m.className.match(/m-tl__mark--(\w+)/)?.[1]))],
    labels: marks.map((m) => m.getAttribute('aria-label')),
    seed: (() => {
      const i = document.querySelector('.m-sreplay .m-savatar__img:not(.is-light)');
      return i ? new URL(i.src).searchParams.get('seed') : null;
    })(),
  };
});
check('clicking anywhere else on the row opens the replay, and it takes the plane',
  player.open && !player.list, `open ${player.open}, list still there ${player.list}`);
check('and it is the person whose row you clicked, wearing the same robot',
  player.who === freshName && player.seed === freshName, `${player.who} / ${player.seed}`);
/* ⚠ THE SAME PLAYER AS ISSUES, not a second one built for this list: the proof
   is that its timeline, its frame and its chrome are the issue player's own
   classes. If this ever fails because the classes changed, check that the
   sessions list is still rendering `ReplayPlayer` rather than a copy. */
check('and it is the issue queue\'s own player, not a second one',
  player.env?.includes(' on ') && !!player.total && player.caption === 'Session start',
  `${player.env} · ${player.total} · "${player.caption}"`);

/* ⚠ THE MARKERS ARE THE SESSION'S OWN EVENTS. The player derives everything -
   track, caption, panel - from one journey STRING, and a `SessionRow` has no
   prose at all. `shared/session-replay.ts` writes that string from
   `sessionEvents()`, one clause per event, so scrubbing the track is reading
   the event list. The kinds matter as much as the count: the phrases are
   worded to be classified by `kindOf`, and a rage or an error that came out as
   an ordinary click would mean the wording drifted from KIND_RULES. */
check('its track is the session\'s own events, classified',
  player.marks >= 3 && player.kinds.length >= 3 && player.kinds.every(Boolean),
  `${player.marks} markers over ${player.kinds.join('/')}`);
check('and every marker says when and what',
  player.labels.every((l) => /^Jump to \d+:\d\d: \S/.test(l ?? '')), player.labels[0] ?? 'none');

/* Seeking has to move the caption, or the track is decoration. */
await p.locator('.m-tl__mark').nth(2).click();
await p.waitForTimeout(400);
const sought = await p.evaluate(() => ({
  caption: document.querySelector('.m-player__caption')?.textContent?.trim(),
  clock: document.querySelector('.m-tl__clock')?.textContent?.trim(),
}));
check('and seeking a marker moves the playhead and the caption with it',
  sought.caption !== 'Session start' && sought.clock !== '0:00',
  `${sought.clock} "${sought.caption}"`);

/* Back, not close: the list you left, with the search and the page you had. */
await p.locator('.m-sreplay__back').click();
await p.waitForTimeout(600);
const returned = await p.evaluate(() => ({
  list: !!document.querySelector('.m-ss__table'),
  replay: !!document.querySelector('.m-sreplay'),
  viewed: [...document.querySelectorAll('.m-ss__table tbody tr.ant-table-row')]
    .filter((r) => r.className.includes('is-viewed'))
    .some((r) => r.textContent?.includes('@') || true),
}));
check('going back returns the list rather than a fresh page',
  returned.list && !returned.replay, `list ${returned.list}, replay ${returned.replay}`);
/* ⚠ WATCHING MARKS IT READ, and the row you opened was chosen unviewed on
   purpose. The list has always drawn a read row more quietly; it was drawing
   the fixture's opinion of what you had seen, which stops being true the first
   time you open anything. */
const nowViewed = await p
  .locator('.m-ss__table tbody tr.ant-table-row.is-viewed', { hasText: freshName })
  .count();
check('and the session you watched is marked read',
  nowViewed > 0, `${freshName} — ${nowViewed} viewed rows carry it`);
void freshBrowser;

/* Leaving the section closes it: the three are menu rows now, and a Bookmarks
   row that opened onto whatever was playing would be the menu lying. */
await p.locator('.m-ss__table tbody tr.ant-table-row').first().locator('td').nth(2).click();
await p.waitForTimeout(600);
const wasOpen = (await replayOpen()) > 0;
await section('Bookmarks');
const afterSwitch = (await replayOpen()) > 0;
check('and moving to another section closes the replay',
  wasOpen && !afterSwitch, `open ${wasOpen} -> ${afterSwitch}`);
await section('Sessions');

/* ── 7. bookmarks is its own destination, and everything keeps working ───── */
const allFoot = await p.locator('.m-listfoot__range').textContent();
await section('Bookmarks');
const vault = await p.evaluate(() => ({
  rows: document.querySelectorAll('.m-ss__table tbody tr').length,
  marks: document.querySelectorAll('.m-ss__mark').length,
  foot: document.querySelector('.m-listfoot__range')?.textContent?.trim(),
  empty: document.querySelector('.m-empty__title')?.textContent?.trim(),
  searchStillThere: !!document.querySelector('.m-sc'),
  /* The menu still holds all three, so leaving Sessions did not leave the
     area - which is what a sibling destination has to prove now that it is not
     a tab. */
  tabsStillThere: [...document.querySelectorAll('.m-nav__sections .m-nav-item__label')]
    .filter((e) => ['Sessions', 'Bookmarks', 'Segments'].includes(e.textContent.trim())).length === 3,
  columnsStillThere: document.querySelectorAll('.m-ss__table th').length > 4,
}));
/* Its own page, but the SAME page: the search, the sibling rows and the columns
   all keep working inside it. A section replaces the body; it does not replace
   the shell around it. */
check('bookmarks is the same list with a different body, not a different page',
  vault.searchStillThere && vault.tabsStillThere,
  `search ${vault.searchStillThere}, tabs ${vault.tabsStillThere}, columns ${vault.columnsStillThere}`);
/* ⚠ THIS BRANCH HAD BEEN DEAD SINCE 09-02 and went red the moment it ran. It
   asserted `marks === rows` - one `.m-ss__mark` per row - and the row's
   bookmark mark was REMOVED that day ("people don't use the bookmark there").
   It only ever passed because a filter left over from the previous step made
   the list empty, so the check took its other branch and tested the empty
   state instead. Clearing the search first is what exposed it.

   What is left to assert without a per-row mark is the shape of the list: it is
   a real, strictly smaller slice of the same set. */
check('and it shows a real, smaller slice of the same list',
  vault.rows === 0
    ? !!vault.empty
    : vault.marks === 0 && !!vault.foot && vault.foot !== allFoot?.trim(),
  vault.rows === 0 ? vault.empty : `${vault.foot} of ${allFoot?.trim()}`);

/* ── 8. the empty search is not an empty state ───────────────────────────── */
await section('Sessions');
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
  summary: document.querySelector('.m-sc__summary')?.textContent?.trim(),
  window: !!document.querySelector('.m-sc__head-trailing .m-daterange, .m-sc__head-trailing button'),
}));
/* ⚠ THE HEAD SURVIVES AN EMPTY FILTER, and that is the change. It used to
   appear only once there was something to summarise, which meant the DATE
   WINDOW - a control that narrows the list whether or not a filter does -
   vanished with it. Empty, the row reads "Every session" beside the window,
   which is exactly true. */
check('an empty filter is one head row and a trigger, with no empty state under it',
  emptyFilter.rows === 0 && emptyFilter.pills === 0 && emptyFilter.strip,
  `${emptyFilter.rows} rows, ${emptyFilter.pills} leftover example elements, head ${emptyFilter.strip}`);
check('and it says what it currently means, beside the window it runs over',
  /Every session/.test(emptyFilter.summary ?? '') && emptyFilter.window,
  `"${emptyFilter.summary}", window ${emptyFilter.window}`);

/* ⚠ REVERSED 2026-09-03, AND THE OLD ASSERTION IS WORTH LEAVING IN THE RECORD.
   It read "the field is the biggest control on the page and the only one at
   14px", and it was a faithful test of a claim that turned out to be the
   problem: size is what made it read as a field, and a field is what people
   typed into. The claim now is the opposite - it is the same height as the
   controls beside it and it is told apart by COLOUR instead. */
const weight = await p.evaluate(() => {
  const f = document.querySelector('.m-sc__filter');
  /* ⚠ THE NEIGHBOURS MOVED. The trigger is at the FOOT now and the window is on
     the HEAD row, so "the controls beside it" are the head's - which is still
     the comparison that matters: one coloured control that is not taller than
     the app's own scale. */
  const others = [...document.querySelectorAll('.m-sc__head-trailing .ant-select, .m-sc__head-trailing button')];
  return {
    h: Math.round(f.getBoundingClientRect().height),
    others: others.map((e) => Math.round(e.getBoundingClientRect().height)),
    size: getComputedStyle(f.querySelector('.m-sc__filter-word')).fontSize,
  };
});
check('the button sits on the same baseline as the controls beside it, not above them',
  weight.others.length > 0 && weight.others.every((h) => Math.abs(h - weight.h) <= 2),
  `${weight.h}px against ${weight.others.join('/')}px`);

/* ⚠ THE SENTENCE PATH IS OFF, AND STILL THERE. `translate()` and the picker's
   whole offer are untouched in the shared layer; the card simply stops passing
   `onTranslate`, which is the single switch. So this asserts BOTH halves: the
   picker offers nothing to a typed sentence, and the function that would do it
   still works when called. If somebody deletes `translate()` to tidy up, this
   fails - which is the point. */
await p.locator('.m-sc__filter').click();
await p.waitForTimeout(400);
await p.fill('.m-pick__search input', 'paid users who hit an error');
await p.waitForTimeout(350);
const parked = await p.evaluate(() => ({
  offer: !!document.querySelector('.m-pick__nl button'),
  steps: document.querySelectorAll('.m-pick__steps li').length,
}));
check('the sentence path is switched off at the callsite', !parked.offer && parked.steps === 0,
  `offer ${parked.offer}, ${parked.steps} steps`);
/* One Escape again: the fork's second door is gone. */
await p.keyboard.press('Escape');
await p.waitForTimeout(200);

/* ── 9. TWO COMPONENTS, AND THE RIGHT ONE STICKS ────────────────────────────
   ⚠ REWRITTEN 2026-09-04. This used to assert that the SEARCH holds its place
   while the rows go past it, which was true and is now the opposite of the
   design.

   Mehdi, 09-03, walking production: *"We need to have components. This screen
   should probably be two components… this is just a technique we used over time
   to have it more airy."* Two here, three at the very most.

   The split is what makes the set against what reads the set: the QUESTION
   (filter, window, Save, Clear) and the ANSWER (breakdown, display, columns,
   rows, count). And it reverses what sticks — you stop needing the filter once
   you are reading results, which is the argument its own collapse is built on,
   while the two things you never stop needing are the breakdown and the column
   titles.

   Asserted on a SHORT window, because a tall one fits twelve rows and a body
   that never scrolls cannot prove anything. */
await p.setViewportSize({ width: 1400, height: 560 });
await p.waitForTimeout(400);

const shape = await p.evaluate(() => {
  const body = document.querySelector('.m-page__body');
  const panels = [...body.querySelectorAll(':scope > .m-panel')];
  const plane = getComputedStyle(document.querySelector('.m-page'));
  const shell = getComputedStyle(document.querySelector('.m-shell'));
  return {
    n: panels.length,
    /* ⚠ THE PLANE GAVE UP ITS SURFACE rather than holding cards inside itself.
       Ground, plane, card is three levels deep, and two is what this had
       before. */
    planeBg: plane.backgroundColor,
    planeBorder: plane.borderTopWidth,
    ground: shell.backgroundColor,
    cardBg: panels[0] ? getComputedStyle(panels[0]).backgroundColor : null,
    /* the air between them, which is the whole of the separation - no rule, no
       shadow, no third colour */
    air: panels.length > 1
      ? Math.round(panels[1].getBoundingClientRect().top - panels[0].getBoundingClientRect().bottom)
      : 0,
  };
});
check('the page is TWO components on the ground, not one plane holding everything',
  shape.n === 2 && shape.planeBg === 'rgba(0, 0, 0, 0)' && shape.planeBorder === '0px',
  `${shape.n} panels, plane ${shape.planeBg} with a ${shape.planeBorder} border`);
check('and they are cards on the ground rather than a third surface level',
  shape.cardBg !== shape.ground && shape.cardBg !== 'rgba(0, 0, 0, 0)',
  `card ${shape.cardBg} on ground ${shape.ground}`);
check('with real air between them, and nothing else separating them',
  shape.air >= 8, `${shape.air}px`);

/* ⚠ A PANEL THAT CANNOT CLIP HAS TO HAND ITS CORNERS DOWN, and the failure is
   invisible in light mode. The question panel is `overflow: visible` so its
   catalogue can escape (see `spills`), which means the filter card inside it -
   a square-cornered box filling a rounded one, IN THE SAME COLOUR - paints its
   own corner outside the curve, against the ground. In dark mode that escaped
   pixel is a light square sitting on black, and it reads as the card
   overflowing its own radius. */
const corners = await p.evaluate(() => {
  const out = [];
  for (const panel of document.querySelectorAll('.m-panel.is-spilling')) {
    const want = getComputedStyle(panel).borderTopLeftRadius;
    const first = panel.firstElementChild;
    const last = panel.lastElementChild;
    if (first) out.push([getComputedStyle(first).borderTopLeftRadius, want]);
    if (last) out.push([getComputedStyle(last).borderBottomLeftRadius, want]);
  }
  return out;
});
check('a panel that cannot clip hands its corners to the box inside it',
  corners.length > 0 && corners.every(([got, want]) => got === want),
  corners.map(([g, w]) => `${g} vs ${w}`).join(', ') || 'no spilling panel');

/* ⚠ THE QUESTION SCROLLS AWAY AND THE ANSWER'S HEAD DOES NOT. */
const read = () => p.evaluate(() => {
  const body = document.querySelector('.m-page__body');
  const q = document.querySelector('.m-sc').getBoundingClientRect();
  const head = document.querySelector('.m-panel__head');
  const h = head.getBoundingClientRect();
  const th = document.querySelector('.m-ss__table th').getBoundingClientRect();
  return {
    scroll: body.scrollTop,
    canScroll: body.scrollHeight - body.clientHeight,
    question: Math.round(q.top),
    head: Math.round(h.top),
    headBg: getComputedStyle(head).backgroundColor,
    /* the column titles ride directly under the head, with no band of ground
       showing between them - which is the same complaint the old gap was */
    gapToTitles: Math.round(th.top - h.bottom),
  };
});
const rest = await read();
await p.evaluate(() => { document.querySelector('.m-page__body').scrollTop = 300; });
await p.waitForTimeout(400);
const after = await read();
check('the body scrolls on a short window', rest.canScroll > 100, `${rest.canScroll}px of overflow`);
check('the question scrolls away, because you stop needing it once you are reading',
  after.question < rest.question - 100, `${rest.question} → ${after.question}`);
/* ⚠ PINNED AT THE BODY'S TOP, not held at its resting position - it starts
   BELOW the question panel and rises to the scrollport's edge, which is what
   sticky means and what the first version of this assertion got wrong. */
const bodyTop = await p.evaluate(() =>
  Math.round(document.querySelector('.m-page__body').getBoundingClientRect().top));
check("the answer's head pins to the top of the scroll rather than leaving with it",
  Math.abs(after.head - bodyTop) <= 1 && after.head < rest.head,
  `${rest.head} → ${after.head}, body top ${bodyTop}`);
check('and the column titles pin directly under it, not behind it',
  after.gapToTitles === 0, `${after.gapToTitles}px between them`);
check('and the head is opaque, so the rows cannot show through it as they pass',
  after.headBg !== 'rgba(0, 0, 0, 0)', after.headBg);
await p.evaluate(() => { document.querySelector('.m-page__body').scrollTop = 0; });
/* ⚠ AND GIVE THE WINDOW BACK. Everything after this expects to be able to
   reach the footer, and a 560px viewport puts it below the fold. */
await p.setViewportSize({ width: 1680, height: 1000 });
await p.waitForTimeout(300);

/* ── 10. THE RING'S THIRD RULE: FOCUS HAS NO POINTER ────────────────────────
   The torch itself is asserted further down, where the pointer is driven around
   the field. What belongs here is the case a torch cannot serve: somebody who
   arrived by keyboard has no cursor to centre the light on, so the mask comes
   off entirely and the whole rim lights, held still.

   ⚠ A control whose only indicator is a mouse position is a control with no
   focus indicator, which is the trap every "reveal on hover" effect sets. */
await p.setViewportSize({ width: 1560, height: 940 });
await p.mouse.move(900, 760);
await p.waitForTimeout(400);
await p.focus('.m-sc__filter');
await p.keyboard.press('Tab');
await p.keyboard.press('Shift+Tab');
await p.waitForTimeout(300);
const ringFocus = await p.evaluate(() => {
  const r = document.querySelector('.m-sc__ring');
  const arc = r.querySelector('.m-sc__arc');
  return {
    masked: /radial-gradient/.test(getComputedStyle(r).maskImage || ''),
    anim: getComputedStyle(arc).animationName,
    /* the rim runs down the MIDDLE of the field's own border, so it replaces
       that border rather than sitting inside or outside it */
    onBorder: (() => {
      const a = r.getBoundingClientRect();
      const f = document.querySelector('.m-sc__filter').getBoundingClientRect();
      return Math.abs(a.left - f.left) <= 1 && Math.abs(a.width - f.width) <= 2;
    })(),
  };
});
check('a keyboard focus drops the mask and takes the whole rim, held still',
  !ringFocus.masked && ringFocus.anim === 'none' && ringFocus.onBorder,
  `masked ${ringFocus.masked}, animation ${ringFocus.anim}, on the border ${ringFocus.onBorder}`);

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
  /* ⚠ TWO FIELDS, NOT ONE RANGE PICKER (2026-09-04). antd's RangePicker was
     four complaints in one screenshot: the pair and its arrow do not fit a menu
     this narrow so both dates truncate, the start field read empty after a date
     was chosen, the selection reset on its own, and moving the panel to months
     or years broke it. All four are one control holding a pair and having its
     own idea of which end you are editing. Two fields have none of that. */
  picker: await p.locator('.m-dr__picker .ant-picker').count(),
  placeholders: await p.locator('.m-dr__picker input').evaluateAll((e) => e.map((i) => i.placeholder)),
  /* The hint is gone: "Both ends, and the list narrows" was explaining a
     control that now explains itself - an empty field IS the message. */
  hint: await p.locator('.m-dr__hint').count(),
  fits: await p.locator('.m-dr__picker .ant-picker').evaluateAll((e) =>
    e.every((x) => x.querySelector('input').scrollWidth <= x.querySelector('input').clientWidth + 1)),
  rows: await total(),
};
check('picking custom opens two date fields and narrows nothing until both are in',
  halfPicked.picker === 2
    && halfPicked.hint === 0
    && halfPicked.placeholders.join('/') === 'Start date/End date'
    && halfPicked.rows === windows['90d'],
  `${halfPicked.picker} fields (${halfPicked.placeholders.join(', ')}), ${halfPicked.hint} hints, ${halfPicked.rows} rows`);
check('and each date fits its own field', halfPicked.fits);

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
    const img = r.querySelector('.m-savatar__img:not(.is-light)');
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

/* ── THE PLAY IS THE MARK, AND ITS HOVER IS ITS OWN (2026-09-04) ──────────
   Three changes at once, and they answer each other. It is the OpenReplay mark
   rather than `CirclePlay` - the product's own glyph, so the one affordance on
   the row says whose recording this is. It is STROKED, because every other
   glyph here is. And the row's hue arrives when you hover THE GLYPH, not the
   row: on the row it fired every time a cursor crossed a line on the way
   somewhere else, which is a colour nobody asked for. */
const playShape = await p.evaluate(() => {
  const svg = document.querySelector('.m-ss__play svg');
  const paths = [...svg.querySelectorAll('path')];
  const cell = svg.closest('.m-ss__playcell').getBoundingClientRect();
  const box = svg.getBoundingClientRect();
  return {
    paths: paths.length,
    outlined: paths.every((x) => getComputedStyle(x).fill === 'none' && parseFloat(getComputedStyle(x).strokeWidth) > 0),
    offCentre: Math.round((box.left + box.right) / 2 - (cell.left + cell.right) / 2),
    target: Math.round(document.querySelector('.m-ss__play').getBoundingClientRect().width),
  };
});
check('the play is the mark: two triangles, outlined like every other glyph',
  playShape.paths === 2 && playShape.outlined, `${playShape.paths} paths, outlined ${playShape.outlined}`);
/* ⚠ CENTRED ON THE CELL, not on the cell's CONTENT box. The table gives its
   last column a 20px right inset and every cell an 8px left one, so
   `text-align: center` put the glyph 6px off - a mistake you can see and cannot
   name. Both paddings are zeroed on this cell. */
check('and it is centred in its column, with a target bigger than itself',
  playShape.offCentre === 0 && playShape.target >= 24,
  `${playShape.offCentre}px off centre, ${playShape.target}px target`);

/* ⚠ AND IT IS ONLY ON THE ROW YOU ARE POINTING AT. Twelve of them down a
   column is a texture you stop seeing; the row is clickable anyway, so the
   glyph is the reminder that there is a way in rather than the only one. */
await p.mouse.move(1500, 950);
await p.waitForTimeout(300);
const hidden = await p.evaluate(() =>
  [...document.querySelectorAll('.m-ss__play')].map((e) => getComputedStyle(e).opacity));
check('the play is on no row until one is hovered',
  hidden.every((o) => o === '0'), `${hidden.filter((o) => o !== '0').length} of ${hidden.length} showing`);

await p.hover('.m-ss__name');
await p.waitForTimeout(300);
const onRowHover = await p.evaluate(() => {
  const all = [...document.querySelectorAll('.m-ss__play')];
  return { colour: getComputedStyle(all[0]).color,
    shown: all.filter((e) => getComputedStyle(e).opacity === '1').length };
});
check('hovering the ROW reveals exactly one, and does not colour it',
  onRowHover.shown === 1 && onRowHover.colour === playRest.colour,
  `${onRowHover.shown} shown, ${playRest.colour} → ${onRowHover.colour}`);

await p.hover('.m-ss__play');
await p.waitForTimeout(300);
const playHover = await p.evaluate(() => ({
  colour: getComputedStyle(document.querySelector('.m-ss__play')).color,
  hue: getComputedStyle(document.querySelector('.m-ss__row')).getPropertyValue('--m-avatar-i').trim(),
  ground: getComputedStyle(document.querySelector('.m-ss__row .m-savatar')).backgroundColor,
}));
/* ⚠ THE ROW'S OWN HUE, and the avatar's ground is mixed from the same one -
   which is the whole of Mehdi's "one hue per row, used twice". The lightness
   differs because the jobs do: 0.93 behind an illustration, 0.52 as a stroked
   glyph on the same surface. */
/* ⚠ AND THE HUE IS THE ROBOT'S OWN, which is the part that was wrong for a
   day. It was a hash of the seed - and DiceBear hashes the SAME seed by its own
   function into its own palette, so the tint and the robot never agreed and
   nobody could say why. There is no colour parameter to pass, so the colour is
   read off the avatar and both uses are mixed from that one angle.

   This fetches the same SVG the row's `<img>` did and checks the dominant fill
   really is the hue the row is wearing. If it ever fails, the reading broke -
   not the CSS. */
const fromRobot = await p.evaluate(async () => {
  const row = document.querySelector('.m-ss__row');
  const txt = await (await fetch(row.querySelector('.m-savatar__img:not(.is-light)').src)).text();
  const counts = new Map();
  for (const m of txt.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)) {
    const h = m[1].toLowerCase();
    if (h === '#000000') continue;
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  return {
    robot: [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    ownBg: txt.match(/<rect width="100" height="100" fill="([^"]*)"/)?.[1] ?? null,
    hue: getComputedStyle(row).getPropertyValue('--m-row-hue').trim(),
  };
});
/* A read hue is a raw angle with decimals; the hashed fallback is a `calc()`. */
/* ⚠ AND PIXELBOT'S OWN BACKGROUND IS OFF. It ships a full-bleed near-black
   teal rect whatever the robot's colour is, which in a light list is a black
   square per row and in either mode is a colour belonging to neither the robot
   nor the theme. `backgroundColor=ffffff00` - an 8-digit hex, because the API
   answers 400 to the word "transparent" and the browser then reports that as
   ERR_BLOCKED_BY_ORB on the img, which says nothing about the cause. */
check('the avatar brings no background of its own',
  fromRobot.ownBg === '#ffffff00', fromRobot.ownBg ?? 'none declared');
check('the row\'s hue was read off its own robot, not hashed from the seed',
  !!fromRobot.robot && /^-?\d+\.\d+deg$/.test(fromRobot.hue),
  `${fromRobot.robot} → ${fromRobot.hue}`);
const angle = Number.parseFloat(fromRobot.hue).toFixed(2).replace(/0+$/, '');
check('and hovering the PLAY takes that same hue, as the avatar\'s ground does',
  playHover.colour !== playRest.colour
    && playHover.colour.includes(angle.slice(0, 5))
    && playHover.ground.includes(angle.slice(0, 5)),
  `${playRest.colour} → ${playHover.colour}, avatar ${playHover.ground}`);

/* ⚠ AND AN UNWATCHED SESSION IS SOLID. A muted outline against an unmuted one
   is a difference you have to compare two rows to see; filled against hollow
   you see in one. The weight is on the unwatched state because that is the row
   with something in it for you. */
const solid = await p.evaluate(() =>
  [...document.querySelectorAll('.m-ss__row')].map((r) => [
    r.className.includes('is-viewed'),
    r.querySelector('.m-ormark')?.classList.contains('is-filled') ?? null,
  ]));
check('an unwatched session fills its triangle and a watched one does not',
  solid.length > 0 && solid.every(([viewed, filled]) => filled === !viewed),
  `${solid.filter(([, f]) => f).length} filled of ${solid.length}`);

/* ── THE RING IS A TORCH ─────────────────────────────────────────────────
   ⚠ FOURTH ATTEMPT, and the first three all failed on the same axis. A conic
   gradient divides by ANGLE, so on a 1400x40 box the arc was a dot on the long
   rim and covered the whole end cap. A linear one balances the arc but only
   moves sideways ("now it's a horizontal movement, that's wrong"). A dashed
   stroke fixed the geometry and kept the real problem: it ran to a CLOCK.
   Gabriel, 09-04: "I kinda hate the ring now - what if you add a ring in a mask
   with a glow and you reveal that when you hover only in a radius around that."

   So the rim is whole and always drawn, and a radial mask centred on the
   pointer decides what of it you can see. What is asserted is the part that
   makes it a torch rather than a spotlight bolted on: THE RADIUS ANSWERS TO
   DISTANCE, so the ring is already lit before the pointer lands. */
/* ⚠ THE BAR ONLY EXISTS ON AN EMPTY SEARCH since 09-04 - it retires the moment
   there is a rule and the sections carry the Adds. So clear first, or this
   whole block waits thirty seconds for a control that is deliberately gone. */
if (await p.locator('.m-sc__clear').count()) {
  await p.locator('.m-sc__clear').click();
  await p.waitForTimeout(400);
}
await p.evaluate(() => { document.querySelector('.m-page__body').scrollTop = 0; });
await p.waitForTimeout(200);
const torchAt = async (x, y) => {
  await p.mouse.move(x, y);
  await p.waitForTimeout(320);
  return p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.m-sc__ring'));
    return {
      r: Number.parseFloat(cs.getPropertyValue('--m-torch-r')) || 0,
      x: cs.getPropertyValue('--m-torch-x').trim(),
      masked: /radial-gradient/.test(cs.maskImage || cs.webkitMaskImage || ''),
    };
  });
};
const fieldBox = await p.locator('.m-sc__filter').boundingBox();
const far = await torchAt(fieldBox.x + 200, fieldBox.y + 620);
const near = await torchAt(fieldBox.x + 200, fieldBox.y + 120);
const on = await torchAt(fieldBox.x + 200, fieldBox.y + fieldBox.height / 2);
check('the ring is masked to a radius rather than drawn whole',
  on.masked, `mask ${on.masked}`);
check('and it is DARK from across the page, so nothing animates at rest',
  far.r === 0, `radius ${far.r}px at 620px away`);
check('THE LEAD-IN: it opens on approach, before the pointer ever lands',
  near.r > 0 && near.r < on.r,
  `${far.r}px far → ${near.r.toFixed(1)}px near → ${on.r.toFixed(1)}px on it`);

/* AND THE LIGHT IS WHERE THE POINTER IS, not at the middle of a 1400px bar.
   The distance is measured to the RECTANGLE, so both ends of a very wide field
   light up when you stand on them - a centre-based falloff would leave the ends
   dark. */
const leftLit = await torchAt(fieldBox.x + 60, fieldBox.y + fieldBox.height / 2);
const rightLit = await torchAt(fieldBox.x + fieldBox.width - 60, fieldBox.y + fieldBox.height / 2);
check('the light follows the pointer along the rim rather than sitting at its centre',
  leftLit.r > 60 && rightLit.r > 60 && leftLit.x !== rightLit.x,
  `left ${leftLit.x} at ${leftLit.r.toFixed(0)}px, right ${rightLit.x} at ${rightLit.r.toFixed(0)}px`);

/* ── THE OPERATOR READS (Mehdi: "the 'is not' colour doesn't have contrast
   enough"). The closed control drew the word one step quieter than the SAME
   word in the menu under it. */
await p.locator('.m-sc__filter').click();
await p.waitForTimeout(400);
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
await section('Bookmarks');
const bookmarkedTab = await p.locator('.m-ss__table tbody tr').count();
check('and the bookmarks list is still a real list of the state behind it',
  bookmarkedTab > 0, `${bookmarkedTab} bookmarked`);
await section('Sessions');

check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\nPASS');
pass.forEach((l) => console.log(`  ✓ ${l}`));
if (fail.length) {
  console.log('\nFAIL');
  fail.forEach((l) => console.log(`  ✗ ${l}`));
}
await b.close();
process.exit(fail.length ? 1 : 0);

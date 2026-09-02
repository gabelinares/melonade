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
  columns: [...document.querySelectorAll('.m-ss__table th')].map((e) => e.textContent.trim()).filter(Boolean),
  rows: document.querySelectorAll('.m-ss__table tbody tr').length,
  foot: document.querySelector('.m-ss__range-label')?.textContent,
  /* the search is a well, not a card: it steps DOWN from the plane, because the
     plane is already the only surface (the 08-28 shell) */
  searchBg: getComputedStyle(document.querySelector('.m-sc')).backgroundColor,
  planeBg: getComputedStyle(document.querySelector('.m-page')).backgroundColor,
}));
check('the page renders with the shell every other page uses',
  shell.title === 'Sessions' && shell.tabs.length === 2, `${shell.title}, tabs ${shell.tabs.join('/')}`);
check('and the two sections are text tabs, not the pill strip',
  !shell.tabsArePills && shell.tabs.join('/') === 'All sessions/Bookmarked', shell.tabs.join('/'));
/* Mehdi, 2026-09-02: keep only the two tabs. The issue-type strip went and its
   toolbar row went with it - the date range and the display menu moved onto the
   search's own bar, which is the row that STICKS. */
check('the issue-type strip is gone, and so is the row it was on', !shell.hasToolbar);
check('the list is a table and it pages',
  shell.rows === 12 && /1–12 of 134/.test(shell.foot ?? ''), `${shell.rows} rows, ${shell.foot}`);
check('errorsCount is finally on screen, which the payload has always carried',
  shell.columns.includes('Errors'), shell.columns.join(' | '));
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
    && /Describe the sessions you want/.test((await p.locator('.m-sc__lead').textContent()) ?? ''),
  (await p.locator('.m-sc__field-text').textContent()) ?? 'no field');
/* THE PLACEHOLDER DOES THREE JOBS AT ONCE, which is why the badge and the row
   of example pills could go: a fixed lead that says what the field is for, and
   one rotating example that teaches the half nobody expects. */
check('and its placeholder carries a live example',
  /, like “.+”/.test((await p.locator('.m-sc__eg').textContent()) ?? ''),
  (await p.locator('.m-sc__eg').textContent()) ?? 'no example');
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

/* ── 3. THE SENTENCE ─────────────────────────────────────────────────────── */
await p.fill('.m-pick__search input', 'paid users on mobile who hit an error');
await p.waitForTimeout(350);
const nl = await p.evaluate(() => {
  const el = document.querySelector('.m-pick__nl');
  if (!el) return null;
  return {
    head: el.querySelector('.m-pick__nl-head')?.textContent?.trim(),
    steps: [...el.querySelectorAll('.m-pick__steps li')].map((e) => e.textContent.trim()),
    ignored: el.querySelector('.m-pick__ignored')?.textContent?.trim(),
    cta: el.querySelector('button')?.textContent?.trim(),
    /* above the matches, never instead of them */
    beforeRows: (() => {
      const rows = document.querySelector('.m-pick__row');
      return rows ? el.compareDocumentPosition(rows) === 4 : true;
    })(),
  };
});
check('two or more words are offered as a search', !!nl, nl?.head);
check('and the offer shows the steps it understood',
  !!nl && nl.steps.length >= 3, nl?.steps.join(' · '));
check('and names what it could not use rather than dropping it',
  !!nl && /Ignored/.test(nl.ignored ?? ''), nl?.ignored);
check('and it sits above the matches rather than replacing them',
  !!nl && nl.beforeRows);

await p.locator('.m-pick__nl button').click();
await p.waitForTimeout(400);
const translated = await p.evaluate(() => ({
  rows: [...document.querySelectorAll('.m-srow')].map((r) => r.querySelector('.m-srow__name')?.textContent?.trim()),
  editable: document.querySelectorAll('.m-srow .ant-select').length,
  count: document.querySelector('.m-ss__range-label')?.textContent,
}));
check('what comes back is editable rows, not a result set',
  translated.rows.length >= 3 && translated.editable > 0,
  `${translated.rows.join(', ')} — ${translated.editable} controls`);
check('and the list narrowed to them', !/of 134/.test(translated.count ?? '') || translated.count !== '1–12 of 134',
  translated.count);

/* ── 4. THE ONE LIST HOLDS TWO GRAMMARS ──────────────────────────────────── */
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(300);

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
  return p.evaluate(() => document.querySelector('.m-ss__range-label')?.textContent?.trim() ?? '');
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

/* ── 6. the metadata chip writes to the search ───────────────────────────── */
await p.locator('.m-sc__clear').click();
await p.waitForTimeout(400);
/* turn the column on first: it is off by default */
await p.locator('.m-sc__bar [aria-label="Display"]').first().click();
await p.waitForTimeout(300);
const hasMetaPill = await p.locator('.m-dm__pill', { hasText: 'Metadata' }).count();
if (hasMetaPill) {
  await p.locator('.m-dm__pill', { hasText: 'Metadata' }).click();
  await p.waitForTimeout(300);
  await p.keyboard.press('Escape');
  await p.mouse.click(900, 40);
  await p.waitForTimeout(300);
  await p.locator('.m-ss__meta-chip').first().click();
  await p.waitForTimeout(400);
  const wrote = await p.evaluate(() => ({
    rows: document.querySelectorAll('.m-srow').length,
    subject: document.querySelector('.m-srow__name')?.textContent?.trim(),
    value: document.querySelector('.m-srow .m-vp__trigger')?.textContent?.trim(),
  }));
  check('clicking a metadata value on a row searches for it',
    wrote.rows === 1 && !!wrote.subject, `${wrote.subject} = ${wrote.value}`);
} else {
  check('clicking a metadata value on a row searches for it', false, 'the Metadata column pill was not found');
}

/* ── 7. bookmarks is a tab, and everything keeps working inside it ───────── */
await p.locator('.m-page__tabs .ant-tabs-tab', { hasText: 'Bookmarked' }).click();
await p.waitForTimeout(450);
const vault = await p.evaluate(() => ({
  rows: document.querySelectorAll('.m-ss__table tbody tr').length,
  marks: document.querySelectorAll('.m-ss__mark').length,
  foot: document.querySelector('.m-ss__range-label')?.textContent?.trim(),
  empty: document.querySelector('.m-empty__title')?.textContent?.trim(),
  searchStillThere: !!document.querySelector('.m-sc'),
  tabsStillThere: document.querySelectorAll('.m-page__tabs .ant-tabs-tab').length === 2,
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

/* AND EVERY EXAMPLE IT SHOWS REALLY TRANSLATES. A placeholder promising
   something the field cannot do is worse than one promising nothing. */
const EXAMPLES = [
  'paid users who hit an error',
  'mobile sessions with rage clicks',
  'trials that reached checkout',
  'anyone who bounced off the cart',
  'long sessions on Safari',
];
for (const ex of EXAMPLES) {
  await p.locator('.m-sc__field').click();
  await p.waitForTimeout(250);
  await p.fill('.m-pick__search input', ex);
  await p.waitForTimeout(300);
  const offered = await p.evaluate(() => ({
    has: !!document.querySelector('.m-pick__nl button'),
    steps: document.querySelectorAll('.m-pick__steps li').length,
  }));
  check(`the placeholder's “${ex}” really translates`, offered.has && offered.steps > 0,
    `${offered.steps} steps`);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
}

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
/* The gap under it has to belong to the sticky box or rows slide through it. */
const gapOwner = await p.evaluate(() => {
  const w = document.querySelector('.m-ss__sticky');
  const cs = getComputedStyle(w);
  return { pad: cs.paddingBottom, margin: getComputedStyle(document.querySelector('.m-sc')).marginBottom, bg: cs.backgroundColor };
});
check('and the gap under it is padding on the sticky box, not a margin on the card',
  gapOwner.pad !== '0px' && gapOwner.margin === '0px' && gapOwner.bg !== 'rgba(0, 0, 0, 0)',
  `pad ${gapOwner.pad}, card margin ${gapOwner.margin}, opaque ${gapOwner.bg}`);
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
    const before = getComputedStyle(r, '::before');
    return {
      opacity: getComputedStyle(r).opacity,
      play: before.animationPlayState,
      name: before.animationName,
      /* the rim sits on the field's own border box, so it replaces the border
         rather than sitting inside or outside it */
      onBorder: (() => {
        const a = r.getBoundingClientRect();
        const f = document.querySelector('.m-sc__field').getBoundingClientRect();
        return Math.round(a.left - f.left) === 0 && Math.round(a.width - f.width) === 0;
      })(),
    };
  });
const ringRest = await ringState();
check('the ring is off at rest, and paused rather than merely invisible',
  ringRest.opacity === '0' && ringRest.play === 'paused',
  `opacity ${ringRest.opacity}, ${ringRest.play}`);
await p.hover('.m-sc__field');
await p.waitForTimeout(400);
const ringHover = await ringState();
check('it sweeps on hover, on the field\'s own border box',
  ringHover.opacity === '1' && ringHover.play === 'running' && ringHover.onBorder,
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
  const total = Number((document.querySelector('.m-ss__range-label')?.textContent ?? '').replace(/.*of /, ''))
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

check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\nPASS');
pass.forEach((l) => console.log(`  ✓ ${l}`));
if (fail.length) {
  console.log('\nFAIL');
  fail.forEach((l) => console.log(`  ✗ ${l}`));
}
await b.close();
process.exit(fail.length ? 1 : 0);

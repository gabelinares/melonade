/* The shell, end to end in a real browser.
 *
 * 2026-08-28 replaced the icon rail with a labelled sidebar and put the whole
 * app on ONE GROUND: the menu has no surface of its own and the content plane is
 * a card floating on the menu's colour with an equal margin on four sides. That
 * wrap is four numbers and two computed styles, so it is asserted here rather
 * than looked at - it is exactly the kind of thing that survives a screenshot
 * and dies in a stylesheet.
 *
 * Also here: the session thumbnails have height, the journey nodes sit on their
 * labels, and every prototype-panel switch moves BOTH layers - the CSS variables
 * and antd's own component colours. The last one is the whole reason the
 * variants are generated twice; a check that only read var(--m-*) would pass
 * while every button on the page stayed teal.
 */
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4310/';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1680, height: 1000 }, colorScheme: 'light' });
const p = await c.newPage();

const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);

const pass = [];
const fail = [];
const check = (name, ok, detail) => (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ''}`);

// ── 1. the menu, and the wrap ─────────────────────────────────────────────
const nav = await p.evaluate(() => {
  const nav = document.querySelector('.m-nav');
  const shell = document.querySelector('.m-shell');
  const page = document.querySelector('.m-page');
  if (!nav || !shell || !page) return null;
  const ncs = getComputedStyle(nav);
  const r = nav.getBoundingClientRect();
  const pg = page.getBoundingClientRect();
  return {
    width: Math.round(r.width),
    labels: [...nav.querySelectorAll('.m-nav-item__label')].map((l) => l.textContent.trim()),
    sections: nav.querySelectorAll('.m-nav__sections .m-nav-item').length,
    tools: nav.querySelectorAll('.m-nav__tools button').length,
    credits: nav.querySelector('.m-credits')?.textContent?.trim() ?? null,
    /* THE WRAP. The ground is the menu's colour, the menu paints nothing of its
       own, and the plane's margin is the same on all four sides - the fourth
       being the menu's own padding, which is what makes the gap look like a
       margin rather than a gutter. */
    shellBg: getComputedStyle(shell).backgroundColor,
    navBg: ncs.backgroundColor,
    navBorderRight: ncs.borderRightWidth,
    gapTop: Math.round(pg.top),
    gapRight: Math.round(window.innerWidth - pg.right),
    gapBottom: Math.round(window.innerHeight - pg.bottom),
    gapLeft: Math.round(pg.left - r.right + parseFloat(ncs.paddingRight)),
    planeRadius: getComputedStyle(page).borderTopLeftRadius,
    scrollsInside: page.scrollHeight <= Math.ceil(pg.height) + 1,
  };
});
check('the menu renders with labels', !!nav && nav.labels.length >= 5, nav?.labels.join(' | '));
check('an agent expands into its sections', !!nav && nav.sections === 3, `${nav?.sections} sections`);
check('the foot is a row of tools', !!nav && nav.tools >= 4, `${nav?.tools} tools`);
check('the credits are always on screen', !!nav && /Credits/.test(nav.credits ?? ''), nav?.credits);
check('the menu paints nothing of its own',
  !!nav && nav.navBg === 'rgba(0, 0, 0, 0)' && nav.navBorderRight === '0px',
  `${nav?.navBg}, border ${nav?.navBorderRight}`);
check('the ground is the menu colour and it wraps the plane on four equal sides',
  !!nav && nav.gapTop === nav.gapRight && nav.gapRight === nav.gapBottom && nav.gapBottom === nav.gapLeft,
  `${nav?.gapTop}/${nav?.gapRight}/${nav?.gapBottom}/${nav?.gapLeft}`);
check('the plane scrolls inside itself, so its bottom margin never leaves',
  !!nav && nav.scrollsInside);

// ── 1b. the segments control, now a toolbar icon ──────────────────────────
const seg = await p.evaluate(() => {
  const group = document.querySelector('.m-issues__controls');
  const btns = [...(group?.querySelectorAll('button') ?? [])].map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const icon = el.querySelector('.m-iconbtn__icon');
    const badge = el.querySelector('.m-iconbtn__count');
    return {
      label: (el.getAttribute('aria-label') || '').slice(0, 30),
      cls: el.classList.contains('m-iconbtn'),
      h: Math.round(r.height), w: Math.round(r.width),
      /* The GLYPH BOX is the thing that has to agree. Overall width does not:
         Graphite's IconButton renders a count inline, so a control reporting a
         number is legitimately wider than one that is not - the capture icon with
         two segments on it is the same shape Filters takes when filters are
         active. Comparing outer widths across different badge states was the
         check being wrong, not the toolbar. */
      iconW: icon ? Math.round(icon.getBoundingClientRect().width) : null,
      badgeW: badge ? Math.round(badge.getBoundingClientRect().width) : 0,
      radius: cs.borderRadius, midY: Math.round(r.top + r.height / 2),
    };
  });
  return { btns, oldPill: !!document.querySelector('.m-capture') };
});
const uniq = (k) => [...new Set(seg.btns.map((b) => b[k]))];
check('segments sits with filter and display', seg.btns.length === 3,
  seg.btns.map((b) => b.label.split(',')[0]).join(' | '));
check('the wide pill is gone', !seg.oldPill);
check('the three agree on height', uniq('h').length === 1, uniq('h').join('/') + 'px');
check('the three are the same component', seg.btns.every((b) => b.cls));
check('the three agree on glyph box', uniq('iconW').length === 1, uniq('iconW').join('/') + 'px');
/* OUTER WIDTH IS ALLOWED TO DIFFER, and only for one reason: a control carrying
   a count goes from square to padded, so it is wider by the badge plus its gap -
   the same shape Filters takes the moment a filter is active. What must agree is
   every badgeless control with every other, which is the real "did they drift"
   question. Two earlier versions of this check modelled the badge arithmetic
   instead and both were wrong about the toolbar rather than about the code. */
const bareW = [...new Set(seg.btns.filter((b) => !b.badgeW).map((b) => b.w))];
check('badgeless controls agree exactly', bareW.length === 1, bareW.join('/') + 'px');
check('only the counted control is wider', seg.btns.every((b) => (b.badgeW > 0) === (b.w > bareW[0])),
  seg.btns.map((b) => `${b.w}px${b.badgeW ? ' +badge' : ''}`).join(' | '));
check('the three agree on radius', uniq('radius').length === 1, uniq('radius').join('/'));
check('the three sit on one line', uniq('midY').length === 1, uniq('midY').join('/'));

/* The panel behind the glyph has to be the panel that was behind the pill: an
   icon that opens a different, smaller thing is a downgrade dressed as a tidy-up. */
await p.locator('.m-issues__controls button').first().click();
await p.waitForTimeout(400);
const panel = await p.evaluate(() => {
  const el = document.querySelector('.m-capture__panel');
  return el ? { rows: el.querySelectorAll('.m-checkrow, [class*="checkrow"]').length,
                hasSwitch: !!el.querySelector('.ant-switch') } : null;
});
check('the capture panel still opens whole', !!panel && panel.hasSwitch && panel.rows > 0,
  panel ? `${panel.rows} segment rows, mode switch present` : 'panel did not open');
await p.keyboard.press('Escape');
await p.waitForTimeout(250);

// ── 2. into an issue, then a session ──────────────────────────────────────
const listShell = await p.evaluate(() => {
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { left: Math.round(r.left), w: Math.round(r.width), radius: cs.borderRadius,
             padL: cs.paddingLeft, h: Math.round(r.height) }; };
  const t = document.querySelector('.m-page__title');
  const ts = t ? getComputedStyle(t) : null;
  return { card: box('.m-page'), head: box('.m-page__head'),
           titleFont: ts ? `${ts.fontSize}/${ts.fontWeight}` : null };
});

await p.locator('.m-issues__title').first().click();
/* Wait for the REAL card, not the skeleton: the strip renders skeletons first
   and a fixed timeout lands inside that window often enough to look like a
   missing element. */
await p.locator('.m-scard:not(.m-scard--skeleton) .m-scard__frame').first().waitFor({ timeout: 5000 });

/* ── the shell has to survive the trip ────────────────────────────────────
   Gabriel, 08-26: leaving the list for an issue "feels like a big break". It
   was three numbers - the card started 116px further left, ran 232px wider and
   changed radius - plus the 18px title leaving the header for the body. All four
   are asserted here so they cannot come back quietly. */
const cont = await p.evaluate(() => {
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { left: Math.round(r.left), w: Math.round(r.width), radius: cs.borderRadius,
             padL: cs.paddingLeft, h: Math.round(r.height) }; };
  return { card: box('.m-work'), head: box('.m-ihdr') };
});
check('detail card sits where the list card sat',
  cont.card && cont.card.left === listShell.card.left && cont.card.w === listShell.card.w,
  `${cont.card?.left}/${cont.card?.w} vs ${listShell.card.left}/${listShell.card.w}`);
check('detail card keeps the list radius', cont.card?.radius === listShell.card.radius,
  `${cont.card?.radius} vs ${listShell.card.radius}`);
/* The two headers are deliberately NOT the same object any more: the list has a
   page header - title, sentence, room - and the detail has a trail row. What has
   to match is the PLANE, which is checked above, and the trail row has to stay
   the compact row it was designed as rather than drifting into a page header. */
check('the detail keeps its trail row rather than a page header',
  cont.head && cont.head.h === 44 && listShell.head.h > 60,
  `detail ${cont.head?.h}px, list ${listShell.head.h}px`);
/* What the header ROW says at each depth, and what belongs to the issue page
   versus the replay page, is checked in tools/pages-check.mjs - it walks both
   pages and knows which furniture belongs to which. This file stays on the
   SHELL: the container measure, radius and header box, which are what actually
   made the two screens feel like different applications. */

const shot = await p.evaluate(() => {
  const f = document.querySelector('.m-scard__frame');
  const r = f?.getBoundingClientRect();
  const card = document.querySelector('.m-scard')?.getBoundingClientRect();
  const dur = document.querySelector('.m-scard__dur')?.getBoundingClientRect();
  const variation = document.querySelector('.m-scard__variation')?.getBoundingClientRect();
  return r && card && dur && variation
    ? { h: Math.round(r.height), w: Math.round(r.width),
        ratio: +(r.width / r.height).toFixed(2),
        // the visible symptom: the duration pill overlapping the title below it
        overlap: +(dur.bottom - variation.top).toFixed(1) }
    : null;
});
check('thumbnail has height', !!shot && shot.h > 40, shot ? `${shot.w}x${shot.h}` : 'frame missing');
check('thumbnail is 16:10', !!shot && Math.abs(shot.ratio - 1.6) < 0.02, shot ? `${shot.ratio}` : '');
check('duration pill clears the title', !!shot && shot.overlap < 0, shot ? `${shot.overlap}px` : '');

await p.locator('.m-scard').first().click();
await p.waitForTimeout(800);

const jrn = await p.evaluate(() => {
  const range = document.createRange();
  const offs = [...document.querySelectorAll('.m-jrn__step')].map((step) => {
    const n = step.querySelector('.m-jrn__node').getBoundingClientRect();
    range.selectNodeContents(step.querySelector('.m-jrn__label'));
    const line = [...range.getClientRects()].filter((r) => r.height > 2)[0];
    return +(n.top + n.height / 2 - (line.top + line.height / 2)).toFixed(1);
  });
  return { max: Math.max(...offs.map(Math.abs)), n: offs.length };
});
check('journey nodes on their labels', jrn.max <= 2, `worst ${jrn.max}px over ${jrn.n} steps`);

/* The 85rem cap went with the 08-28 shell - the plane IS the window minus the
   menu and the margin - so what matters is only that nothing overflows the plane
   and the player keeps its ratio inside whatever width it gets. */
const frame = await p.evaluate(() => {
  const work = document.querySelector('.m-work');
  /* THE STAGE IS THE LETTERBOX, NOT THE PICTURE. It fills the column and pads;
     the element that owns `aspect-ratio: 16/10` is the viewport inside it, which
     is what has to keep its shape when the plane gets narrower. Probing the stage
     read 1.3 and said the player was broken when it was doing its job. */
  const stage = document.querySelector('.m-player__viewport');
  const jr = document.querySelector('.m-jrn');
  if (!work || !stage) return null;
  const w = work.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { workW: Math.round(w.width), workRight: Math.round(w.right),
           stageRatio: +(s.width / s.height).toFixed(2),
           stageRight: Math.round(s.right), jrnW: jr ? Math.round(jr.getBoundingClientRect().width) : 0,
           scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth };
});
check('replay depth fits the plane',
  !!frame && frame.stageRight <= frame.workRight && !frame.scrollX,
  frame ? `card ${frame.workW}, stage ends ${frame.stageRight} of ${frame.workRight}, journey ${frame.jrnW}` : 'no frame');
check('the player frame keeps 16:10 in whatever width it gets', !!frame && Math.abs(frame.stageRatio - 1.6) < 0.05,
  frame ? `${frame.stageRatio}` : '');

// ── 3. the token switches, both layers ────────────────────────────────────
const read = () => p.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  /* The slider track in the panel itself: antd paints it from colorPrimary, and
     it is the one primary-derived surface guaranteed to be on screen while the
     panel is open. A primary BUTTON would have been the obvious probe and there
     is not one on the Issues page - which is the point of the design, so the
     check has to adapt rather than the product. */
  const track = document.querySelector('.ant-slider-track');
  const antdBg = track ? getComputedStyle(track).backgroundColor : null;
  /* READ THE FACE OFF ANTD, NOT OFF THE BODY. The first version of this check
     read document.body and passed while every table, tab and button on the page
     stayed on the old face: antd stamps its own font-family from its own theme
     token, so the CSS variable never reached them. `loaded` is the second half -
     a stack that resolves is not the same as a font file that arrived, and a
     missing file falls through to the next entry silently. */
  const antdEl = document.querySelector('.ant-btn, .ant-segmented-item, .ant-table-cell, .ant-input');
  const first = (el) => (el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '') : null);
  return {
    font: first(document.body),
    antdFont: first(antdEl),
    /* A pairing sets four roles, and three of them are invisible if only the
       body is read: the title, the tags and antd's own components each take
       their face from somewhere else. */
    titleFont: first(document.querySelector('.m-page__title')),
    titleTracking: document.querySelector('.m-page__title')
      ? getComputedStyle(document.querySelector('.m-page__title')).letterSpacing
      : null,
    titleSize: document.querySelector('.m-page__title')
      ? Math.round(parseFloat(getComputedStyle(document.querySelector('.m-page__title')).fontSize))
      : null,
    loaded: ['IBM Plex Sans', 'Inter', 'Geist', 'Source Sans 3', 'Source Serif 4']
      .filter((f) => document.fonts.check(`500 14px "${f}"`)),
    /* The tag is a whole treatment - face, case, tracking - so it is read as
       one string. Half a treatment is a chip that is merely shouting. */
    tag: (() => {
      const el = document.querySelector('.m-chip');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return `${first(el)} ${cs.textTransform} ${cs.letterSpacing}`;
    })(),
    tagSize: (() => {
      const el = document.querySelector('.m-chip');
      return el ? getComputedStyle(el).fontSize : null;
    })(),
    prose: cs.getPropertyValue('--m-font-prose').trim().split(',')[0].replace(/["']/g, ''),
    rowTitle: first(document.querySelector('.m-issues__title')),
    num: cs.getPropertyValue('--m-font-num').trim().split(',')[0].replace(/["']/g, ''),
    accent: cs.getPropertyValue('--m-content-accent').trim(),
    canvas: cs.getPropertyValue('--m-surface-canvas').trim(),
    space6: cs.getPropertyValue('--m-space-6').trim(),
    row: cs.getPropertyValue('--m-row-height').trim(),
    antdPrimary: antdBg,
  };
});

await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.getByRole('button', { name: /Prototype controls/i }).click();
await p.waitForTimeout(300);

const base = await read();
const pick = async (label) => {
  await p.locator('.m-proto__body').getByText(label, { exact: true }).click();
  await p.waitForTimeout(400);
  return read();
};

/* Every face warmed on mount, so a switch never paints the fallback. This is the
   check that would have caught the original bug: the faces were declared but
   nothing had fetched them, and Inter measured to the pixel the same as
   -apple-system. System asks for nothing, which is the point of it. */
check('every loaded face warmed on mount', base.loaded.length === 5, base.loaded.join(', ') || 'none');

/* ── the five type systems ────────────────────────────────────────────────
   Each is a SYSTEM rather than a font, so each check reads the roles that
   system claims to move. A check that only read the body would pass on all five
   while the tags stayed sentence case and the write-up stayed a sans. */
/* The rows carry a SPECIMEN now - the name plus three marks set in that
   system's own faces - so a row's text is "SwissAgTag12.4k" and the name has to
   be matched on its own element. */
const pickFont = async (label) => {
  await p.locator('.m-proto__select').click();
  await p.waitForTimeout(250);
  await p.locator('.ant-select-item-option .m-proto__spec-name', { hasText: new RegExp(`^${label}$`) }).click();
  await p.waitForTimeout(500);
  return read();
};

/* Each row shows what it would do rather than only naming it: the name in that
   system's sans, the title face, the tag AS THAT SYSTEM SETS IT, and a figure.
   Read off the Console row, which is the one where all four differ. */
await p.locator('.m-proto__select').click();
await p.waitForTimeout(300);
const specimens = await p.evaluate(() =>
  [...document.querySelectorAll('.ant-select-item-option .m-proto__spec')].map((r) => {
    const f = (sel) => {
      const el = r.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return `${cs.fontFamily.split(',')[0].replace(/["']/g, '')}${cs.textTransform !== 'none' ? ' ' + cs.textTransform : ''}`;
    };
    return { name: f('.m-proto__spec-name'), title: f('.m-proto__spec-title'), tag: f('.m-proto__spec-tag'), num: f('.m-proto__spec-num') };
  }),
);
await p.keyboard.press('Escape');
await p.waitForTimeout(250);
check('the dropdown shows each system rather than naming it', specimens.length === 5, `${specimens.length} rows`);
const consoleRow = specimens[2];
check('a specimen row is set in its own faces',
  consoleRow && /Geist$/.test(consoleRow.name ?? '') && /Geist Mono uppercase/.test(consoleRow.tag ?? '') &&
    /Geist Mono/.test(consoleRow.num ?? ''),
  consoleRow ? `${consoleRow.name} / ${consoleRow.title} / ${consoleRow.tag} / ${consoleRow.num}` : 'no row');
const editorialRow = specimens[3];
check('and the serif one shows its serif', /Source Serif/.test(editorialRow?.title ?? ''), editorialRow?.title);

check('the shipped pairing leaves tags alone', /none/.test(base.tag ?? ''), base.tag);

const swiss = await pickFont('Swiss');
check('Swiss: one grotesque, through the page AND antd',
  /Inter/.test(swiss.font ?? '') && /Inter/.test(swiss.antdFont ?? '') && /Inter/.test(swiss.titleFont ?? ''),
  `${swiss.font} / ${swiss.antdFont} / ${swiss.titleFont}`);
check('Swiss: metadata becomes a small uppercase label',
  /uppercase/.test(swiss.tag ?? '') && parseFloat((swiss.tag ?? '').split(' ').pop()) > 0.4, swiss.tag);
/* Uppercase reads a size bigger than sentence case at the same number - cap
   height where an x-height used to be - so a system that shouts has to come
   down a size or it looks unbalanced, which is exactly the note it got. */
check('Swiss: and comes DOWN a size for it',
  parseFloat(swiss.tagSize) < parseFloat(base.tagSize), `${base.tagSize} -> ${swiss.tagSize}`);
check('Swiss: headings pull tighter than the shipped face',
  parseFloat(swiss.titleTracking) < parseFloat(base.titleTracking),
  `${base.titleTracking} -> ${swiss.titleTracking}`);

const console_ = await pickFont('Console');
check('Console: the machine\'s output is set in mono',
  /Geist Mono/.test(console_.tag ?? '') && /uppercase/.test(console_.tag ?? ''), console_.tag);
check('Console: the interface is not', /^Geist /.test(`${console_.font} `), console_.font);
/* The one that changes the texture of a whole table without touching a word. */
check('Console: every figure in the interface is mono too',
  /Geist Mono/.test(console_.num ?? ''), `${base.num} -> ${console_.num}`);

const editorial = await pickFont('Editorial');
/* The serif marks the two places you READ - the page's title and the write-up -
   and stops there. A serif down a column of row names is decoration again, which
   is the note that came back the first time. */
check('Editorial: the serif is on the page title and the writing',
  /Source Serif/.test(editorial.titleFont ?? '') && /Source Serif/.test(editorial.prose ?? ''),
  `title ${editorial.titleFont}, prose ${editorial.prose}`);
check('Editorial: and NOT on the rows', /Source Sans/.test(editorial.rowTitle ?? ''), editorial.rowTitle);
check('Editorial: tags stay sentence case beside a serif', /none/.test(editorial.tag ?? ''), editorial.tag);

const system = await pickFont('System');
check('System: the OS\'s own face, nothing loaded',
  /-apple-system|BlinkMacSystemFont|Segoe/.test(system.font ?? ''), system.font);

await pickFont('Graphite');

const warm = await pick('Warm');
check('grey switches (CSS)', warm.canvas !== base.canvas, `${base.canvas} -> ${warm.canvas}`);

const indigo = await pick('Indigo');
check('accent switches (CSS)', indigo.accent !== base.accent, `${base.accent} -> ${indigo.accent}`);
check('accent reaches antd', !!indigo.antdPrimary && indigo.antdPrimary !== base.antdPrimary,
  `${base.antdPrimary} -> ${indigo.antdPrimary}`);

const spaced = await pick('Spaced');
check('density switches', spaced.space6 !== base.space6 && spaced.row !== base.row,
  `space-6 ${base.space6} -> ${spaced.space6}, row ${base.row} -> ${spaced.row}`);

await p.locator('.m-proto__reset').click();
await p.waitForTimeout(400);
const reset = await read();
check('reset returns the shipped tokens',
  reset.accent === base.accent && reset.canvas === base.canvas && reset.font === base.font &&
    reset.titleFont === base.titleFont && reset.tag === base.tag
    && reset.antdFont === base.antdFont && reset.space6 === base.space6);

check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\nPASS');
for (const l of pass) console.log('  ✓ ' + l);
if (fail.length) {
  console.log('\nFAIL');
  for (const l of fail) console.log('  ✗ ' + l);
}
await b.close();
process.exit(fail.length ? 1 : 0);

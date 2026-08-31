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

// ── 1a. THE NARROW MENU, 2026-08-31 ───────────────────────────────────────
/* The claim is that this is not an icon rail: it keeps the COUNT column, which
   is the menu's whole argument, and its width is the arithmetic of what is
   left. That is four measurements and one hover, so it is asserted rather than
   looked at. */
const geom = () =>
  p.evaluate(() => {
    const nav = document.querySelector('.m-nav');
    const page = document.querySelector('.m-page');
    const glyph = (sel) => {
      const el = document.querySelector(sel);
      const r = el?.getBoundingClientRect();
      return r ? Math.round((r.left + r.right) / 2) : null;
    };
    const rows = [...nav.querySelectorAll('.m-nav__scroll .m-nav-item')];
    const shown = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && getComputedStyle(el).opacity !== '0' ? el.textContent.trim() : '';
    };
    return {
      width: Math.round(nav.getBoundingClientRect().width),
      plane: Math.round(page.getBoundingClientRect().width),
      collapsed: nav.classList.contains('is-collapsed'),
      labels: rows.map((r) => shown(r.querySelector('.m-nav-item__label'))).filter(Boolean).length,
      counts: rows.map((r) => shown(r.querySelector('.m-nav-item__count'))).filter(Boolean),
      /* every glyph in the column, measured by its centre: the switcher's mark,
         an agent, the add row and a foot tool have to agree on one x. */
      centres: [
        glyph('.m-nav__project svg'),
        glyph('.m-nav__scroll .m-nav-item__icon'),
        glyph('.m-nav__foot .m-credits .m-bar'),
        glyph('.m-nav__tools button'),
      ],
      /* the rail's own centre line, to compare against the glyphs' */
      navMid: (() => {
        const r = nav.getBoundingClientRect();
        return Math.round((r.left + r.right) / 2);
      })(),
      /* the figure goes and the dot - which lives inside the count, hard
         against the number - is what is left of it */
      numShown: getComputedStyle(nav.querySelector('.m-nav__scroll .m-nav-item__num')).display,
      dots: nav.querySelectorAll('.m-nav__scroll .m-dot').length,
      dotsShown: [...nav.querySelectorAll('.m-nav__scroll .m-dot')]
        .filter((d) => getComputedStyle(d).display !== 'none').length,
      /* ⚠ nothing may hang past the scroller, which clips both axes */
      spill: (() => {
        const box = nav.querySelector('.m-nav__scroll').getBoundingClientRect();
        return Math.max(0, ...[...nav.querySelectorAll('.m-nav__scroll .m-dot')]
          .map((d) => Math.round(d.getBoundingClientRect().right - box.right)));
      })(),
      toolsBox: (() => {
        const el = document.querySelector('.m-nav__tools');
        const r = el.getBoundingClientRect();
        return {
          tracks: getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          h: Math.round(r.height),
        };
      })(),
      creditsBox: (() => {
        const r = document.querySelector('.m-credits').getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      })(),
      /* the rotated bar reports a 6x40 box, so measure the LONG side */
      barLength: (() => {
        const r = document.querySelector('.m-credits .m-bar').getBoundingClientRect();
        return Math.round(Math.max(r.width, r.height));
      })(),
    };
  });

const open0 = await geom();
await p.click('.m-nav [aria-label="Collapse menu"]');
await p.waitForTimeout(400);
const shut = await geom();

check('the menu collapses to one glyph column with an equal gutter either side',
  shut.collapsed && shut.width === 52, `${shut.width}px`);
check('the collapse takes the labels', shut.labels === 0, `${shut.labels} labels still drawn`);
check('the open menu keeps its count column',
  open0.counts.length > 0, open0.counts.join(','));
check('the figure leaves the rail and its dot takes its place',
  shut.numShown === 'none' && shut.dotsShown === shut.dots && shut.dots > 0,
  `${shut.dotsShown}/${shut.dots} dots, figures ${shut.numShown}`);
check('and the same dot rides the figure in the open menu',
  open0.dotsShown === open0.dots && open0.dots === shut.dots && open0.numShown !== 'none',
  `${open0.dotsShown}/${open0.dots} open, ${shut.dotsShown}/${shut.dots} narrow`);
check('nothing hangs past the agents scroller, which clips both axes',
  shut.spill <= 0, `${shut.spill}px past the edge`);
check('and the glyphs are centred in the rail, which is what that buys',
  shut.centres.every((c) => c === shut.navMid),
  `glyphs at ${shut.centres.join('/')}, rail centre ${shut.navMid}`);
check('every glyph in the narrow menu shares one column',
  new Set(shut.centres).size === 1 && shut.centres[0] !== null, shut.centres.join(' / '));
/* 6px, and all of it is the left gutter closing from 16 to 12 plus the row
   losing its 8px padding to centre the glyph. The icons drift, they do not
   travel: a collapse where the glyphs stay put reads as the labels leaving
   rather than as two different navs. */
check('the glyphs drift rather than travel between the two widths',
  Math.abs(shut.centres[1] - open0.centres[1]) <= 8,
  `${open0.centres[1]} -> ${shut.centres[1]}`);
check('the tool bar folds into one column rather than switching to one',
  open0.toolsBox.tracks > 1 && shut.toolsBox.tracks === 1 && shut.toolsBox.h > open0.toolsBox.h * 3,
  `${open0.toolsBox.tracks} tracks/${open0.toolsBox.h}px -> ${shut.toolsBox.tracks} track/${shut.toolsBox.h}px`);
check('the credits turn rather than shrink, so the measure is still readable',
  shut.barLength >= 32 && shut.creditsBox.w <= 32,
  `bar ${open0.barLength}px across -> ${shut.barLength}px tall, in ${shut.creditsBox.w}px`);
check('the plane takes back every pixel the menu gave up',
  shut.plane - open0.plane === open0.width - shut.width,
  `plane +${shut.plane - open0.plane}, menu -${open0.width - shut.width}`);

/* THE FLYOUT: the row the width took away, including what is inside it. */
await p.hover('.m-nav__scroll .m-nav__row:nth-of-type(2)');
await p.waitForTimeout(600);
const fly = await p.evaluate(() => {
  const el = document.querySelector('.m-flyout');
  if (!el) return null;
  return {
    name: el.querySelector('.m-flyout__name')?.textContent?.trim(),
    count: el.querySelector('.m-flyout__count')?.textContent?.trim(),
    sections: [...el.querySelectorAll('.m-flyout__sections .m-nav-item__label')].map((n) => n.textContent.trim()),
  };
});
check('a narrow row gives its label back on hover', fly?.name === 'Synthetics', fly?.name);
check('and the sections the menu can no longer nest',
  fly?.sections.join('/') === 'Tests/Runs/Environments', fly?.sections.join('/'));
/* ⚠ A HOVER MENU YOU CANNOT REACH IS NOT A MENU. antd sets the card down clear
   of the rail, and that gap belonged to neither element: a cursor crossing it
   left the trigger and the card closed before it arrived. The popup's root
   carries the gap as padding now, so this must never go positive. */
const bridge = await p.evaluate(() => {
  const t = document.querySelectorAll('.m-nav__scroll .m-nav__row')[1].getBoundingClientRect();
  const r = document.querySelector('.m-flyout-root').getBoundingClientRect();
  return Math.round(r.left - t.right);
});
check('and the cursor can actually get to them', bridge <= 0, `${bridge}px of dead ground`);

/* A LEAF ROW GETS THE NAME AND NOTHING ELSE: its count is still on the row, so
   a card restating it would be reading the row back to someone looking at it. */
await p.hover('.m-nav__foot');
await p.waitForTimeout(300);
await p.hover('.m-nav__scroll .m-nav__row:nth-of-type(1)');
await p.waitForTimeout(700);
const leafCard = await p.evaluate(() => document.querySelector('.m-flyout')?.textContent ?? null);
check('and only a row with something inside it gets a card',
  leafCard === null, leafCard ? 'a leaf agent opened a flyout card' : 'Issues shows a plain tooltip');

/* THE HOVER BUG the collapse exposed: `--m-surface-hover` is the ground's own
   colour in light mode, so a row on the ground had no hover at all. */
const rowSteps = await p.evaluate(() => {
  const row = document.querySelector('.m-nav__scroll .m-nav-item');
  const ground = getComputedStyle(document.querySelector('.m-shell')).backgroundColor;
  const cs = getComputedStyle(row);
  return {
    ground,
    hover: cs.getPropertyValue('--m-nav-row-hover').trim(),
    on: getComputedStyle(document.querySelector('.m-nav-item.is-active')).backgroundColor,
    plane: getComputedStyle(document.querySelector('.m-page')).backgroundColor,
  };
});
check('a nav row steps off the ground rather than towards a card that is not there',
  rowSteps.hover !== '' && rowSteps.hover !== rowSteps.ground, `hover ${rowSteps.hover} on ${rowSteps.ground}`);
check('the row you are standing on is the plane you opened',
  rowSteps.on === rowSteps.plane, `${rowSteps.on} vs ${rowSteps.plane}`);

/* And the keyboard puts it back. */
await p.keyboard.press(process.platform === 'darwin' ? 'Meta+\\' : 'Control+\\');
await p.waitForTimeout(400);
const back = await geom();
check('the shortcut opens it again', !back.collapsed && back.width === open0.width, `${back.width}px`);

// ── 1c. WHAT YOU HAVE NOT OPENED YET ──────────────────────────────────────
/* The menu's dot one level down: which of the things the agent found are new to
   you. The slot is on every row so the titles keep one left edge - rendering it
   only where it applies pushes those three titles five pixels right of the
   other seven, which is the exact complaint the dot came out of. */
const unread = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.m-issues__table tbody tr')];
  const lefts = rows.map((r) => r.querySelector('.m-issues__title')?.getBoundingClientRect().left)
    .filter((x) => x != null).map(Math.round);
  const dot = document.querySelector('.m-issues__table .m-dot.is-slot:not(.is-off)');
  return {
    rows: rows.length,
    size: dot ? `${getComputedStyle(dot).width}x${getComputedStyle(dot).height}` : null,
    slots: rows.filter((r) => r.querySelector('.m-dot.is-slot')).length,
    lit: rows.filter((r) => !r.querySelector('.m-dot.is-slot')?.classList.contains('is-off')).length,
    titleEdges: new Set(lefts).size,
    colour: dot ? getComputedStyle(dot).backgroundColor : null,
    navDot: (() => {
      const d = document.querySelector('.m-nav .m-dot');
      return d ? getComputedStyle(d).backgroundColor : null;
    })(),
  };
});
check('some issues are marked as not opened yet',
  unread.lit > 0 && unread.lit < unread.rows, `${unread.lit} of ${unread.rows}`);
check('and the slot is on every row, so the titles keep one edge',
  unread.slots === unread.rows && unread.titleEdges === 1,
  `${unread.slots}/${unread.rows} slots, ${unread.titleEdges} title edge`);
check('it is the same mark the menu wears, in the same colour',
  unread.colour != null && unread.colour === unread.navDot, `${unread.colour} vs ${unread.navDot}`);

/* ── THE PAGER'S CURRENT PAGE ─────────────────────────────────────────────
   antd draws the active item's border from `colorPrimary`, which this app sets
   to near-black for the figure inside it - so the footer carried the only
   near-black outline in the build. Selection here is a FILL plus a weight
   change, like the nav's current row and the segmented thumb. */
const pager = await p.evaluate(() => {
  const a = document.querySelector('.ant-pagination-item-active');
  if (!a) return null;
  const cs = getComputedStyle(a);
  const nav = document.querySelector('.m-nav-item.is-active');
  return {
    border: cs.borderTopColor,
    bg: cs.backgroundColor,
    weight: cs.fontWeight,
    navWeight: nav ? getComputedStyle(nav).fontWeight : null,
  };
});
check('the current page is a fill, not a ring',
  !!pager && pager.border === 'rgba(0, 0, 0, 0)' && pager.bg !== 'rgba(0, 0, 0, 0)',
  `border ${pager?.border}, fill ${pager?.bg}`);
check('and it carries the same weight the menu gives the row you are on',
  !!pager && pager.weight === pager.navWeight, `${pager?.weight} vs ${pager?.navWeight}`);

/* ⚠ AND EVERY MARK IS IN THE MIDDLE OF ITS OWN BOX. antd's prev/next are
   `display: block` with a line-height, which is the right shape for the icon
   FONT it ships and the wrong one for the SVG we swapped in: an inline svg sits
   on the baseline and starts at the content box's left edge, so the chevrons
   were 6px high and 6px left while the digits beside them were centred. */
const pagerCentres = await p.evaluate(() =>
  [...document.querySelectorAll('.ant-pagination > li')].map((li) => {
    const inner = li.querySelector('svg, a');
    if (!inner) return null;
    const b = li.getBoundingClientRect();
    const i = inner.getBoundingClientRect();
    return {
      cls: li.className.split(' ')[1] ?? li.className,
      dx: Math.round((i.left + i.right) / 2 - (b.left + b.right) / 2),
      dy: Math.round((i.top + i.bottom) / 2 - (b.top + b.bottom) / 2),
    };
  }).filter(Boolean));
check('every mark in the pager sits in the middle of its own box',
  pagerCentres.length >= 4 && pagerCentres.every((c) => c.dx === 0 && c.dy === 0),
  pagerCentres.map((c) => `${c.cls} ${c.dx},${c.dy}`).join(' | '));

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

/* The accent is a PALETTE of swatches now, not a segmented control: thirteen
   hues in thirteen labelled cells is thirteen words nobody reads. Picked by the
   swatch's accessible name. */
await p.locator('.m-proto__swatch[aria-label="Indigo"]').click();
await p.waitForTimeout(400);
const indigo = await read();
check('accent switches (CSS)', indigo.accent !== base.accent, `${base.accent} -> ${indigo.accent}`);
check('accent reaches antd', !!indigo.antdPrimary && indigo.antdPrimary !== base.antdPrimary,
  `${base.antdPrimary} -> ${indigo.antdPrimary}`);

const spaced = await pick('Spaced');
check('density switches', spaced.space6 !== base.space6 && spaced.row !== base.row,
  `space-6 ${base.space6} -> ${spaced.space6}, row ${base.row} -> ${spaced.row}`);

/* ── CORNERS ────────────────────────────────────────────────────────────────
   The check that guards Mehdi's own finding: "the corners here are rounded, but
   if you look at the search bar the corners are not rounded. Is that done on
   purpose?" It was not. The radius is a ROLE scale now - chip, control, surface
   - so the assertion is not "the value changed" but "every object of one kind
   has one shape", measured across the rendered page including antd's own
   components, which are themed through a separate channel and are exactly what
   drifted before. */
const shapeOf = () => p.evaluate(() => {
  const t = getComputedStyle(document.documentElement);
  const tok = (k) => t.getPropertyValue('--m-radius-' + k).trim();
  const one = (sel) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).borderTopLeftRadius : null;
  };
  /* Two controls that antd draws and two we draw ourselves. The pair that
     disagreed was the search input (antd, 2px) and the icon button beside it
     (ours, 4px), ten pixels apart on the same toolbar row. */
  return {
    tokens: { chip: tok('chip'), control: tok('control'), surface: tok('surface'), check: tok('check') },
    /* every small SQUARE mark reads the capped value, not the chip one */
    crit: one('.m-crit'),
    searchInput: one('.ant-input-affix-wrapper'),
    button: one('.ant-btn'),
    iconButton: one('.m-iconbtn'),
    navRow: one('.m-nav-item'),
    segTrack: one('.ant-segmented'),
    ownTrack: one('.m-seg'),
    /* A toggle is a control and its track is control + 2, so the two corners
       are concentric. Measured on both strips: antd's and ours. */
    segItem: one('.ant-segmented-item'),
    ownItem: one('.m-seg__item'),
    /* antd v6 draws the box on `.ant-checkbox` itself - there is no `-inner`
       any more, and a selector for one silently measures nothing. */
    checkbox: one('.ant-checkbox'),
    chip: one('.m-chip'),
    plane: one('.m-page'),
    /* Every distinct radius on screen, so a stray literal shows up as a fourth
       bucket rather than hiding behind a spot check. */
    buckets: (() => {
      const set = new Set();
      for (const el of document.querySelectorAll('*')) {
        const v = getComputedStyle(el).borderTopLeftRadius;
        const r = el.getBoundingClientRect();
        if (!v || v === '0px' || r.width < 6 || r.height < 6) continue;
        set.add(v);
      }
      return [...set].sort((a, b) => parseFloat(a) - parseFloat(b));
    })(),
  };
});

/* The corner checks need a table with checkboxes in it, and the queue has none
   since the row itself became the gesture. */
await p.locator('.m-nav-item__label', { hasText: /^Synthetics$/ }).first().click();
await p.locator('.m-tests__table').waitFor();
await p.waitForTimeout(400);

for (const [label, expect] of [['Sharp', { chip: '0px', control: '2px', surface: '4px', check: '0px' }],
                               ['Round', { chip: '999px', control: '10px', surface: '16px', check: '4px' }],
                               ['Soft', { chip: '2px', control: '4px', surface: '8px', check: '2px' }]]) {
  await p.locator('.m-proto__body').getByText(label, { exact: true }).click();
  await p.waitForTimeout(450);
  const sh = await shapeOf();
  check(`corners ${label}: the three roles are the three values`,
    sh.tokens.chip === expect.chip && sh.tokens.control === expect.control && sh.tokens.surface === expect.surface,
    JSON.stringify(sh.tokens));
  /* The seam itself: antd's input, antd's button, our icon button and our nav
     row are one shape, and it is the control token. */
  check(`corners ${label}: every control is one shape, antd's and ours`,
    [sh.searchInput, sh.button, sh.iconButton, sh.navRow, sh.segItem, sh.ownItem]
      .every((v) => v === expect.control),
    `input ${sh.searchInput}, btn ${sh.button}, iconbtn ${sh.iconButton}, nav ${sh.navRow}, seg items ${sh.ownItem}/${sh.segItem}`);
  const trackPx = `${parseFloat(expect.control) + 2}px`;
  /* Concentric, not merely "both rounded": the track's corner is the item's
     corner plus the 2px between them. Anything else pinches or bulges, which is
     what the Round shape showed first - a fully round item in a 10px track. */
  check(`corners ${label}: a toggle is a control and its track wraps it exactly`,
    sh.segItem === expect.control && sh.ownItem === expect.control &&
      sh.segTrack === trackPx && sh.ownTrack === trackPx,
    `item ${sh.ownItem}/${sh.segItem}, track ${sh.ownTrack}/${sh.segTrack}, expected ${expect.control} in ${trackPx}`);
  /* The cap. A circle means one-of-these; a checkbox is any-of-these - and a
     circle in a table row is an avatar, not a flag on that row. Both small
     square marks read the capped value, which is why this asserts the FLAG as
     well as the box: the cap is a rule about the shape, not about checkboxes. */
  check(`corners ${label}: the checkbox is still a square`,
    sh.checkbox === expect.check && parseFloat(expect.check) <= 4,
    `${sh.checkbox}`);
  check(`corners ${label}: nothing on screen is off the scale`,
    sh.buckets.every((v) => [expect.chip, expect.control, expect.surface, expect.check, trackPx, '999px'].includes(v)),
    sh.buckets.join(' '));
}

/* ── THE FILTER PILLS ───────────────────────────────────────────────────────
   Three treatments of one thing, and the grey band went in all three: "the
   background of this section shouldn't be gray, it gives a muted vibe". */
/* Runs on the Tests page, where the corner checks left it - so the chip comes
   from the tests filter menu rather than from the issue queue's categories. */
await p.locator('[aria-label="Filter tests"]').click();
await p.waitForTimeout(350);
await p.locator('.m-fm__dim-row', { hasText: 'Environment' }).click();
await p.waitForTimeout(250);
await p.locator('.m-checkrow', { hasText: 'Production' }).click();
await p.waitForTimeout(250);
await p.keyboard.press('Escape');
await p.waitForTimeout(350);
const pill = () => p.evaluate(() => {
  const bar = document.querySelector('.m-af');
  const chip = document.querySelector('.m-af__chip');
  if (!bar || !chip) return null;
  const cs = getComputedStyle(chip);
  return {
    band: getComputedStyle(bar).backgroundColor,
    border: cs.borderTopWidth,
    bg: cs.backgroundColor,
    dim: getComputedStyle(document.querySelector('.m-af__dim')).color,
  };
});
const outline = await pill();
check('FILTERS: the grey band is gone', outline?.band === 'rgba(0, 0, 0, 0)', outline?.band);
for (const [label, expect] of [['Tinted', 'tinted'], ['Text', 'text'], ['Outline', 'outline']]) {
  await p.locator('.m-proto__body').getByText(label, { exact: true }).click();
  await p.waitForTimeout(350);
  const v = await pill();
  const attr = await p.evaluate(() => document.documentElement.getAttribute('data-filters'));
  const shaped =
    expect === 'text' ? v?.border === '0px' : v?.border === '1px';
  check(`FILTERS: ${label} is its own treatment`, attr === expect && shaped && v?.band === 'rgba(0, 0, 0, 0)',
    `${attr} — border ${v?.border}, chip ${v?.bg}, band ${v?.band}`);
}

await p.locator('.m-proto__reset').click();
await p.waitForTimeout(400);
const reset = await read();
check('reset returns the shipped tokens',
  reset.accent === base.accent && reset.canvas === base.canvas && reset.font === base.font &&
    reset.titleFont === base.titleFont && reset.tag === base.tag
    && reset.antdFont === base.antdFont && reset.space6 === base.space6);

/* THE CAP IS A RULE ABOUT THE SHAPE, NOT ABOUT CHECKBOXES. The critical flag is
   a 20px SQUARE and it was on the chip radius, so the Round preset turned it
   into a circle - and a circle in a table row is an avatar or a one-of-these,
   never a mark on the row itself. Round is the only preset where the two
   values differ, which is why this is one pass rather than three. */
await p.locator('.m-proto__body').getByText('Round', { exact: true }).click();
await p.waitForTimeout(300);
await p.locator('.m-nav-item__label', { hasText: /^Issues$/ }).first().click();
await p.locator('.m-issues__table, .ant-table').first().waitFor();
await p.waitForTimeout(400);
const critShape = await p.evaluate(() => {
  const el = document.querySelector('.m-crit');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { r: cs.borderTopLeftRadius, chip: getComputedStyle(document.documentElement).getPropertyValue('--m-radius-chip').trim(), w: Math.round(el.getBoundingClientRect().width) };
});
check('the critical flag stops climbing with the chip radius',
  !!critShape && critShape.r === '4px' && critShape.chip === '999px',
  critShape ? `flag ${critShape.r} on a ${critShape.w}px box while chips are ${critShape.chip}` : 'no flag on screen');
await p.locator('.m-proto__reset').click();
await p.waitForTimeout(300);

check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\nPASS');
for (const l of pass) console.log('  ✓ ' + l);
if (fail.length) {
  console.log('\nFAIL');
  for (const l of fail) console.log('  ✗ ' + l);
}
await b.close();
process.exit(fail.length ? 1 : 0);

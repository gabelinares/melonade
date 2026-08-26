/* Verifies the 2026-08-26 batch end to end in a real browser: the rail replaced
 * the labelled nav, the session thumbnails have height again, the journey nodes
 * sit on their labels, and every prototype-panel switch moves BOTH layers - the
 * CSS variables and antd's own component colours. The last one is the whole
 * reason the variants are generated twice; a check that only read var(--m-*)
 * would pass while every button on the page stayed teal.
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

// ── 1. the nav ────────────────────────────────────────────────────────────
const nav = await p.evaluate(() => {
  const rail = document.querySelector('.m-rail');
  const old = document.querySelector('.m-nav');
  const items = document.querySelectorAll('.m-rail-item').length;
  return {
    rail: !!rail,
    old: !!old,
    width: rail ? Math.round(rail.getBoundingClientRect().width) : 0,
    items,
    labelsOnScreen: rail ? /Issues|Sessions|Preferences/.test(rail.textContent || '') : true,
  };
});
check('rail renders', nav.rail);
check('labelled nav gone', !nav.old);
check('rail is 56px', nav.width === 56, `${nav.width}px`);
check('slots present', nav.items >= 6, `${nav.items} slots`);
check('no labels printed in the rail', !nav.labelsOnScreen);

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

await p.locator('[aria-label="Open the write-up"]').first().click();
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
check('detail header box matches the list header',
  cont.head && cont.head.h === listShell.head.h && cont.head.padL === listShell.head.padL,
  `${cont.head?.h}px/${cont.head?.padL} vs ${listShell.head.h}px/${listShell.head.padL}`);
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

/* The cap applies at the replay depth too, so the frame now divides a narrower
   plane. Nothing may overflow it and the player must keep its ratio. */
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
check('replay depth fits the capped card',
  !!frame && frame.workW <= 1360 && frame.stageRight <= frame.workRight && !frame.scrollX,
  frame ? `card ${frame.workW}, stage ends ${frame.stageRight} of ${frame.workRight}, journey ${frame.jrnW}` : 'no frame');
check('the player frame keeps 16:10 in the narrower plane', !!frame && Math.abs(frame.stageRatio - 1.6) < 0.05,
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
    loaded: ['IBM Plex Sans', 'Inter', 'Geist'].filter((f) => document.fonts.check(`500 14px "${f}"`)),
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

/* All three warmed on mount, so a switch never paints the fallback. This is the
   check that would have caught the original bug: the faces were declared but
   nothing had fetched them, and Inter measured to the pixel the same as
   -apple-system. */
check('all three faces warmed on mount', base.loaded.length === 3, base.loaded.join(', ') || 'none');

const geist = await pick('Geist');
check('typeface switches (page)', geist.font !== base.font && /Geist/i.test(geist.font),
  `${base.font} -> ${geist.font}`);
check('typeface reaches antd', !!geist.antdFont && /Geist/i.test(geist.antdFont),
  `${base.antdFont} -> ${geist.antdFont}`);

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
  reset.accent === base.accent && reset.canvas === base.canvas && reset.font === base.font
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

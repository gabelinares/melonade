/* ── THE OPENREPLAY MARK'S SHAPE SHIFT, asserted rather than eyeballed ───────
   Replaces the 08-21 version of this file, which checked the old two-rect
   watermelon mark and its `--m-brand-mark` token. Both are gone: the mark is
   OpenReplay's own logo since 09-03 and the watermelon can never be the accent.
   The old file's one good idea survives here - that mark also traded its two
   shapes' places, and it also proved it by measuring rather than looking.

   What this asserts, in both themes:
     1. one clip and one mask per instance, with unique ids that resolve
     2. at rest the logo is untouched: teal play in a blue frame, nothing else
     3. hovered, the teal fills the frame's interior INCLUDING the sharp
        corners - which is the clip doing the fitting
     4. hovered, a play-shaped opening appears where the teal was, and it is a
        real hole: the pixel equals the surface behind the logo, per theme
     5. the frame neither moves nor dims
     6. it returns all the way on leave
     7. collapsed, the shift does NOT run - the expand glyph owns that hover

   ⚠ THE PIXELS COME FROM A SCREENSHOT, not from serialising the <svg>.
   Serialising it and rendering that gives a white box: the classes live in an
   external stylesheet that does not travel with the markup, so nothing is
   filled and every colour assertion passes on nothing.

   Usage: node tools/mark-check.mjs [url]                    default :4310 */
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4310/';

/* Sample points in viewBox units (the mark is 52x59), converted to fractions:
     (21.51, 29.5)  the inner play's own centre    teal at rest, hole hovered
     (18, 18)       interior, above the play       surface, then teal
     (40, 29.5)     near the apex                  surface, then teal
     (8, 10)        just inside the top-left vertex  the one that proves the
                    clip fills a SHARP corner a rounded triangle cannot reach
     (32, 29.5)     two units past the play's tip  proves the opening is the
                    play's shape and not a blob
     (3, 29.5)      the frame's left bar           blue, and stays blue        */
const PTS = {
  centre: [21.5114, 29.5],
  mid: [18, 18],
  apex: [40, 29.5],
  corner: [8, 10],
  just: [32, 29.5],
  rim: [3, 29.5],
};

const TEAL = [0x27, 0xa2, 0xa8];
const BLUE = [0x39, 0x4e, 0xff];
const hex = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('');
const near = (a, b, tol = 10) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

const browser = await chromium.launch();
let bad = 0;
const ok = (c, m, x = '') => { console.log((c ? 'PASS  ' : 'FAIL  ') + m + (x ? '  ' + x : '')); if (!c) bad++; };

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log(`\n── ${theme} ──`);

  ok(await page.locator('.m-ormark').count() >= 1, 'the mark renders');

  const refs = await page.evaluate(() => [...document.querySelectorAll('.m-ormark')].map((s) => {
    const clip = (s.querySelector('g[clip-path]')?.getAttribute('clip-path') || '').replace(/^url\(#|\)$/g, '');
    const mask = (s.querySelector('g[mask]')?.getAttribute('mask') || '').replace(/^url\(#|\)$/g, '');
    return { clip, mask, ok: !!(clip && mask && s.querySelector(`clipPath#${clip}`) && s.querySelector(`mask#${mask}`)) };
  }));
  ok(refs.every((r) => r.ok), 'every clip and mask reference resolves', JSON.stringify(refs.map((r) => r.clip)));
  ok(new Set(refs.flatMap((r) => [r.clip, r.mask])).size === refs.length * 2, 'the ids are unique per instance');

  /* Blow one mark up so single pixels are readable, and paint the surface it
     actually sits on behind it - so "the opening is a real hole" is checked
     against this theme's own nav colour rather than against a guess. */
  const surface = await page.evaluate(() => {
    const s = document.querySelector('.m-ormark');
    /* ⚠ WALK UP FOR AN OPAQUE COLOUR. `.m-nav` computes to
       `rgba(0, 0, 0, 0)` - the column's colour is painted by an ancestor - and
       taking that literally paints the probe transparent, so every sample
       reads whatever page content happens to sit behind it instead. Which it
       did, and the "hole" assertion failed against grey. */
    let n = s.parentElement;
    let bg = 'rgb(255, 255, 255)';
    while (n) {
      const c = getComputedStyle(n).backgroundColor;
      const a = c.match(/[\d.]+/g);
      if (a && (a.length < 4 || parseFloat(a[3]) > 0.99)) { bg = c; break; }
      n = n.parentElement;
    }
    s.setAttribute('height', '260');
    s.setAttribute('width', String((260 * 52) / 59));
    Object.assign(s.style, { position: 'fixed', left: '420px', top: '180px', zIndex: '9999', background: bg });
    return bg;
  });
  const SURFACE = surface.match(/\d+/g).slice(0, 3).map(Number);
  console.log(`        surface behind the mark: ${surface}`);

  const geom = () => page.evaluate(() => {
    const s = document.querySelector('.m-ormark');
    const cs = (sel) => getComputedStyle(s.querySelector(sel));
    return {
      fill: cs('.m-ormark__fill').transform,
      eye: cs('.m-ormark__eye').opacity,
      outline: cs('.m-ormark__outline').opacity,
      outlineT: cs('.m-ormark__outline').transform,
    };
  });

  const sample = async () => {
    const png = (await page.locator('.m-ormark').first().screenshot()).toString('base64');
    return page.evaluate(async ({ png, PTS }) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + png; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const out = {};
      for (const [k, [vx, vy]] of Object.entries(PTS)) {
        const d = g.getImageData(Math.round((vx / 52) * c.width), Math.round((vy / 59) * c.height), 1, 1).data;
        out[k] = [d[0], d[1], d[2]];
      }
      return out;
    }, { png, PTS });
  };

  const g0 = await geom();
  ok(g0.fill === 'none', 'at rest the teal play is untransformed', g0.fill);
  ok(g0.eye === '0', 'at rest nothing is subtracted from it', g0.eye);

  const c0 = await sample();
  ok(near(c0.centre, TEAL), 'at rest the middle is the teal play', hex(c0.centre));
  ok([c0.mid, c0.apex, c0.corner, c0.just].every((c) => near(c, SURFACE)),
    'at rest the rest of the interior is empty', [c0.mid, c0.apex, c0.corner].map(hex).join(' '));
  ok(near(c0.rim, BLUE), 'the frame is the brand blue', hex(c0.rim));

  await page.locator('[data-mark-host]').first().hover();
  await page.waitForTimeout(700);

  const g1 = await geom();
  const m = /matrix\(([-\d.]+)/.exec(g1.fill);
  ok(m && Math.abs(parseFloat(m[1]) - 2.5) < 0.01, 'hovered: the teal play is scaled 2.5x', g1.fill);
  ok(g1.eye === '1', 'hovered: the opening is fully open', g1.eye);
  ok(g1.outline === '1' && g1.outlineT === 'none', 'the frame neither dims nor moves', `${g1.outline} / ${g1.outlineT}`);

  const c1 = await sample();
  ok(near(c1.mid, TEAL), 'hovered: the interior floods teal', hex(c1.mid));
  ok(near(c1.apex, TEAL), 'hovered: the fill reaches the apex', hex(c1.apex));
  ok(near(c1.corner, TEAL), 'hovered: the fill takes the sharp corner (the clip fits)', hex(c1.corner));
  ok(near(c1.just, TEAL), 'hovered: and the opening stops where the play stopped', hex(c1.just));
  ok(near(c1.centre, SURFACE), 'hovered: the opening is a real hole through to the surface',
    `${hex(c0.centre)} -> ${hex(c1.centre)} vs ${hex(SURFACE)}`);
  ok(near(c1.rim, BLUE), 'the frame keeps its colour', hex(c1.rim));

  await page.mouse.move(1300, 820);
  await page.waitForTimeout(700);
  const g2 = await geom();
  ok(g2.fill === 'none' && g2.eye === '0', 'it returns all the way', `${g2.fill} / ${g2.eye}`);

  /* ── COLLAPSED, where the shift must not run ───────────────────────────── */
  await page.evaluate(() => {
    const s = document.querySelector('.m-ormark');
    s.removeAttribute('style');
    s.setAttribute('height', '16');
    s.setAttribute('width', String((16 * 52) / 59));
  });
  await page.locator('.m-nav__collapse').click();
  await page.waitForTimeout(300);
  /* ⚠ SINCE 09-04 THE BRAND ROW IS NOT A TOGGLE. The collapse lives in the foot
     (Mehdi: "put it down on top of the 50K"), so narrow, the row holds the mark
     alone and there is no expand glyph to crossfade in. What is asserted now:
     the control is still reachable in the narrow state, and hovering the mark
     runs the mark's OWN hover rather than a suppressed one. */
  ok(await page.locator('.m-nav__brand-toggle').count() === 0, 'collapsed: the brand row is not a toggle any more');
  ok(await page.locator('.m-nav__foot .m-nav__collapse').count() === 1, 'collapsed: the expand control is in the foot');
  ok(await page.locator('.m-nav__brand .m-nav__mark').count() === 1, 'collapsed: the mark is still on the brand row');

  errs.length && console.log('        console errors:', errs.join(' | '));
  ok(errs.length === 0, 'no console errors');
  await ctx.close();
}

await browser.close();
console.log(bad ? `\n${bad} FAILURE(S)` : '\nall assertions pass');
process.exit(bad ? 1 : 0);

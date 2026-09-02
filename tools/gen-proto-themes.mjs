/* Generates option-a/src/tokens/proto-themes.css: the alternative palettes the
 * prototype panel switches between.
 *
 * WHY GENERATE RATHER THAN PICK HEXES. Mehdi asked on 2026-08-26 for fonts and
 * colours he can play with, and for greys that "actually match the palette".
 * Hand-picked greys do not match anything: the shipped ramp is an OKLCH
 * lightness ladder with a chroma ladder tuned per step, and three eyeballed
 * hexes would break the contrast steps that every surface pair depends on. So a
 * variant here changes ONE parameter of the intent - the neutral hue, the accent
 * hue - and keeps the ladders exactly as they are. Same contrast, same
 * elevation, different temperature.
 *
 * It re-uses the semantic MAPPING rather than restating it: the token names and
 * which palette key each one points at are read out of tokens.ts, so a variant
 * cannot drift from the shipped theme when a role is added or repointed.
 *
 * Usage: node tools/gen-proto-themes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, deltaL } from './oklch.mjs';
import { ramp, darkText } from './ramp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..', 'option-a');

/* ── the shipped intent, copied verbatim from gen-palette.mjs ───────────────
   Copied and not re-derived: these ladders are the thing a variant must hold
   constant, so they have to be the same numbers, not similar ones. */
const NEUTRAL = [['0',100,0],['25',99.0,0.002],['50',98.0,0.003],['100',96.2,0.004],['150',94.0,0.005],
  ['200',91.0,0.006],['300',85.0,0.007],['400',72,0.009],['500',60,0.011],['550',55,0.012],
  ['600',50,0.012],['700',40,0.012],['800',30,0.011],['850',26,0.011],['900',22,0.010],['950',16,0.009]];
const ACCENT = [['50',96,0.018],['100',92.5,0.032],['200',86,0.050],['300',77,0.066],['400',64,0.076],
  ['500',54,0.080],['600',46,0.076],['700',38,0.062],['800',31,0.050],['900',23,0.038]];
/* The dark surface ladder is its own intent, not the neutral ramp read
   downwards: on a dark ground the surfaces carry the depth a shadow cannot, so
   the steps are wider than anything in the light theme. A grey variant has to
   move this too - moving only `n-*` would leave every dark SURFACE on the
   shipped hue while every border and label moved, which is a half-recoloured
   theme and looks like a bug. */
const DARK = [['void',11,0.008],['sunken',15,0.009],['base',19,0.009],['raised',24,0.010],['overlay',28,0.011]];
const DARK_TEXT_CHROMA = 0.012;
const SHIPPED_NEUTRAL_HUE = 220;
const SHIPPED_ACCENT_HUE = 210;

/* ── the variants ──────────────────────────────────────────────────────────
   Three greys and two accents, and the shipped pair is deliberately one of
   each: a control needs a default to compare against, and "the one we have"
   has to be reachable without reloading. */
const GREYS = [
  { key: 'cool', label: 'Cool', hue: SHIPPED_NEUTRAL_HUE, chroma: 1,
    note: 'the shipped ramp: neutrals pulled a hair toward the accent hue' },
  { key: 'true', label: 'True', hue: SHIPPED_NEUTRAL_HUE, chroma: 0,
    note: 'no hue at all. Every surface is a pure grey, which is the most sober of the three' },
  { key: 'warm', label: 'Warm', hue: 75, chroma: 1,
    note: 'the same ladder rotated to a warm hue: paper rather than slate' },
];

/* TWELVE HUES, EVENLY ROUND THE WHEEL from the shipped one, so the panel is a
   palette rather than a pair. They are generated from a hue and nothing else -
   the same OKLCH ramp, the same lightness ladder, the same chroma - so every
   one of them lands with the same contrast against the same surfaces, and the
   only thing that moves between them is the colour.

   ⚠ The RED HALF IS STILL A REAL CONSTRAINT and the generator says so rather
   than hiding it: an accent too close to danger or warning makes a selected row
   read as an alarm. Rose, red and amber are in the list because Mehdi asked to
   see more of the wheel, and each one carries the distance to the alarm colours
   in its note so the trade is visible when it is picked, not after. */
const ALARM_HUES = { danger: 27, warning: 70, success: 150 };
const around = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const hueNote = (hue) => {
  const d = Object.entries(ALARM_HUES).map(([k, v]) => [k, around(hue, v)]);
  const [closest, dist] = d.sort((x, y) => x[1] - y[1])[0];
  return dist < 40
    ? `only ${Math.round(dist)}° from ${closest} - a selected row will read as an alarm`
    : `${Math.round(dist)}° from ${closest}, the nearest alarm colour`;
};

const ACCENTS = [
  { key: 'teal', label: 'Teal', hue: SHIPPED_ACCENT_HUE },
  { key: 'indigo', label: 'Indigo', hue: 275 },
  { key: 'blue', label: 'Blue', hue: 250 },
  { key: 'sky', label: 'Sky', hue: 230 },
  { key: 'cyan', label: 'Cyan', hue: 195 },
  { key: 'emerald', label: 'Emerald', hue: 165 },
  { key: 'green', label: 'Green', hue: 140 },
  { key: 'lime', label: 'Lime', hue: 120 },
  { key: 'amber', label: 'Amber', hue: 75 },
  { key: 'orange', label: 'Orange', hue: 50 },
  { key: 'rose', label: 'Rose', hue: 15 },
  { key: 'magenta', label: 'Magenta', hue: 340 },
  { key: 'violet', label: 'Violet', hue: 300 },
].map((a) => ({ ...a, note: hueNote(a.hue) }));

/* ── the semantic mapping, read out of tokens.ts ───────────────────────────── */
const src = readFileSync(resolve(app, 'src/tokens/tokens.ts'), 'utf8');

function mapping(blockName) {
  const start = src.indexOf(`export const ${blockName}`);
  if (start < 0) throw new Error(`${blockName} not found in tokens.ts`);
  const end = src.indexOf('\n} as const', start);
  const block = src.slice(start, end);
  const pairs = [];
  const re = /'([a-z0-9-]+)':\s*p\['([a-z0-9-]+)'\]/g;
  let m;
  while ((m = re.exec(block))) pairs.push([m[1], m[2]]);
  return pairs;
}

const light = mapping('lightColors');
const dark = mapping('darkColors');
if (!light.length || !dark.length) throw new Error('mapping came back empty - tokens.ts shape changed');

/* Only the roles that actually point at the ramp being changed get an override.
   A variant that restated all 65 roles would be a second theme to maintain. */
const rolesFor = (pairs, prefix) => pairs.filter(([, key]) => key.startsWith(`${prefix}-`));

const decls = (pairs, pal, indent) =>
  pairs.map(([role, key]) => {
    const v = pal[key];
    if (!v) throw new Error(`${key} missing from the generated ramp (role ${role})`);
    return `${indent}--m-${role}: ${v};`;
  }).join('\n');

/* THREE SELECTORS PER VARIANT, for the same reason tokens.css needs three: an
   explicit theme choice has to beat the media query in both directions, and a
   colour whose only definition is inside a media query disappears when the
   toggle is used. */
function variantBlock(attr, key, lightPairs, darkPairs, pal) {
  const sel = `:root[data-${attr}='${key}']`;
  return [
    `${sel} {\n${decls(lightPairs, pal, '  ')}\n}`,
    `${sel}[data-theme='dark'] {\n${decls(darkPairs, pal, '  ')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  ${sel}:not([data-theme='light']) {\n${decls(darkPairs, pal, '    ')}\n  }\n}`,
  ].join('\n\n');
}

const out = [];
const warnings = [];
const clippedAll = [];
/* What the TS output needs. antd cannot read a CSS custom property - it derives
   whole ramps from colorPrimary with an algorithm that needs a real colour
   string, and a var() there silently resolves to black. So every variant is
   emitted TWICE from this one pass: as CSS for the app's own rules, and as a
   resolved role map for antd's ConfigProvider. Two outputs, one source, no
   drift - the same reason tokens.css is generated from tokens.ts. */
const ts = { grey: {}, accent: {} };
const resolved = (pairs, pal) => Object.fromEntries(
  pairs.map(([role, key]) => [role, pal[key]]).filter(([, v]) => v),
);

out.push(`/* ══════════════════════════════════════════════════════════════════════════
   GENERATED from tools/gen-proto-themes.mjs. Do not edit.
   Run \`npm run proto-themes\` after changing the variants there.

   The alternative palettes behind the prototype panel. Each one changes a
   SINGLE parameter of the shipped OKLCH intent - the neutral hue, the neutral
   chroma, the accent hue - and keeps every lightness step and every contrast
   relationship exactly as shipped. That is what makes them switchable: they are
   the same theme at a different temperature, not three themes.

   The default variant is written out too, so the panel can return to it without
   a reload.
   ══════════════════════════════════════════════════════════════════════════ */`);

/* `dark-*` and `n-*` are both the grey's business; `dark-text-*` comes in under
   the same prefix, which is why one filter catches all of it. */
const isGrey = ([, key]) => key.startsWith('n-') || key.startsWith('dark-');
const isAccent = ([, key]) => key.startsWith('a-');
const nLight = light.filter(isGrey);
const nDark = dark.filter(isGrey);
const aLight = light.filter(isAccent);
const aDark = dark.filter(isAccent);

for (const g of GREYS) {
  const pal = {
    ...ramp(NEUTRAL, g.hue, 'n', { chromaScale: g.chroma, reduced: clippedAll }),
    ...ramp(DARK, g.hue, 'dark', { chromaScale: g.chroma, reduced: clippedAll }),
  };
  const dt = darkText(g.hue, DARK_TEXT_CHROMA * g.chroma);
  pal['dark-text-hi'] = dt.hi;
  pal['dark-text-mid'] = dt.mid;
  pal['dark-text-lo'] = dt.lo;
  /* The check that matters for a grey: body text on the page still clears AA,
     and the two lightest surfaces are still distinguishable from each other. */
  const bodyOn = contrast(pal['n-700'], pal['n-0']);
  if (bodyOn < 4.5) warnings.push(`grey ${g.key}: body text ${bodyOn.toFixed(2)}:1 on white`);
  /* The dark theme's own two checks, and they use DIFFERENT metrics on purpose.
     Text is a ratio. SURFACES ARE MEASURED IN OKLAB L POINTS, because a WCAG
     ratio between two near-blacks is meaningless - dark-base and dark-void are
     visibly different planes at 1.11:1, and any ratio threshold that "passes"
     them would pass a pair that is genuinely flat. Same thresholds the shipped
     generator uses. */
  const dTextOnBase = contrast(pal['dark-text-mid'], pal['dark-base']);
  if (dTextOnBase < 4.5) warnings.push(`grey ${g.key}: dark mid text ${dTextOnBase.toFixed(2)}:1 on card`);
  const dCardOnVoid = deltaL(pal['dark-base'], pal['dark-void']);
  if (dCardOnVoid < 6.0) warnings.push(`grey ${g.key}: dark card vs canvas only dL ${dCardOnVoid.toFixed(1)}`);
  const dRaisedOnBase = deltaL(pal['dark-raised'], pal['dark-base']);
  if (dRaisedOnBase < 4.0) warnings.push(`grey ${g.key}: dark popover vs card only dL ${dRaisedOnBase.toFixed(1)}`);
  out.push(`\n/* ── grey: ${g.label} ─ ${g.note} ── */`);
  out.push(variantBlock('grey', g.key, nLight, nDark, pal));
  ts.grey[g.key] = { label: g.label, palette: pal, light: resolved(nLight, pal), dark: resolved(nDark, pal) };
}

for (const a of ACCENTS) {
  const pal = ramp(ACCENT, a.hue, 'a', { reduced: clippedAll });
  /* The accent's job in this system is small shapes and one tinted plane, so
     the check is the functional step against white, not the wash. */
  const onWhite = contrast(pal['a-600'], '#ffffff');
  if (onWhite < 4.5) warnings.push(`accent ${a.key}: a-600 ${onWhite.toFixed(2)}:1 on white`);
  out.push(`\n/* ── accent: ${a.label} ─ ${a.note} ── */`);
  out.push(variantBlock('accent', a.key, aLight, aDark, pal));
  /* THE MARK FOLLOWS THE ACCENT. It was on its own `brand-*` ramp, which was
     right while the brand was a fixed thing and wrong the moment the accent
     became a choice: a logo in one colour beside a UI in another reads as two
     products. Same steps the accent uses for its own ink - 500 in light, 400 in
     dark, where the surface is dark enough to need the lift. */
  out.push(`:root[data-accent='${a.key}'] { --m-brand-mark: ${pal['a-500']}; }`);
  out.push(`:root[data-accent='${a.key}'][data-theme='dark'] { --m-brand-mark: ${pal['a-400']}; }`);
  out.push(
    `@media (prefers-color-scheme: dark) {\n  :root[data-accent='${a.key}']:not([data-theme='light']) { --m-brand-mark: ${pal['a-400']}; }\n}`,
  );
  ts.accent[a.key] = { label: a.label, note: a.note, palette: pal, light: resolved(aLight, pal), dark: resolved(aDark, pal) };
}

/* ── density ───────────────────────────────────────────────────────────────
   Spacing as a token was already true; what was missing is a second setting for
   it. Compact is the shipped scale. Spaced widens the middle and upper steps,
   which is where padding and gaps live, and leaves 0-2 alone: those are
   hairlines and optical nudges, and scaling them just blurs edges. Control
   heights come along, because a row that keeps its height while the gaps around
   it grow reads as a spacing bug rather than as a roomier product. */
const SPACED = {
  'space-3': '0.5rem',    // 8
  'space-4': '0.625rem',  // 10
  'space-5': '1rem',      // 16
  'space-6': '1.25rem',   // 20
  'space-7': '1.5rem',    // 24
  'space-8': '2rem',      // 32
  'space-9': '2.5rem',    // 40
  'space-10': '3rem',     // 48
  'space-11': '4rem',     // 64
  'control-height-sm': '1.875rem', // 30
  'control-height-md': '2.125rem', // 34
  'control-height-lg': '2.5rem',   // 40
  'row-height': '2.875rem',        // 46
  'nav-row-height': '2.375rem',    // 38
  'header-height': '3.25rem',      // 52
};

out.push(`\n/* ── density: Spaced ── */`);
out.push(`:root[data-density='spaced'] {\n${Object.entries(SPACED)
  .map(([k, v]) => `  --m-${k}: ${v};`).join('\n')}\n}`);

/* ── corners ────────────────────────────────────────────────────────────────
   THREE SHAPES, and each one moves all three roles together. Mehdi, on a screen
   share: "the corners here are rounded, but if you look at the search bar the
   corners are not rounded. Is that done on purpose?" It was not - the radius
   was a size scale (xs/sm/md/lg) that every component picked from by eye, and
   antd made it worse by giving a SMALL control a smaller radius than a big one.
   It is a role scale now (chip / control / surface), so a shape is three
   numbers and the whole app can be redrawn by swapping them.

   The three are not one value scaled. The ratio between the roles changes too,
   because that is what actually separates these looks: Sharp keeps the surface
   only twice the control (an app drawn with a ruler), Soft doubles at each step,
   and Round pushes chips to a full pill while keeping controls readable - go
   round on everything equally and a 14px checkbox becomes a circle nobody can
   tell from a radio.

   antd is handed the same three numbers through ConfigProvider, because it
   computes with them (the segmented thumb, inner corners) and cannot read a
   custom property. See theme/antd.ts. */
const CORNERS = [
  { key: 'sharp', label: 'Sharp', note: 'drawn with a ruler', chip: 0, control: 2, surface: 4, check: 0 },
  { key: 'soft',  label: 'Soft',  note: 'the shipped shape',  chip: 2, control: 4, surface: 8, check: 2 },
  { key: 'round', label: 'Round', note: 'pills and soft boxes', chip: 999, control: 10, surface: 16, check: 4 },
];

/* `radius-track` is NOT listed: it is calc(control + 2px) in tokens.css and
   therefore follows the control on its own. Two concentric rounded rectangles
   only look nested when the outer radius is the inner one plus the gap.
   `radius-check` IS listed, because it is the one value that has to stop
   climbing: CSS clamps a radius to half the box, so a round checkbox is a
   circle, and a circle means one-of-these. ⚠ Its ROLE is wider than its name -
   it is every small SQUARE mark that must not become a circle, and the critical
   flag is the second thing to need it. */
for (const c of CORNERS) {
  out.push(`\n/* ── corners: ${c.label} ─ ${c.note} ── */`);
  out.push(`:root[data-corners='${c.key}'] {
  --m-radius-chip: ${c.chip}px;
  --m-radius-control: ${c.control}px;
  --m-radius-surface: ${c.surface}px;
  --m-radius-check: ${c.check}px;
}`);
}

/* ── type systems ───────────────────────────────────────────────────────────
   FIVE SYSTEMS, each from software that handles type well - not five sets of
   fonts. Two earlier attempts failed and both failures are instructive: the
   first was costume (a display serif and a coder's mono over a dense table),
   and the second was too quiet to tell apart, because the only thing that
   really moved was the sans - and at 13px one grotesque looks much like
   another.

   So a system here moves FOUR THINGS, and each one is set differently by each
   system, which is what makes them tell apart at a glance:

     1. the family
     2. how the PAGE TITLE is set - face, size, tracking - and, separately, the
        weight a row's own title takes. Editorial's serif reaches the page title
        and the write-up and stops there: a list of names is scanning, not
        reading, and a serif down a column of rows is decoration again.
     3. how TAGS are set - and only tags. A status is a word you read; a tag is
        a label you scan, and only the second one wants small caps. Uppercase on
        both was the note Gabriel sent back: "unbalanced, it feels too big."
     4. what NUMBERS are set in. Console puts every count, duration and
        timestamp in its mono, which changes the texture of a whole table
        without touching a single word.

   Roles: display (titles) / sans (interface + antd) / mono (code) / num
   (figures in the UI) / prose (the write-up) / tag (chips). */
const FONTS = [
  {
    key: 'plex', label: 'Graphite',
    note: 'the shipped voice: one family doing every job, no contrast anywhere',
    sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    display: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    prose: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    tag: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    num: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    weight: 600, tracking: '-0.011em', scale: 1, rowWeight: 500,
    tagCase: 'none', tagTracking: 'var(--m-tracking-normal)', tagSize: 'var(--m-text-xs)', tagWeight: 400,
    textSm: '0.8125rem', textMd: '0.875rem',
  },
  {
    /* Linear, Figma, Height. One grotesque, and the hierarchy comes from size,
       weight and TRACKING rather than a second family: headings pulled tight,
       metadata set as small uppercase labels. Tags drop to 10px because
       uppercase reads a size bigger than sentence case at the same number -
       cap height where an x-height used to be - which is exactly why the first
       pass "felt too big". */
    key: 'swiss', label: 'Swiss',
    note: 'Linear: one grotesque, headings pulled tight, tags as small caps',
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    prose: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    tag: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    num: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    weight: 600, tracking: '-0.028em', scale: 0.96, rowWeight: 550,
    tagCase: 'uppercase', tagTracking: '0.075em', tagSize: '0.625rem', tagWeight: 600,
    textSm: '0.8125rem', textMd: '0.875rem',
  },
  {
    /* Vercel. Sans for the interface, mono for everything the MACHINE produced:
       the tags an agent attached, and every figure on the page - counts,
       durations, timestamps, page ranges. That last one is what you actually
       see: a table of mono figures has a completely different texture from the
       same table in a grotesque, and it costs no layout. */
    key: 'console', label: 'Console',
    note: 'Vercel: sans interface, and every figure and tag in the mono',
    sans: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    display: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    prose: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    tag: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    num: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    weight: 600, tracking: '-0.032em', scale: 0.94, rowWeight: 500,
    tagCase: 'uppercase', tagTracking: '0.04em', tagSize: '0.625rem', tagWeight: 500,
    textSm: '0.8125rem', textMd: '0.875rem',
  },
  {
    /* Notion, Stripe's docs, Linear's changelog. The serif is on the page's
       title and on the writing - the two places you are meant to READ - and
       nowhere else: the rows, the chrome and the tags stay a sans, because a
       serif down a column of names is decoration again. It also runs a
       half-step larger, because a text serif at a grotesque's size reads
       small. */
    key: 'editorial', label: 'Editorial',
    note: 'Notion: a text serif on the page title and the writing, sans rows',
    sans: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    display: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    prose: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    tag: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    num: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    /* The row titles come DOWN to 500, not up to 600. That weight was there
       when the rows were serif and 500 would have been synthesised; now that
       they are a sans running a half-step larger than every other system, 600
       made a table of names read as a table of headings. Size and colour are
       already doing the separating. */
    weight: 600, tracking: '-0.012em', scale: 1.16, rowWeight: 500,
    /* Sentence case here on purpose: small caps beside a serif is two kinds of
       formality in one row, and the serif is already doing the marking. */
    tagCase: 'none', tagTracking: 'var(--m-tracking-normal)', tagSize: 'var(--m-text-xs)', tagWeight: 400,
    textSm: '0.875rem', textMd: '0.9375rem',
  },
  {
    /* GitHub, Slack, Notion's chrome. The OS's own face - SF on a Mac, Segoe on
       Windows - a half-step larger and a shade quieter than the rest, with
       nothing loaded and nothing to go wrong. It is the option a shipped product
       reaches for when it wants the interface to disappear, and it is the only
       one here that is free. */
    key: 'system', label: 'System',
    note: 'GitHub: the OS’s own face, a size up, nothing loaded, nothing foreign',
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    display: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    prose: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    tag: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    num: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    weight: 600, tracking: '-0.021em', scale: 1.04, rowWeight: 500,
    tagCase: 'none', tagTracking: 'var(--m-tracking-normal)', tagSize: 'var(--m-text-xs)', tagWeight: 400,
    textSm: '0.875rem', textMd: '0.9375rem',
  },
];

for (const f of FONTS) {
  out.push(`\n/* ── type: ${f.label} ─ ${f.note} ── */`);
  out.push(
    `:root[data-font='${f.key}'] {\n` +
      `  --m-font-sans: ${f.sans};\n` +
      `  --m-font-mono: ${f.mono};\n` +
      `  --m-font-display: ${f.display};\n` +
      `  --m-font-prose: ${f.prose};\n` +
      `  --m-font-tag: ${f.tag};\n` +
      `  --m-font-num: ${f.num};\n` +
      `  --m-display-weight: ${f.weight};\n` +
      `  --m-display-tracking: ${f.tracking};\n` +
      `  --m-display-scale: ${f.scale};\n` +
      `  --m-title-weight: ${f.rowWeight};\n` +
      `  --m-tag-case: ${f.tagCase};\n` +
      `  --m-tag-tracking: ${f.tagTracking};\n` +
      `  --m-tag-size: ${f.tagSize};\n` +
      `  --m-tag-weight: ${f.tagWeight};\n` +
      `  --m-text-sm: ${f.textSm};\n` +
      `  --m-text-md: ${f.textMd};\n}`,
  );
}

writeFileSync(resolve(app, 'src/tokens/proto-themes.css'), out.join('\n') + '\n');

const j = (o) => JSON.stringify(o, null, 2).replace(/\n/g, '\n  ');
const tsFile = `/* GENERATED by tools/gen-proto-themes.mjs - do not edit by hand.
 *
 * The same variants as proto-themes.css, resolved for antd. The CSS file is what
 * the app's own rules read; this is what ConfigProvider needs, because antd
 * derives hover/active/border ramps from colorPrimary with a palette algorithm
 * that cannot read a CSS custom property - hand it a var() and the whole ramp
 * silently falls back to black. Switching a colour in the panel therefore has to
 * write BOTH layers or half the screen moves and the other half does not.
 */
/* antd is handed a real font-family string for the same reason it is handed real
   hexes: its components carry their own font-family, written from antd's own
   fontFamily theme token, so the CSS variable never reaches them. Switch only
   the variable and the body font changes while every table, tab, input and
   button on the page stays on the old face - which is most of the page. */
export interface ProtoFont {
  label: string;
  note: string;
  /** The five roles a pairing sets. See gen-proto-themes.mjs for what each one
   *  is for, and why the tag is a role rather than "whatever the mono is". */
  sans: string;
  mono: string;
  display: string;
  prose: string;
  tag: string;
  num: string;
  /** How the title and the tags are SET, not just which face they use. The
   *  prototype panel renders a specimen of each system from these, so the
   *  dropdown shows the difference instead of naming it. */
  displayWeight: number;
  displayTracking: string;
  tagCase: string;
  tagTracking: string;
  tagSize: string;
  tagWeight: number;
}

export interface ProtoVariant {
  label: string;
  /** Greys have none; an accent carries how far it sits from the nearest alarm
   *  colour, which is the one fact that can rule a hue out. */
  note?: string;
  /** primitive ramp overrides, for the few places antd is handed a primitive */
  palette: Record<string, string>;
  /** semantic roles, already resolved, per theme */
  light: Record<string, string>;
  dark: Record<string, string>;
}

export const GREYS: Record<string, ProtoVariant> = ${j(ts.grey)};

export const ACCENTS: Record<string, ProtoVariant> = ${j(ts.accent)};

export const FONTS: Record<string, ProtoFont> = ${j(Object.fromEntries(FONTS.map((f) => [f.key, { label: f.label, note: f.note, sans: f.sans, mono: f.mono, display: f.display, prose: f.prose, tag: f.tag, num: f.num, displayWeight: f.weight, displayTracking: f.tracking, tagCase: f.tagCase, tagTracking: f.tagTracking, tagSize: f.tagSize, tagWeight: f.tagWeight }])))};

/** The three corner shapes, as antd needs them: numbers, because it computes
 *  inner corners from them and cannot read a custom property. */
export interface ProtoCorners {
  label: string;
  note: string;
  chip: number;
  control: number;
  surface: number;
  /** capped: a checkbox must never become a circle */
  check: number;
}

export const CORNERS: Record<string, ProtoCorners> = ${j(Object.fromEntries(CORNERS.map((c) => [c.key, { label: c.label, note: c.note, chip: c.chip, control: c.control, surface: c.surface, check: c.check }])))};

export const DEFAULTS = { grey: '${GREYS[0].key}', accent: '${ACCENTS[0].key}', font: '${FONTS[0].key}', density: 'compact', corners: 'soft', filters: 'outline' } as const;

export type GreyKey = keyof typeof GREYS;
export type AccentKey = keyof typeof ACCENTS;
export type FontKey = keyof typeof FONTS;
export type DensityKey = 'compact' | 'spaced';
export type CornersKey = keyof typeof CORNERS;
`;
writeFileSync(resolve(app, 'src/tokens/proto-themes.ts'), tsFile);
console.log('wrote option-a/src/tokens/proto-themes.ts');
console.log(`wrote option-a/src/tokens/proto-themes.css`);
console.log(`  ${GREYS.length} greys x ${nLight.length} light + ${nDark.length} dark roles`);
console.log(`  ${ACCENTS.length} accents x ${aLight.length} light + ${aDark.length} dark roles`);
console.log(`  ${FONTS.length} fonts, 1 density override (${Object.keys(SPACED).length} scale tokens), ${CORNERS.length} corner shapes`);
if (clippedAll.length) {
  console.log('  chroma clamped into gamut:');
  for (const c of [...new Set(clippedAll)]) console.log('    ' + c);
}
if (warnings.length) {
  console.log('\nCONTRAST WARNINGS:');
  for (const w of warnings) console.log('  ' + w);
  process.exit(1);
}
console.log('\nAll contrast checks pass.');

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

const ACCENTS = [
  { key: 'teal', label: 'Teal', hue: SHIPPED_ACCENT_HUE,
    note: 'the shipped accent' },
  { key: 'indigo', label: 'Indigo', hue: 275,
    note: 'the suggestion, and quiet at these chromas. Measured AROUND the wheel '
        + 'rather than by subtracting, it sits 112 degrees off danger, 160 off '
        + 'warning and 123 off success, so a selected row can never be mistaken '
        + 'for an alarm - which is the constraint that rules out the whole red '
        + 'half of the wheel, watermelon included' },
];

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
  ts.accent[a.key] = { label: a.label, palette: pal, light: resolved(aLight, pal), dark: resolved(aDark, pal) };
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
  'header-height': '3.25rem',      // 52
};

out.push(`\n/* ── density: Spaced ── */`);
out.push(`:root[data-density='spaced'] {\n${Object.entries(SPACED)
  .map(([k, v]) => `  --m-${k}: ${v};`).join('\n')}\n}`);

/* ── fonts ─────────────────────────────────────────────────────────────────
   Three stacks, switched on the same attribute pattern as everything else. The
   mono moves with the sans where the family has one, because a Geist page with
   a Plex Mono clock in it is two type systems in one screen. */
const FONTS = [
  { key: 'plex', label: 'Plex',
    sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    note: 'IBM Plex Sans, the shipped face' },
  { key: 'inter', label: 'Inter',
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    note: 'the grotesque Notion and Linear both use, and the quietest of the three' },
  { key: 'geist', label: 'Geist',
    sans: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    note: 'tighter and more mechanical, with a matching mono' },
];

for (const f of FONTS) {
  out.push(`\n/* ── font: ${f.label} ─ ${f.note} ── */`);
  out.push(`:root[data-font='${f.key}'] {\n  --m-font-sans: ${f.sans};\n  --m-font-mono: ${f.mono};\n}`);
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
  sans: string;
  mono: string;
}

export interface ProtoVariant {
  label: string;
  /** primitive ramp overrides, for the few places antd is handed a primitive */
  palette: Record<string, string>;
  /** semantic roles, already resolved, per theme */
  light: Record<string, string>;
  dark: Record<string, string>;
}

export const GREYS: Record<string, ProtoVariant> = ${j(ts.grey)};

export const ACCENTS: Record<string, ProtoVariant> = ${j(ts.accent)};

export const FONTS: Record<string, ProtoFont> = ${j(Object.fromEntries(FONTS.map((f) => [f.key, { label: f.label, note: f.note, sans: f.sans, mono: f.mono }])))};

export const DEFAULTS = { grey: '${GREYS[0].key}', accent: '${ACCENTS[0].key}', font: '${FONTS[0].key}', density: 'compact' } as const;

export type GreyKey = keyof typeof GREYS;
export type AccentKey = keyof typeof ACCENTS;
export type FontKey = keyof typeof FONTS;
export type DensityKey = 'compact' | 'spaced';
`;
writeFileSync(resolve(app, 'src/tokens/proto-themes.ts'), tsFile);
console.log('wrote option-a/src/tokens/proto-themes.ts');
console.log(`wrote option-a/src/tokens/proto-themes.css`);
console.log(`  ${GREYS.length} greys x ${nLight.length} light + ${nDark.length} dark roles`);
console.log(`  ${ACCENTS.length} accents x ${aLight.length} light + ${aDark.length} dark roles`);
console.log(`  ${FONTS.length} fonts, 1 density override (${Object.keys(SPACED).length} scale tokens)`);
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

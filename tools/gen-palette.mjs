import { oklch, contrast, deltaL } from './oklch.mjs';
import { ramp, darkText } from './ramp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

// ── design intent, expressed in OKLCH ──────────────────────────────────────
// Option A "Graphite": ink-primary monochrome. Neutrals tinted toward the
// accent hue (210, slate teal) at chroma 0.002-0.012 so surfaces cohere with
// the one chromatic accent without reading as "tinted".
const A = {
  hueNeutral: 220, hueAccent: 210,
  neutral: [[ '0',100,0],['25',99.0,0.002],['50',98.0,0.003],['100',96.2,0.004],['150',94.0,0.005],
            ['200',91.0,0.006],['300',85.0,0.007],['400',72,0.009],['500',60,0.011],['550',55,0.012],
            ['600',50,0.012],['700',40,0.012],['800',30,0.011],['850',26,0.011],['900',22,0.010],['950',16,0.009]],
  accent:  [['50',96,0.018],['100',92.5,0.032],['200',86,0.050],['300',77,0.066],['400',64,0.076],
            ['500',54,0.080],['600',46,0.076],['700',38,0.062],['800',31,0.050],['900',23,0.038]],
  // status: kept far apart in hue so a chip is never ambiguous
  danger:  [['50',96.5,0.024],['100',92,0.048],['200',85,0.090],['400',64,0.160],['500',53,0.185],['600',46,0.170],['700',39,0.145],['800',31,0.105],['900',23,0.072]],
  warning: [['50',97,0.030],['100',93.5,0.060],['200',87,0.100],['400',74,0.120],['500',64,0.135],['600',55,0.125],['700',45,0.105],['800',31,0.075],['900',23,0.052]],
  success: [['50',96.5,0.024],['100',92.5,0.048],['200',86,0.080],['400',64,0.105],['500',53,0.115],['600',46,0.105],['700',38,0.090],['800',31,0.07],['900',23,0.048]],
  hues: { danger: 27, warning: 75, success: 152 },
};

// Option B "Atrium": committed plum on GRAPHITE. Chrome surfaces sit DARKER
// than the content pane (the identity move), so the neutral ramp needs dense
// low steps.
//
// ── the 08-21 recolour: "too plum, and the dark should be greyer" ───────────
// The hue did not move and must not. Watermelon (hue 14, the brand accent) was
// tried here and rejected on a real conflict: at hue 14 the accent and the
// danger ramp are neighbours, so a selected row, a suggested-fix panel and a
// red alarm all land in the same family and the impact signal stops meaning
// anything. Plum at 330 sits 68 degrees off danger, which is the whole reason
// this option can afford a committed accent at all. The watermelon lives in
// the `brand` ramp below instead, and it is spent on exactly one thing.
//
// What actually changed, all of it about how much hue the SURFACES carry:
//
//   · NEUTRAL CHROMA HALVED, 0.015 -> 0.0075 at the darkest steps. The neutrals
//     were carrying so much of the accent hue that the whole shell read purple
//     rather than the accent reading plum. This is the "more grayish"
//     instruction and it is most of the fix.
//   · THE ACCENT RAMP NOW DESATURATES AT BOTH ENDS. a-50 and a-900 are not
//     decoration, they are large tinted PLANES: the selected row, the
//     suggested-fix panel, the active-filter chips. a-900 drops 0.062 -> 0.026
//     and a-50 drops 0.020 -> 0.014. The middle of the ramp is untouched, so
//     the accent is still fully plum wherever it is a small shape (the primary
//     button, the active rail item, the focus ring) and near-graphite wherever
//     it is a wash.
//   · THE DARK LADDER DROPS 3 POINTS AND ITS CHROMA DROPS BY TWO THIRDS. Every
//     step keeps its exact spacing from its neighbours, so the inverted
//     elevation survives intact; the room is just darker and grey.
const B = {
  hueNeutral: 330, hueAccent: 330,
  neutral: [['0',100,0],['25',99.2,0.0015],['50',98.2,0.0025],['100',96.4,0.0035],['150',94.2,0.004],
            ['200',91.2,0.0045],['300',85.5,0.005],['400',72,0.006],['500',60,0.007],['550',55,0.0075],
            ['600',50,0.0075],['700',40,0.0075],['800',27,0.007],['850',22.5,0.0065],['900',21,0.006],['950',15,0.006]],
  accent:  [['50',96.6,0.014],['100',93,0.028],['200',87,0.052],['300',78,0.090],['400',66,0.130],
            ['500',56,0.150],['600',48,0.140],['700',40,0.120],['800',30,0.050],['900',21,0.026]],
  danger:  [['50',96.5,0.024],['100',92,0.048],['200',85,0.090],['400',64,0.155],['500',53,0.180],['600',46,0.165],['700',39,0.140],['800',31,0.105],['900',23,0.072]],
  warning: [['50',97,0.030],['100',93.5,0.060],['200',87,0.100],['400',75,0.115],['500',65,0.130],['600',56,0.120],['700',46,0.102],['800',31,0.075],['900',23,0.052]],
  success: [['50',96.5,0.024],['100',92.5,0.048],['200',86,0.080],['400',64,0.102],['500',53,0.112],['600',46,0.102],['700',38,0.088],['800',31,0.07],['900',23,0.048]],
  hues: { danger: 38, warning: 82, success: 155 },
};

// ── the brand ramp: watermelon, and it is not an accent ────────────────────
// Melonade's colour, taken off the live landing page and re-expressed in OKLCH
// so it sits in the same architecture as everything else rather than being
// three pasted hexes. It reproduces the landing page's own three values:
//   brand-500 -> #d64560  the accent, used on the mark in light mode
//   brand-600 -> #bc3854  the 5.09:1-on-white variant, for the mark on a tint
//   brand-400 -> #f06a84  the dark-mode accent, used on the mark in dark mode
//
// BOTH options get this ramp, and both spend it on ONE element: the wordmark's
// disc-and-square in the nav. It is deliberately not wired into any semantic
// role. In option A that single watermelon glyph is the only chromatic thing in
// a monochrome shell; in option B it is a hue the UI accent never uses, so the
// mark stays identifiably Melonade instead of dissolving into the plum around
// it. If it ever leaks into a control, that is a bug: a logo is identity, not
// an accent, and this codebase has exactly one accent per option.
// These are LITERAL, not computed. Everything else in this file is generated
// from an OKLCH intent, and the brand is the one exception on purpose: the live
// landing page is the source of truth for Melonade's colour, its AA figures
// were measured on these exact strings (brand-500 is 4.31:1 on white, which is
// why brand-600 at 5.09:1 exists for text), and re-deriving them from hue 14
// came back one or two channels off. A logo that is nearly the right colour is
// the wrong colour.
const BRAND = {
  'brand-400': '#f06a84', // dark-mode accent   L 69.4  C 0.166  h 10.5
  'brand-500': '#d64560', // the accent         L 60.2  C 0.181  h 13.6
  'brand-600': '#bc3854', // 5.09:1 on white    L 54.3  C 0.168  h 12.4
};

// dark-mode surface ladders. Per the project rule: match the light token's
// CHROMA and reproduce its contrast STEPS, never invert lightness.
const A_DARK = [['void',11,0.008],['sunken',15,0.009],['base',19,0.009],['raised',24,0.010],['overlay',28,0.011]];
const B_DARK = [['void',9.5,0.003],['sunken',13.5,0.004],['base',17.5,0.004],['raised',22.5,0.005],['overlay',27,0.005]];

const REDUCED = [];
const r = (rows, hue, prefix) => ramp(rows, hue, prefix, { reduced: REDUCED });

function build(spec, darkRows) {
  return {
    ...r(spec.neutral, spec.hueNeutral, 'n'),
    ...r(spec.accent, spec.hueAccent, 'a'),
    ...r(spec.danger, spec.hues.danger, 'danger'),
    ...r(spec.warning, spec.hues.warning, 'warning'),
    ...r(spec.success, spec.hues.success, 'success'),
    ...r(darkRows, spec.hueNeutral, 'dark'),
    ...BRAND,
  };
}

const palA = build(A, A_DARK);
const palB = build(B, B_DARK);

// ── contrast audit: every pairing the UI actually ships ────────────────────
const CHECKS = (p, darkTextHi, darkTextMid, darkTextLo) => [
  ['body text on white',            p['n-900'], p['n-0'],   4.5],
  ['secondary text on white',       p['n-700'], p['n-0'],   4.5],
  ['muted text on white',           p['n-600'], p['n-0'],   4.5],
  ['placeholder on white',          p['n-550'], p['n-0'],   4.5],
  ['muted text on n-50',            p['n-600'], p['n-50'],  4.5],
  ['muted text on n-100',           p['n-600'], p['n-100'], 4.5],
  ['decorative icon on white',      p['n-500'], p['n-0'],   3.0],
  ['hairline border on white',      p['n-200'], p['n-0'],   1.1],
  ['accent text on white',          p['a-600'], p['n-0'],   4.5],
  ['accent text on accent-50',      p['a-700'], p['a-50'],  4.5],
  ['white on accent-600 (button)',  p['n-0'],   p['a-600'], 4.5],
  ['white on n-900 (ink button)',   p['n-0'],   p['n-900'], 4.5],
  ['danger text on white',          p['danger-600'], p['n-0'],       4.5],
  ['danger text on danger-50',      p['danger-700'], p['danger-50'], 4.5],
  ['warning text on warning-50',    p['warning-700'], p['warning-50'], 4.5],
  ['success text on success-50',    p['success-700'], p['success-50'], 4.5],
  ['dark: hi text on base',         darkTextHi,  p['dark-base'],    4.5],
  ['dark: mid text on base',        darkTextMid, p['dark-base'],    4.5],
  ['dark: low text on base',        darkTextLo,  p['dark-base'],    4.5],
  ['dark: mid text on raised',      darkTextMid, p['dark-raised'],  4.5],
  ['dark: low text on raised',      darkTextLo,  p['dark-raised'],  4.5],
  /* the dark status chips: the pairing the first pass got wrong */
  ['dark: danger chip text',        p['danger-200'],  p['danger-900'],  4.5],
  ['dark: warning chip text',       p['warning-200'], p['warning-900'], 4.5],
  ['dark: success chip text',       p['success-200'], p['success-900'], 4.5],
  ['dark: info chip text',          p['a-200'],       p['a-900'],       4.5],
  /* the mark is a filled glyph, not text, so 3:1 is the bar it has to clear.
     brand-600 is carried anyway for the day the mark sits on a tinted chip. */
  ['brand mark on white',           p['brand-500'], p['n-0'],       3.0],
  ['brand mark text on white',      p['brand-600'], p['n-0'],       4.5],
];

/* Surface separation, measured in Oklab L points rather than as a WCAG ratio.
   The light theme separates its card from its canvas by 3.8 points and that
   reads clearly, so the dark theme is held to more than that: a dark ground
   gets no help from a shadow, so the ladder is the only thing carrying depth. */
const SURFACE_CHECKS = (p) => [
  ['light: card vs canvas',      p['n-0'],         p['n-100'],     3.0],
  ['light: hairline vs card',    p['n-150'],       p['n-0'],       4.0],
  ['dark:  card vs canvas',      p['dark-base'],   p['dark-void'], 6.0],
  ['dark:  nav vs canvas',       p['dark-sunken'], p['dark-void'], 3.0],
  ['dark:  card vs nav',         p['dark-base'],   p['dark-sunken'], 3.0],
  ['dark:  popover vs card',     p['dark-raised'], p['dark-base'], 4.0],
  ['dark:  hover vs card',       p['dark-raised'], p['dark-base'], 4.0],
  ['dark:  hairline vs card',    p['n-850'],       p['dark-base'], 5.0],
  ['dark:  border vs card',      p['n-800'],       p['dark-base'], 9.0],
  ['dark:  danger chip vs card', p['danger-900'],  p['dark-base'], 3.0],
  ['dark:  info chip vs card',   p['a-900'],       p['dark-base'], 3.0],
];

const dtA = darkText(220, 0.012);
const dtB = darkText(330, 0.006);
palA['dark-text-hi'] = dtA.hi; palA['dark-text-mid'] = dtA.mid; palA['dark-text-lo'] = dtA.lo;
palB['dark-text-hi'] = dtB.hi; palB['dark-text-mid'] = dtB.mid; palB['dark-text-lo'] = dtB.lo;

let failures = 0;
for (const [label, pal, dt] of [['OPTION A / Graphite', palA, dtA], ['OPTION B / Atrium', palB, dtB]]) {
  console.log(`\n=== ${label} contrast audit ===`);
  for (const [name, fg, bg, min] of CHECKS(pal, dt.hi, dt.mid, dt.lo)) {
    const r = contrast(fg, bg);
    const pass = r >= min;
    if (!pass) failures++;
    console.log(`${pass ? 'PASS' : 'FAIL'} ratio ${r.toFixed(2).padStart(6)} (min ${min})  ${name}`);
  }
  console.log(`--- ${label} surface separation (Oklab L points) ---`);
  for (const [name, a, b, min] of SURFACE_CHECKS(pal)) {
    const d = deltaL(a, b);
    const pass = d >= min;
    if (!pass) failures++;
    console.log(`${pass ? 'PASS' : 'FAIL'}    dL ${d.toFixed(1).padStart(5)} (min ${min})  ${name}`);
  }
}

function emit(dir, name, pal) {
  mkdirSync(dir, { recursive: true });
  const lines = Object.entries(pal).map(([k, v]) => `  '${k}': '${v}',`).join('\n');
  writeFileSync(`${dir}/palette.ts`, `/* GENERATED by tools/gen-palette.mjs - do not edit by hand.
 * ${name} primitive palette. Every value is computed from an OKLCH design
 * intent (see the generator) and verified in sRGB gamut. Hex, not oklch(),
 * because antd's and Mantine's palette algorithms both need real color
 * strings - a CSS var here silently falls back to black.
 */
export const palette = {
${lines}
} as const;

export type PaletteKey = keyof typeof palette;
`);
  console.log(`\nwrote ${dir}/palette.ts (${Object.keys(pal).length} values)`);
}

emit('/Users/gabriellinares/awesomic/OpenReplay/melonade-app/option-a/src/tokens', 'Option A / Graphite', palA);
emit('/Users/gabriellinares/awesomic/OpenReplay/melonade-app/option-b/src/tokens', 'Option B / Atrium', palB);

if (REDUCED.length) {
  console.log('\nChroma clamped into sRGB gamut:');
  for (const r of REDUCED) console.log('  ' + r);
}
console.log(failures ? `\n${failures} CONTRAST FAILURE(S)` : '\nAll contrast checks pass.');
process.exit(failures ? 1 : 0);

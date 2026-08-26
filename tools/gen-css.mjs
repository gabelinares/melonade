/* Generates <app>/src/tokens/tokens.css from <app>/src/tokens/tokens.ts.
 *
 * Why generate rather than hand-write both: a semantic token that exists in TS
 * but not in CSS (or vice versa) is a silent defect that only shows up as a
 * transparent background weeks later. One source, two outputs, no drift.
 *
 * Usage: node tools/gen-css.mjs option-a
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = process.argv[2];
if (!app) { console.error('usage: node tools/gen-css.mjs <option-a|option-b>'); process.exit(1); }

const here = dirname(fileURLToPath(import.meta.url));
const tokensPath = resolve(here, '..', app, 'src/tokens/tokens.ts');
const mod = await import(tokensPath);
const { lightColors, darkColors, scales } = mod;

const decl = (obj, indent) =>
  Object.entries(obj)
    .map(([k, v]) => `${indent}--m-${k}: ${v};`)
    .join('\n');

const banner = `/* ══════════════════════════════════════════════════════════════════════════
   GENERATED from src/tokens/tokens.ts by tools/gen-css.mjs. Do not edit.
   Run \`npm run tokens\` after changing tokens.ts.

   Three theme states, and all three are required:
     :root                                  light (the complete palette)
     @media (prefers-color-scheme: dark)    system dark, unless the user
                                            explicitly chose light
     [data-theme="dark"]                    an explicit choice, which must win
                                            over the media query in both
                                            directions
   A colour whose only definition lives inside a media query is a colour that
   disappears when the toggle is used.
   ══════════════════════════════════════════════════════════════════════════ */
`;

const css = `${banner}
:root {
  color-scheme: light;

  /* ── scales: type, space, shape, depth, motion, layering, layout ── */
${decl(scales, '  ')}

  /* ── colour roles: light ── */
${decl(lightColors, '  ')}
}

:root[data-theme='dark'] {
  color-scheme: dark;
${decl(darkColors, '  ')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
${decl(darkColors, '    ')}
  }
}
`;

const out = resolve(here, '..', app, 'src/tokens/tokens.css');
writeFileSync(out, css);
const n = Object.keys(scales).length + Object.keys(lightColors).length;
console.log(`wrote ${out}`);
console.log(`  ${Object.keys(scales).length} scale tokens + ${Object.keys(lightColors).length} colour roles = ${n} custom properties`);

// parity guard: every light role must have a dark counterpart and vice versa
const l = Object.keys(lightColors), d = Object.keys(darkColors);
const missingDark = l.filter((k) => !d.includes(k));
const extraDark = d.filter((k) => !l.includes(k));
if (missingDark.length || extraDark.length) {
  console.error('THEME PARITY BROKEN');
  if (missingDark.length) console.error('  light-only roles:', missingDark.join(', '));
  if (extraDark.length) console.error('  dark-only roles:', extraDark.join(', '));
  process.exit(1);
}
console.log('  theme parity: OK (every role defined in both themes)');

/* The ramp builders, shared by every generator that needs one.
 *
 * They used to live inside gen-palette.mjs. They were lifted out when the
 * prototype panel's alternative palettes needed the SAME builders: a variant
 * whose greys are computed by a second copy of this arithmetic is a variant that
 * will disagree with the shipped ramp the first time either copy is touched, and
 * it would disagree silently - the numbers would still look plausible.
 */
import { oklch } from './oklch.mjs';

/* Chroma requested is design intent; sRGB is the hard limit. Binary-search the
   largest in-gamut chroma <= the request so a light tint never silently clips
   (clipping shifts hue, which is how "one accent" quietly becomes two). */
export function fit(L, C, hue) {
  if (!oklch(L, C, hue).clipped) return { c: C, hex: oklch(L, C, hue).hex, reduced: false };
  let lo = 0, hi = C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (oklch(L, mid, hue).clipped) hi = mid; else lo = mid;
  }
  return { c: lo, hex: oklch(L, lo, hue).hex, reduced: true };
}

/* `reduced` collects the steps whose chroma had to be clamped, so a caller can
   report them instead of shipping a quiet hue shift. */
export function ramp(rows, hue, prefix, { chromaScale = 1, reduced } = {}) {
  const out = {};
  for (const [name, L, C] of rows) {
    const want = C * chromaScale;
    const r = fit(L, want, hue);
    if (r.reduced && reduced) {
      reduced.push(`${prefix}-${name}: chroma ${want} -> ${r.c.toFixed(4)} (hue ${hue}, L ${L})`);
    }
    out[`${prefix}-${name}`] = r.hex;
  }
  return out;
}

/* Dark-mode text is not the neutral ramp read upwards: it is three lightnesses
   with the chroma dialled DOWN as the text gets brighter, because a bright tint
   on near-black reads as coloured text rather than as white. */
export function darkText(hue, c) {
  return {
    hi:  oklch(96, c * 0.35, hue).hex,
    mid: oklch(80, c * 0.6,  hue).hex,
    lo:  oklch(67, c * 0.8,  hue).hex,
  };
}

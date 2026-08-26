// OKLCH -> sRGB hex, plus WCAG relative luminance + contrast ratio.
// Used to generate the token values for both option-a and option-b so the
// palettes are computed from design intent instead of eyeballed hex.

const clamp01 = (x) => Math.min(1, Math.max(0, x));

function oklchToSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  // Oklab -> LMS'
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  // LMS -> linear sRGB
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return [r, g, bl];
}

const toGamma = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);

export function oklch(L, C, h) {
  const lin = oklchToSrgb(L / 100, C, h);
  const clipped = lin.some((v) => v < -0.0005 || v > 1.0005);
  const hex = lin
    .map((v) => Math.round(clamp01(toGamma(clamp01(v))) * 255))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
  return { hex: `#${hex}`, clipped, lum: relLum(lin.map(clamp01)) };
}

function relLum([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(hexA, hexB) {
  const lum = (hex) => {
    const n = hex.replace('#', '');
    const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
    const lin = ch.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return relLum(lin);
  };
  const a = lum(hexA), b = lum(hexB);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB hex -> Oklab L (0-100). The correct metric for judging whether two
 *  SURFACES are separable, because it is perceptually uniform. The WCAG ratio
 *  is not: its +0.05 flare term dominates at the dark end, so two clearly
 *  different near-blacks both score ~1.05 and the number stops meaning
 *  anything. Use contrast() for text, lightnessOf() for surfaces. */
export function lightnessOf(hex) {
  const n = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = lin;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s) * 100;
}

/** Perceptual lightness distance between two surfaces, in Oklab L points. */
export function deltaL(a, b) {
  return Math.abs(lightnessOf(a) - lightnessOf(b));
}
